import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://palm-co.vercel.app').replace(/\/$/, '')
const staticPaths = ['/', '/catalogo', '/sobre', '/politicas', '/faq', '/contato', '/termos', '/privacidade']

function urlEntry(path: string, lastModified?: string) {
  const lastmod = lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : ''
  return `<url><loc>${SITE_URL}${path}</loc>${lastmod}</url>`
}

serve(async request => {
  if (request.method !== 'GET') return new Response('Método não permitido.', { status: 405 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return new Response('Sitemap indisponível.', { status: 503 })

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: products, error } = await supabase
    .from('products')
    .select('id, created_at')
    .eq('is_sold', false)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Falha ao gerar sitemap:', error)
    return new Response('Sitemap indisponível.', { status: 503 })
  }

  const urls = [
    ...staticPaths.map(path => urlEntry(path)),
    ...(products || []).map(product => urlEntry(`/produto/${encodeURIComponent(product.id)}`, product.created_at)),
  ].join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
})
