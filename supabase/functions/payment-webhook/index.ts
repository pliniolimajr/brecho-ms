import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload recebido:', payload)
    
    // Validar se é uma notificação de pagamento (action = payment.created ou payment.updated)
    if (payload.type === 'payment' || (payload.action && payload.action.startsWith('payment.'))) {
      
      const paymentId = payload.data?.id
      if (!paymentId) return new Response('No payment ID', { status: 400 })
      
      // Buscar status do pagamento no MP
      const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      })
      
      const paymentData = await paymentResponse.json()
      console.log('Payment data from MP:', paymentData.status, paymentData.external_reference)

      // Atualizar Supabase (se tivéssemos passado order_id em external_reference)
      // Como não passamos order_id na criação por simplificação, precisaremos
      // adaptar a lógica ou garantir que o frontend envie a external_reference correta.
      
      // Exemplo de como usar o cliente supabase na edge function
      // const supabase = createClient(
      //  Deno.env.get('SUPABASE_URL') ?? '',
      //  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      // )
      // await supabase.from('orders').update({ status: paymentData.status === 'approved' ? 'paid' : 'pending' }).eq('id', paymentData.external_reference)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
