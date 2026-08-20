import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { operationalLogger } from '../_shared/logger.ts'

const logger = operationalLogger('create-shipping-label')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const API_TIMEOUT_MS = 15_000

class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message)
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

function text(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function shippingServiceId(order: Record<string, any>) {
  const selectedId = Number(order.shipping_address?.shippingServiceId)
  if ([1, 2, 17].includes(selectedId)) return selectedId
  const service = `${order.shipping_service || ''} ${order.shipping_address?.shippingService || ''}`.toLowerCase()
  if (service.includes('sedex')) return 2
  if (service.includes('mini')) return 17
  if (service.includes('pac')) return 1
  throw new HttpError('Servico de frete do pedido nao reconhecido.', 400, 'INVALID_SERVICE')
}

function packageVolume(itemCount: number) {
  return {
    width: 18,
    height: 9 + Math.max(itemCount - 1, 0) * 3,
    length: 28,
    weight: 0.3 + Math.max(itemCount - 1, 0) * 0.25,
  }
}

function selectedVolume(order: Record<string, any>, itemCount: number) {
  const saved = order.shipping_address?.shippingPackage
  const fallback = packageVolume(itemCount)
  if (!saved || typeof saved !== 'object') return fallback

  const volume = {
    width: Number(saved.width),
    height: Number(saved.height),
    length: Number(saved.length),
    weight: Number(saved.weight),
  }
  return Object.values(volume).every(value => Number.isFinite(value) && value > 0)
    ? volume
    : fallback
}

async function superFreteRequest(
  path: string,
  token: string,
  userAgent: string,
  init: RequestInit = {},
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(`https://sandbox.superfrete.com/api/v0${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = { message: raw.slice(0, 500) }
    }
    return { response, data }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Tempo limite ao acessar a SuperFrete.', 504, 'SUPERFRETE_TIMEOUT')
    }
    throw new HttpError('Nao foi possivel acessar a SuperFrete.', 502, 'SUPERFRETE_UNAVAILABLE')
  } finally {
    clearTimeout(timeoutId)
  }
}

function providerError(data: any, fallback: string) {
  return text(data?.message || data?.error || data?.errors?.[0]?.message || fallback, 500)
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo nao permitido.' } }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const sandboxToken = Deno.env.get('SUPERFRETE_SANDBOX_TOKEN')
  const userAgent = Deno.env.get('SUPERFRETE_USER_AGENT') || 'Palm CO. v1 (plinio.codeba@gmail.com)'
  if (!supabaseUrl || !serviceRoleKey || !sandboxToken) {
    return jsonResponse({ error: { code: 'NOT_CONFIGURED', message: 'SuperFrete Sandbox nao configurada.' } }, 503)
  }

  try {
    const authHeader = req.headers.get('authorization') || ''
    const userToken = authHeader.replace(/^Bearer\s+/i, '')
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userError } = await adminClient.auth.getUser(userToken)
    if (userError || !userData.user) throw new HttpError('Sessao invalida.', 401, 'UNAUTHORIZED')

    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('id, role, is_active')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!adminRow?.is_active || !['owner', 'operations'].includes(adminRow.role)) {
      throw new HttpError('Somente proprietario ou operacao pode emitir etiquetas.', 403, 'FORBIDDEN')
    }

    const payload = await req.json() as { orderId?: string }
    if (!UUID_PATTERN.test(payload.orderId || '')) {
      throw new HttpError('Pedido invalido.', 400, 'INVALID_ORDER')
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('*, order_items(price, products(name, size))')
      .eq('id', payload.orderId)
      .single()
    if (orderError || !order) throw new HttpError('Pedido nao encontrado.', 404, 'ORDER_NOT_FOUND')
    if (!['paid', 'shipped'].includes(order.status)) {
      throw new HttpError('A etiqueta so pode ser emitida para um pedido pago.', 409, 'ORDER_NOT_PAID')
    }

    let providerId = order.shipping_provider_id as string | null
    if (!providerId) {
      const { data: claimed, error: claimError } = await adminClient.rpc('claim_shipping_label_creation', {
        p_order_id: order.id,
      })
      if (claimError || claimed !== true) {
        throw new HttpError('Outra emissao ja esta em andamento. Aguarde alguns segundos.', 409, 'LABEL_IN_PROGRESS')
      }

      const address = order.shipping_address || {}
      const recipientName = text(`${address.firstName || ''} ${address.lastName || ''}`, 50)
      const recipientDocument = digits(address.cpf)
      const recipientPhone = digits(address.phone)
      if (!recipientName.includes(' ') || !/^\d{11}$|^\d{14}$/.test(recipientDocument)) {
        throw new HttpError('Nome completo ou CPF/CNPJ do destinatario invalido.', 400, 'INVALID_RECIPIENT')
      }

      let recipientEmail: string | null = null
      if (order.user_id) {
        const { data: customerUser } = await adminClient.auth.admin.getUserById(order.user_id)
        recipientEmail = customerUser.user?.email || null
      }

      const items = order.order_items || []
      const cartPayload = {
        from: {
          name: 'Loja Palm CO.',
          address: 'Rua Jorge Goes Mascarenhas',
          complement: '',
          number: '57',
          district: 'Bonfim',
          city: 'Salvador',
          state_abbr: 'BA',
          postal_code: '40415115',
        },
        to: {
          name: recipientName,
          address: text(address.street, 50),
          complement: text(address.complement, 20),
          number: text(address.number, 10),
          district: text(address.neighborhood || 'NA', 50),
          city: text(address.city, 50),
          state_abbr: text(address.state, 2).toUpperCase(),
          postal_code: digits(address.postalCode),
          email: recipientEmail,
          phone: recipientPhone.length === 11 ? recipientPhone : null,
          document: recipientDocument,
        },
        service: shippingServiceId(order),
        products: items.map((item: any) => ({
          name: text(item.products?.name || 'Produto', 100),
          quantity: 1,
          unitary_value: Number(item.price),
        })),
        volumes: selectedVolume(order, items.length || 1),
        options: {
          insurance_value: Number(order.total_amount),
          receipt: false,
          own_hand: false,
          non_commercial: true,
        },
        tag: order.id,
        url: 'https://palm-co.vercel.app/admin',
        platform: 'Palm CO.',
      }

      const cart = await superFreteRequest('/cart', sandboxToken, userAgent, {
        method: 'POST',
        body: JSON.stringify(cartPayload),
      })
      if (!cart.response.ok) {
        const message = providerError(cart.data, 'SuperFrete recusou a criacao da etiqueta.')
        await adminClient.from('orders').update({ shipping_label_status: 'failed', shipping_label_error: message }).eq('id', order.id)
        throw new HttpError(message, 400, 'LABEL_REJECTED')
      }

      providerId = text(cart.data?.id || cart.data?.data?.id || cart.data?.order?.id, 200)
      if (!providerId) {
        await adminClient.from('orders').update({ shipping_label_status: 'failed', shipping_label_error: 'Resposta sem ID.' }).eq('id', order.id)
        throw new HttpError('SuperFrete respondeu sem identificar a etiqueta.', 502, 'INVALID_PROVIDER_RESPONSE')
      }

      await adminClient.from('orders').update({
        shipping_provider: 'superfrete',
        shipping_provider_id: providerId,
        shipping_label_status: 'pending',
        shipping_label_error: null,
      }).eq('id', order.id)
    }

    const checkout = await superFreteRequest('/checkout', sandboxToken, userAgent, {
      method: 'POST',
      body: JSON.stringify({ orders: [providerId] }),
    })
    if (!checkout.response.ok) {
      const message = providerError(checkout.data, 'Saldo insuficiente ou pagamento da etiqueta recusado.')
      await adminClient.from('orders').update({ shipping_label_status: 'pending', shipping_label_error: message }).eq('id', order.id)
      throw new HttpError(`Etiqueta criada, mas ainda nao paga: ${message}`, 402, 'LABEL_PAYMENT_REQUIRED')
    }

    const info = await superFreteRequest(`/order/info/${encodeURIComponent(providerId)}`, sandboxToken, userAgent)
    if (!info.response.ok) {
      throw new HttpError(providerError(info.data, 'Etiqueta paga, mas a consulta falhou.'), 502, 'LABEL_INFO_FAILED')
    }

    const label = info.data?.data || info.data
    const trackingCode = text(label?.tracking, 100) || null
    const labelUrl = text(label?.print?.url, 1000) || null
    const labelStatus = text(label?.status, 50) || 'released'

    await adminClient.from('orders').update({
      shipping_provider: 'superfrete',
      shipping_provider_id: providerId,
      shipping_label_status: labelStatus,
      shipping_label_error: null,
      shipping_label_url: labelUrl,
      tracking_code: trackingCode,
      shipping_carrier: 'SuperFrete',
    }).eq('id', order.id)

    return jsonResponse({
      success: true,
      providerId,
      status: labelStatus,
      trackingCode,
      labelUrl,
    }, 200)
  } catch (error) {
    const httpError = error instanceof HttpError
      ? error
      : new HttpError('Erro interno ao emitir etiqueta.', 500, 'INTERNAL_ERROR')
    if (!(error instanceof HttpError)) logger.error('unhandled_exception', { error })
    return jsonResponse({ error: { code: httpError.code, message: httpError.message } }, httpError.status)
  }
})
