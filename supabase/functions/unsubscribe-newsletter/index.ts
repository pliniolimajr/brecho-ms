import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function redirect(siteUrl: string, status: string) {
  const destination = new URL('/newsletter/descadastro', siteUrl)
  destination.searchParams.set('status', status)
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination.toString(),
      'Cache-Control': 'no-store',
    },
  })
}

serve(async req => {
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://palm-co.vercel.app')
    .replace(/\/$/, '')

  if (req.method !== 'GET') {
    return redirect(siteUrl, 'invalid')
  }

  const token = new URL(req.url).searchParams.get('token') || ''
  if (!UUID_PATTERN.test(token)) {
    return redirect(siteUrl, 'invalid')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return redirect(siteUrl, 'error')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({ is_active: false })
    .eq('unsubscribe_token', token)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Falha ao processar descadastro.', { error: error.message })
    return redirect(siteUrl, 'error')
  }

  return redirect(siteUrl, data ? 'success' : 'not_found')
})
