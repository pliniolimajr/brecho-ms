import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ApiError, corsHeaders, enforceRateLimit, errorResponse, jsonResponse, parseJsonBody } from '../_shared/http.ts'

const MERCADO_PAGO_TIMEOUT_MS = 10_000
const PAYMENT_EXPIRATION_MINUTES = 30
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface PreferenceRequest {
  payer: {
    email: string
    firstName?: string
    lastName?: string
  }
  origin?: string
  orderId: string
  checkoutToken: string
}

function validatePayload(payload: PreferenceRequest) {
  if (!payload || !UUID_PATTERN.test(payload.orderId || '') || !UUID_PATTERN.test(payload.checkoutToken || '')) {
    throw new ApiError('Pedido inválido.', 400, 'INVALID_ORDER')
  }

  if (
    !payload.payer ||
    typeof payload.payer.email !== 'string' ||
    !payload.payer.email.includes('@')
  ) {
    throw new ApiError('E-mail do comprador inválido.', 400, 'INVALID_PAYER')
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(new ApiError('Método não permitido.', 405, 'METHOD_NOT_ALLOWED'), requestId)
  }

  try {
    const payload = await parseJsonBody<PreferenceRequest>(req)
    validatePayload(payload)

    const { payer, origin, orderId, checkoutToken } = payload
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!MP_ACCESS_TOKEN || !supabaseUrl || !serviceRoleKey) {
      throw new ApiError(
        'Serviço de pagamento indisponível.',
        500,
        'PAYMENT_NOT_CONFIGURED',
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await enforceRateLimit(req, supabase, 'create-preference', 10, 1800, orderId)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id,total_amount,status,reservation_expires_at,shipping_address')
      .eq('id', orderId)
      .eq('checkout_token', checkoutToken)
      .maybeSingle()

    if (orderError) {
      throw new ApiError('Não foi possível validar o pedido.', 500, 'ORDER_LOOKUP_FAILED')
    }
    if (!order || order.status !== 'pending') {
      throw new ApiError('Pedido não encontrado ou indisponível para pagamento.', 404, 'ORDER_NOT_AVAILABLE')
    }
    if (order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() <= Date.now()) {
      throw new ApiError('A reserva deste pedido expirou.', 409, 'ORDER_EXPIRED')
    }

    const totalAmount = Number(order.total_amount)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || totalAmount > 1_000_000) {
      throw new ApiError('Valor do pedido inválido.', 400, 'INVALID_ORDER_TOTAL')
    }

    const savedAddress = order.shipping_address && typeof order.shipping_address === 'object'
      ? order.shipping_address as Record<string, unknown>
      : {}
    const savedEmail = String(savedAddress.email || '').trim().toLowerCase()
    if (savedEmail !== payer.email.trim().toLowerCase()) {
      throw new ApiError('Os dados do comprador não correspondem ao pedido.', 403, 'PAYER_MISMATCH')
    }

    const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://palm-co.vercel.app').replace(/\/$/, '')
    const requestedOrigin = origin || req.headers.get('origin') || req.headers.get('Origin') || ''
    let backUrlBase = publicSiteUrl
    try {
      const requestedUrl = new URL(requestedOrigin)
      const isLocalDevelopment = requestedUrl.hostname === 'localhost' || requestedUrl.hostname === '127.0.0.1'
      if (isLocalDevelopment || requestedUrl.origin === new URL(publicSiteUrl).origin) {
        backUrlBase = requestedUrl.origin
      }
    } catch {
      backUrlBase = publicSiteUrl
    }
    backUrlBase = backUrlBase.replace(/\/$/, '') // Remove trailing slash if present

    const preferenceData: any = {
      items: [{
        id: orderId,
        title: `Pedido ${orderId.slice(0, 8).toUpperCase()}`,
        quantity: 1,
        unit_price: totalAmount,
        currency_id: 'BRL',
      }],
      payer: {
        email: savedEmail,
        name: String(savedAddress.firstName || '').slice(0, 80),
        surname: String(savedAddress.lastName || '').slice(0, 80),
      },
      back_urls: {
        success: `${backUrlBase}/checkout-success`,
        failure: `${backUrlBase}/checkout-failure`,
        pending: `${backUrlBase}/checkout-pending`,
      },
      external_reference: orderId,
    }

    const expirationStart = new Date()
    const expirationEnd = new Date(
      expirationStart.getTime() + PAYMENT_EXPIRATION_MINUTES * 60 * 1000,
    )
    preferenceData.expires = true
    preferenceData.expiration_date_from = expirationStart.toISOString()
    preferenceData.expiration_date_to = expirationEnd.toISOString()

    if (supabaseUrl) {
      preferenceData.notification_url = `${supabaseUrl}/functions/v1/payment-webhook`
    }

    // Mercado Pago API validator rejects auto_return if back_urls are localhost or lack TLDs
    if (!backUrlBase.includes('localhost') && !backUrlBase.includes('127.0.0.1')) {
      preferenceData.auto_return = 'approved';
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MERCADO_PAGO_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          // Repetir a solicitação do mesmo pedido não cria outra preferência.
          'X-Idempotency-Key': orderId,
        },
        body: JSON.stringify(preferenceData),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(
          'Tempo limite ao criar a preferência de pagamento.',
          504,
          'PAYMENT_TIMEOUT',
        )
      }

      throw new ApiError(
        'Não foi possível conectar ao serviço de pagamento.',
        502,
        'PAYMENT_UNAVAILABLE',
      )
    } finally {
      clearTimeout(timeoutId)
    }

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Mercado Pago recusou a criação da preferência', {
        orderId,
        status: response.status,
        cause: data?.message || data?.error || 'unknown',
      })
      throw new ApiError(
        'O serviço de pagamento recusou a solicitação.',
        response.status >= 500 ? 502 : 400,
        'PAYMENT_REJECTED',
      )
    }
    
    return jsonResponse(data, 200, requestId)
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error('Erro inesperado ao criar preferência:', { requestId, error })
    }
    return errorResponse(error, requestId)
  }
})
