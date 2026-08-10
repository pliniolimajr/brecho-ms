import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_TIMEOUT_MS = 10_000
const MAX_JOBS_PER_RUN = 10

interface NotificationJob {
  id: string
  type: 'welcome' | 'order_confirmed' | 'order_shipped' | 'order_delivered'
  recipient: string
  payload: Record<string, unknown>
}

interface OrderItem {
  name: string
  size: string
  price: number
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

function hasServiceRole(token: string | undefined, configuredKey: string | undefined) {
  if (!token) return false
  if (configuredKey && token === configuredKey) return true

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { role?: string }
    // A assinatura deste JWT ja foi validada pelo gateway da Edge Function.
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
  return normalized || fallback
}

function money(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new Error('Valor monetario invalido no trabalho de notificacao.')
  }
  return amount.toFixed(2).replace('.', ',')
}

function orderItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error('Itens invalidos no trabalho de notificacao.')
  }

  return value.map(item => {
    if (!item || typeof item !== 'object') {
      throw new Error('Item invalido no trabalho de notificacao.')
    }
    const raw = item as Record<string, unknown>
    return {
      name: cleanText(raw.name, 'Produto', 150),
      size: cleanText(raw.size, 'Unico', 50),
      price: Number(raw.price),
    }
  })
}

function baseStyles() {
  return `
    body { font-family: Arial, sans-serif; background: #FDF6F0; margin: 0; padding: 0; color: #423226; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #ffffff; }
    .logo { text-align: center; font: 32px Georgia, serif; letter-spacing: 2px; color: #1A332B; margin-bottom: 30px; }
    .title { font: 24px Georgia, serif; color: #1A332B; text-align: center; }
    .text { font-size: 16px; line-height: 1.6; color: #5C544E; }
    .button { display: block; width: 210px; margin: 30px auto; text-align: center; background: #1A332B; color: #fff !important; padding: 15px; text-decoration: none; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #8C827A; }
  `
}

function renderEmail(job: NotificationJob, siteUrl: string, supabaseUrl: string) {
  const payload = job.payload || {}
  const name = escapeHtml(cleanText(payload.name, 'Cliente', 100))
  const year = new Date().getUTCFullYear()

  if (job.type === 'welcome') {
    const token = cleanText(payload.unsubscribeToken, '', 100)
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      throw new Error('Token de descadastro invalido.')
    }
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-newsletter?token=${encodeURIComponent(token)}`

    return {
      subject: 'Bem-vindo a Palm CO. - seu cupom de boas-vindas',
      html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head>
        <body><div class="container"><div class="logo">PALM CO.</div>
        <h1 class="title">Ola, ${name}!</h1>
        <p class="text">Seu cadastro na nossa newsletter foi realizado. Voce recebera novidades e novas curadorias em primeira mao.</p>
        <div style="text-align:center;border:2px dashed #C06A35;padding:20px;background:#FDF6F0;margin:30px 0">
          <div style="font-size:13px;color:#C06A35">CUPOM DE BOAS-VINDAS</div>
          <strong style="font-size:28px;color:#1A332B">BEMVINDO10</strong>
        </div>
        <a href="${escapeHtml(siteUrl)}" class="button">Explorar loja</a>
        <div class="footer"><p>&copy; ${year} Palm CO.</p>
        <p><a href="${escapeHtml(unsubscribeUrl)}" style="color:#8C827A">Nao quero mais receber novidades</a></p></div>
        </div></body></html>`,
    }
  }

  if (job.type === 'order_confirmed') {
    const orderId = cleanText(payload.orderId, '', 36)
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      throw new Error('Pedido invalido no trabalho de notificacao.')
    }
    const shortOrderId = escapeHtml(orderId.split('-')[0].toUpperCase())
    const items = orderItems(payload.items)
    const rows = items.map(item => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #EFEAE4">
        <strong>${escapeHtml(item.name)}</strong><br><small>Tamanho: ${escapeHtml(item.size)}</small>
      </td><td style="text-align:right;border-bottom:1px solid #EFEAE4">R$ ${money(item.price)}</td></tr>
    `).join('')

    return {
      subject: `Pagamento confirmado - pedido #${shortOrderId}`,
      html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head>
        <body><div class="container"><div class="logo">PALM CO.</div>
        <h1 class="title">Seu pagamento foi confirmado!</h1>
        <p class="text">Ola, ${name}. Recebemos o pagamento do pedido <strong>#${shortOrderId}</strong> e iniciaremos a preparacao do envio.</p>
        <table style="width:100%;border-collapse:collapse;margin:30px 0"><tbody>${rows}
        <tr><td style="padding-top:15px"><strong>Total</strong></td>
        <td style="padding-top:15px;text-align:right"><strong>R$ ${money(payload.totalAmount)}</strong></td></tr>
        </tbody></table>
        <a href="${escapeHtml(`${siteUrl}/minha-conta`)}" class="button">Ver meus pedidos</a>
        <div class="footer"><p>&copy; ${year} Palm CO.</p></div>
        </div></body></html>`,
    }
  }

  if (job.type === 'order_shipped') {
    const orderId = cleanText(payload.orderId, '', 36)
    const trackingCode = cleanText(payload.trackingCode, '', 100)
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !trackingCode) {
      throw new Error('Dados de envio invalidos no trabalho de notificacao.')
    }
    const shortOrderId = escapeHtml(orderId.split('-')[0].toUpperCase())
    const carrier = escapeHtml(cleanText(payload.shippingCarrier, 'Transportadora', 100))
    const service = escapeHtml(cleanText(payload.shippingService, '', 100))
    const trackingUrl = `https://linkrastreio.com.br/?codigo=${encodeURIComponent(trackingCode)}`

    return {
      subject: `Pedido enviado - #${shortOrderId}`,
      html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head>
        <body><div class="container"><div class="logo">PALM CO.</div>
        <h1 class="title">Seu pedido esta a caminho!</h1>
        <p class="text">Ola, ${name}. O pedido <strong>#${shortOrderId}</strong> foi enviado.</p>
        <div style="margin:30px 0;padding:20px;background:#FDF6F0;text-align:center">
          <div style="font-size:13px;color:#8C827A">CODIGO DE RASTREIO</div>
          <strong style="font-size:22px;color:#1A332B">${escapeHtml(trackingCode)}</strong>
          <p style="margin-bottom:0;color:#5C544E">${carrier}${service ? ` - ${service}` : ''}</p>
        </div>
        <a href="${escapeHtml(trackingUrl)}" class="button">Acompanhar entrega</a>
        <div class="footer"><p>&copy; ${year} Palm CO.</p></div>
        </div></body></html>`,
    }
  }

  if (job.type === 'order_delivered') {
    const orderId = cleanText(payload.orderId, '', 36)
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      throw new Error('Pedido invalido no trabalho de notificacao.')
    }
    const shortOrderId = escapeHtml(orderId.split('-')[0].toUpperCase())

    return {
      subject: `Pedido entregue - #${shortOrderId}`,
      html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head>
        <body><div class="container"><div class="logo">PALM CO.</div>
        <h1 class="title">Pedido entregue!</h1>
        <p class="text">Ola, ${name}. O pedido <strong>#${shortOrderId}</strong> foi marcado como entregue.</p>
        <p class="text">Esperamos que voce aproveite muito a sua escolha. Obrigado por fazer parte da Palm CO.</p>
        <a href="${escapeHtml(`${siteUrl}/minha-conta`)}" class="button">Ver meus pedidos</a>
        <div class="footer"><p>&copy; ${year} Palm CO.</p></div>
        </div></body></html>`,
    }
  }

  throw new Error('Tipo de notificacao nao suportado.')
}

serve(async req => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://palm-co.vercel.app').replace(/\/$/, '')
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!serviceRoleKey || !hasServiceRole(bearerToken, serviceRoleKey)) {
    return jsonResponse({ error: 'Nao autorizado.' }, 401)
  }

  if (!supabaseUrl || !resendApiKey || !fromEmail) {
    console.error('Configuracao de notificacoes incompleta.')
    return jsonResponse({ error: 'Servico de notificacoes nao configurado.' }, 503)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.rpc('claim_notification_jobs', {
    p_limit: MAX_JOBS_PER_RUN,
  })

  if (error) {
    console.error('Falha ao reivindicar notificacoes.', { error: error.message })
    return jsonResponse({ error: 'Nao foi possivel acessar a fila.' }, 500)
  }

  const jobs = (data || []) as NotificationJob[]
  let sent = 0
  let failed = 0

  for (const job of jobs) {
    try {
      const email = renderEmail(job, siteUrl, supabaseUrl)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS)
      let response: Response

      try {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': job.id,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [job.recipient],
            subject: email.subject,
            html: email.html,
          }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      const responseBody = await response.text()
      if (!response.ok) {
        throw new Error(`Resend HTTP ${response.status}: ${responseBody.slice(0, 500)}`)
      }

      let providerMessageId: string | null = null
      try {
        providerMessageId = JSON.parse(responseBody)?.id || null
      } catch {
        providerMessageId = null
      }

      const { error: finishError } = await supabase.rpc('finish_notification_job', {
        p_job_id: job.id,
        p_success: true,
        p_error: null,
        p_provider_message_id: providerMessageId,
      })
      if (finishError) throw finishError
      sent++
    } catch (error) {
      failed++
      const message = errorMessage(error)
      console.error('Falha ao processar notificacao.', { jobId: job.id, error: message })
      await supabase.rpc('finish_notification_job', {
        p_job_id: job.id,
        p_success: false,
        p_error: message,
        p_provider_message_id: null,
      })
    }
  }

  return jsonResponse({ processed: jobs.length, sent, failed }, 200)
})
