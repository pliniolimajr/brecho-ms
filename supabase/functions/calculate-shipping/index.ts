import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const API_TIMEOUT_MS = 10_000

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function cleanZip(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  try {
    const { toZip, items } = await req.json() as { toZip?: string; items?: unknown[] }
    const destinationZip = cleanZip(toZip)
    if (!/^\d{8}$/.test(destinationZip)) {
      return jsonResponse({ error: 'CEP de destino inválido.' }, 400)
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return jsonResponse({ error: 'A lista de produtos é inválida.' }, 400)
    }

    const token = Deno.env.get('SUPERFRETE_SANDBOX_TOKEN')
    const userAgent = Deno.env.get('SUPERFRETE_USER_AGENT') || 'Palm CO. v1 (plinio.codeba@gmail.com)'
    if (!token) {
      console.error('SUPERFRETE_SANDBOX_TOKEN não configurado.')
      return jsonResponse({ error: 'Cálculo de frete temporariamente indisponível.' }, 503)
    }

    const itemCount = items.length
    const packageData = {
      width: 18,
      height: 9 + (itemCount - 1) * 3,
      length: 28,
      weight: 0.3 + (itemCount - 1) * 0.25,
    }
    const payload = {
      from: { postal_code: '40415115' },
      to: { postal_code: destinationZip },
      services: '1,2,17',
      package: packageData,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch('https://sandbox.superfrete.com/api/v0/calculator', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': userAgent,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const raw = await response.text()
    let data: any
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = null
    }

    if (!response.ok || !Array.isArray(data)) {
      console.error('SuperFrete recusou o cálculo.', {
        status: response.status,
        message: String(data?.message || data?.error || raw).slice(0, 300),
      })
      return jsonResponse({ error: 'Não foi possível calcular o frete agora. Tente novamente.' }, 502)
    }

    const rates = data
      .filter(rate => !rate.error && Number(rate.price) > 0)
      .map(rate => ({
        id: String(rate.id || rate.service || ''),
        name: String(rate.name || 'Frete'),
        price: Number(rate.price),
        delivery_time: Number(rate.delivery_time || rate.delivery || 0),
        package: rate.packages?.[0]?.dimensions || packageData,
      }))

    if (rates.length === 0) {
      return jsonResponse({ error: 'Nenhuma modalidade de frete disponível para este CEP.' }, 422)
    }

    return jsonResponse(rates, 200)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return jsonResponse({ error: 'A SuperFrete demorou para responder. Tente novamente.' }, 504)
    }
    console.error('Erro inesperado no cálculo de frete:', error)
    return jsonResponse({ error: 'Erro ao calcular frete.' }, 500)
  }
})
