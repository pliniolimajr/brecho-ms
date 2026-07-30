import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MERCADO_PAGO_TIMEOUT_MS = 10_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface PreferenceItem {
  id: string
  name: string
  quantity?: number
  price: number
}

interface PreferenceRequest {
  items: PreferenceItem[]
  payer: {
    email: string
    firstName?: string
    lastName?: string
  }
  origin?: string
  orderId: string
}

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function validatePayload(payload: PreferenceRequest) {
  if (!UUID_PATTERN.test(payload.orderId || '')) {
    throw new HttpError('Pedido inválido.', 400, 'INVALID_ORDER')
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new HttpError('O pedido não possui itens.', 400, 'INVALID_ITEMS')
  }

  if (payload.items.length > 100) {
    throw new HttpError('O pedido excede o limite de itens.', 400, 'TOO_MANY_ITEMS')
  }

  for (const item of payload.items) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !Number.isFinite(item.price) ||
      item.price <= 0 ||
      item.price > 1_000_000
    ) {
      throw new HttpError('Um dos itens do pedido é inválido.', 400, 'INVALID_ITEM')
    }
  }

  if (
    !payload.payer ||
    typeof payload.payer.email !== 'string' ||
    !payload.payer.email.includes('@')
  ) {
    throw new HttpError('E-mail do comprador inválido.', 400, 'INVALID_PAYER')
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' } },
      405,
    )
  }

  try {
    const payload = await req.json() as PreferenceRequest
    validatePayload(payload)

    const { items, payer, origin, orderId } = payload
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    if (!MP_ACCESS_TOKEN) {
      throw new HttpError(
        'Serviço de pagamento indisponível.',
        500,
        'PAYMENT_NOT_CONFIGURED',
      )
    }

    let backUrlBase = origin || req.headers.get('origin') || req.headers.get('Origin') || 'http://localhost:5173'
    if (typeof backUrlBase !== 'string' || (!backUrlBase.startsWith('http://') && !backUrlBase.startsWith('https://'))) {
      backUrlBase = 'http://localhost:5173'
    }
    backUrlBase = backUrlBase.replace(/\/$/, '') // Remove trailing slash if present

    const preferenceData: any = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity || 1,
        unit_price: item.price,
        currency_id: 'BRL',
      })),
      payer: {
        email: payer.email,
        name: payer.firstName,
        surname: payer.lastName,
      },
      back_urls: {
        success: `${backUrlBase}/checkout-success`,
        failure: `${backUrlBase}/checkout-failure`,
        pending: `${backUrlBase}/checkout-pending`,
      },
      external_reference: orderId,
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
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
        throw new HttpError(
          'Tempo limite ao criar a preferência de pagamento.',
          504,
          'PAYMENT_TIMEOUT',
        )
      }

      throw new HttpError(
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
      throw new HttpError(
        'O serviço de pagamento recusou a solicitação.',
        response.status >= 500 ? 502 : 400,
        'PAYMENT_REJECTED',
      )
    }
    
    return jsonResponse(data, 200)
  } catch (error) {
    const httpError = error instanceof HttpError
      ? error
      : new HttpError('Erro interno ao criar o pagamento.', 500, 'INTERNAL_ERROR')

    if (!(error instanceof HttpError)) {
      console.error('Erro inesperado ao criar preferência:', error)
    }

    return jsonResponse(
      {
        error: {
          code: httpError.code,
          message: httpError.message,
        },
      },
      httpError.status,
    )
  }
})
