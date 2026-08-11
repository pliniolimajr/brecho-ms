import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  ApiError,
  corsHeaders,
  enforceRateLimit,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from '../_shared/http.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async req => {
  const requestId = crypto.randomUUID()
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(new ApiError('Método não permitido.', 405, 'METHOD_NOT_ALLOWED'), requestId)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      throw new ApiError('Newsletter temporariamente indisponível.', 503, 'NEWSLETTER_NOT_CONFIGURED')
    }

    const payload = await parseJsonBody<{ name?: unknown; email?: unknown }>(req, 2_000)
    const name = String(payload.name || '').trim().replace(/\s+/g, ' ')
    const email = String(payload.email || '').trim().toLowerCase()
    if (name.length < 2 || name.length > 80 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      throw new ApiError('Nome ou e-mail inválido.', 400, 'INVALID_SUBSCRIBER')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await enforceRateLimit(req, supabase, 'subscribe-newsletter-ip', 5, 3600)
    await enforceRateLimit(req, supabase, 'subscribe-newsletter-email', 3, 86400, email)

    const { error } = await supabase.from('newsletter_subscribers').upsert({
      name,
      email,
      is_active: true,
    }, { onConflict: 'email' })
    if (error) {
      console.error('Falha ao assinar newsletter.', { requestId, error: error.message })
      throw new ApiError('Não foi possível concluir o cadastro.', 500, 'NEWSLETTER_SAVE_FAILED')
    }

    return jsonResponse({ success: true }, 200, requestId)
  } catch (error) {
    if (!(error instanceof ApiError)) console.error('Erro inesperado na newsletter.', { requestId, error })
    return errorResponse(error, requestId)
  }
})

