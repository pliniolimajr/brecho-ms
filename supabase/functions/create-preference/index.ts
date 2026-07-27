import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, payer } = await req.json()
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    if (!MP_ACCESS_TOKEN) {
        throw new Error('MP_ACCESS_TOKEN não está configurado nas variáveis de ambiente do Supabase.')
    }

    const preferenceData = {
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
        success: `${req.headers.get('origin')}/checkout-success`,
        failure: `${req.headers.get('origin')}/checkout-failure`,
        pending: `${req.headers.get('origin')}/checkout-pending`,
      },
      auto_return: 'approved',
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    const data = await response.json()
    
    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
