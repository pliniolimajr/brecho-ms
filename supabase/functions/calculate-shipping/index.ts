import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ApiError, corsHeaders, enforceRateLimit, errorResponse, jsonResponse, parseJsonBody } from '../_shared/http.ts'
const API_TIMEOUT_MS = 10_000

function cleanZip(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

serve(async req => {
  const requestId = crypto.randomUUID()
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(new ApiError('Método não permitido.', 405, 'METHOD_NOT_ALLOWED'), requestId)

  try {
    const { toZip, items } = await parseJsonBody<{ toZip?: string; items?: unknown[] }>(req)
    const destinationZip = cleanZip(toZip)
    if (!/^\d{8}$/.test(destinationZip)) {
      throw new ApiError('CEP de destino inválido.', 400, 'INVALID_ZIP_CODE')
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      throw new ApiError('A lista de produtos é inválida.', 400, 'INVALID_ITEMS')
    }

    const token = Deno.env.get('SUPERFRETE_SANDBOX_TOKEN')
    const userAgent = Deno.env.get('SUPERFRETE_USER_AGENT') || 'Palm CO. v1 (plinio.codeba@gmail.com)'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!token || !supabaseUrl || !serviceRoleKey) {
      console.error('SUPERFRETE_SANDBOX_TOKEN não configurado.')
      throw new ApiError('Cálculo de frete temporariamente indisponível.', 503, 'SHIPPING_NOT_CONFIGURED')
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await enforceRateLimit(req, supabase, 'calculate-shipping', 30, 60)

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
      throw new ApiError('Não foi possível calcular o frete agora. Tente novamente.', 502, 'SHIPPING_PROVIDER_ERROR')
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
      throw new ApiError('Nenhuma modalidade de frete disponível para este CEP.', 422, 'SHIPPING_UNAVAILABLE')
    }

    return jsonResponse(rates, 200, requestId)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return errorResponse(new ApiError('A SuperFrete demorou para responder. Tente novamente.', 504, 'SHIPPING_TIMEOUT'), requestId)
    }
    if (!(error instanceof ApiError)) console.error('Erro inesperado no cálculo de frete:', { requestId, error })
    return errorResponse(error, requestId)
  }
})
