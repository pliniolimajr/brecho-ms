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
    const { items, payer, origin, orderId } = await req.json()
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    if (!MP_ACCESS_TOKEN) {
        throw new Error('MP_ACCESS_TOKEN não está configurado nas variáveis de ambiente do Supabase.')
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

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    const data = await response.json()
    
    if (!response.ok) {
      const errorMsg = data.message || data.error || JSON.stringify(data);
      throw new Error(`Mercado Pago API Error: ${errorMsg} | Sent Payload: ${JSON.stringify(preferenceData)}`);
    }
    
    return new Response(JSON.stringify(data), {
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
