import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_TIMEOUT_MS = 10_000
const SIGNATURE_TOLERANCE_SECONDS = 10 * 60

interface WebhookPayload {
  id?: string | number
  type?: string
  action?: string
  entity?: string
  data?: {
    id?: string | number
  }
}

interface PaymentData {
  id: string | number
  status: string
  external_reference?: string
  payment_type_id?: string
  payer?: {
    email?: string
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null
  return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

async function validateMercadoPagoSignature(
  req: Request,
  dataId: string,
  secret: string,
) {
  const signature = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signature || !requestId) return false

  const parts = Object.fromEntries(
    signature.split(',').map(part => {
      const [key, value] = part.trim().split('=', 2)
      return [key, value]
    }),
  )

  const timestamp = parts.ts
  const receivedHash = parts.v1
  if (!timestamp || !receivedHash || !/^\d+$/.test(timestamp)) return false

  const timestampSeconds = Number(timestamp)
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds)
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false

  const normalizedDataId = dataId.toLowerCase()
  const manifest = `id:${normalizedDataId};request-id:${requestId};ts:${timestamp};`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const calculated = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)),
  )
  const received = hexToBytes(receivedHash)

  return received !== null && timingSafeEqual(calculated, received)
}

function paymentMethod(paymentType?: string) {
  if (paymentType === 'credit_card') return 'credit_card'
  if (paymentType === 'bank_transfer') return 'pix'
  if (paymentType === 'ticket') return 'boleto'
  return 'mercado_pago'
}

serve(async req => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const payload = await req.json() as WebhookPayload
    const isPaymentEvent =
      payload.type === 'payment' ||
      payload.action?.startsWith('payment.') ||
      payload.entity === 'payment'

    if (!isPaymentEvent) {
      return jsonResponse({ received: true, ignored: true }, 200)
    }

    const url = new URL(req.url)
    const paymentId = String(
      url.searchParams.get('data.id') ||
      url.searchParams.get('data_id') ||
      payload.data?.id ||
      payload.id ||
      '',
    )

    if (!paymentId) {
      return jsonResponse({ error: 'Identificador do pagamento ausente.' }, 400)
    }

    const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('MP_WEBHOOK_SECRET não configurado.')
      return jsonResponse({ error: 'Webhook não configurado.' }, 500)
    }

    const validSignature = await validateMercadoPagoSignature(
      req,
      paymentId,
      webhookSecret,
    )
    if (!validSignature) {
      console.warn('Assinatura inválida recebida no webhook.', { paymentId })
      return jsonResponse({ error: 'Assinatura inválida.' }, 401)
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      console.error('Credenciais obrigatórias ausentes no webhook.')
      return jsonResponse({ error: 'Configuração incompleta.' }, 500)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MP_TIMEOUT_MS)
    let paymentResponse: Response
    try {
      paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        },
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return jsonResponse({ error: 'Timeout ao consultar pagamento.' }, 504)
      }
      return jsonResponse({ error: 'Mercado Pago indisponível.' }, 502)
    } finally {
      clearTimeout(timeoutId)
    }

    if (!paymentResponse.ok) {
      console.error('Falha ao consultar pagamento no Mercado Pago.', {
        paymentId,
        status: paymentResponse.status,
      })
      return jsonResponse({ error: 'Falha ao consultar pagamento.' }, 502)
    }

    const payment = await paymentResponse.json() as PaymentData
    const orderId = payment.external_reference
    if (!orderId) {
      return jsonResponse({ error: 'Pagamento sem pedido relacionado.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: processRows, error: processError } = await supabase.rpc(
      'process_payment_event',
      {
        p_order_id: orderId,
        p_payment_id: String(payment.id),
        p_payment_status: payment.status,
        p_payment_method: paymentMethod(payment.payment_type_id),
        p_payload: payment,
      },
    )

    if (processError) {
      console.error('Falha transacional ao processar pagamento.', {
        paymentId,
        orderId,
        error: processError.message,
      })
      return jsonResponse({ error: 'Falha ao atualizar pedido.' }, 500)
    }

    const result = Array.isArray(processRows) ? processRows[0] : processRows

    if (result?.processed && result?.resulting_status === 'paid') {
      const { data: orderDetails, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(price, products(name, size))')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('Pagamento salvo, mas pedido não pôde ser carregado para e-mail.', {
          orderId,
          error: orderError.message,
        })
      } else if (orderDetails) {
        const address = orderDetails.shipping_address || {}
        const customerName =
          `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Cliente'
        const customerEmail = payment.payer?.email || address.email

        if (customerEmail) {
          const items = (orderDetails.order_items || []).map((item: any) => ({
            name: item.products?.name || 'Produto',
            size: item.products?.size || 'Único',
            price: item.price,
          }))

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              type: 'order_confirmed',
              email: customerEmail,
              name: customerName,
              orderId,
              totalAmount: orderDetails.total_amount,
              items,
            }),
          })

          if (!emailResponse.ok) {
            console.error('Pagamento salvo, mas o e-mail de confirmação falhou.', {
              orderId,
              status: emailResponse.status,
            })
          }
        }
      }
    }

    return jsonResponse({
      received: true,
      processed: result?.processed === true,
    }, 200)
  } catch (error) {
    console.error('Exceção não tratada no webhook:', errorMessage(error))
    return jsonResponse({ error: 'Erro interno no webhook.' }, 500)
  }
})
