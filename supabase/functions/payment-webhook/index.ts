import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload recebido:', JSON.stringify(payload))
    
    // Suporte a diferentes formatos de webhook do Mercado Pago (payment.created, payment.updated, etc)
    const isPaymentEvent = payload.type === 'payment' || 
      (payload.action && payload.action.startsWith('payment.')) ||
      payload.entity === 'payment';

    if (isPaymentEvent) {
      const paymentId = payload.data?.id || payload.id;
      if (!paymentId) {
        console.warn('Payload sem ID de pagamento válido:', payload);
        return new Response('No payment ID', { status: 200 }); // Retorna 200 pro MP não ficar reenviando
      }
      
      // Buscar status do pagamento na API do Mercado Pago
      const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
      if (!MP_ACCESS_TOKEN) {
        console.error('MP_ACCESS_TOKEN não configurado no ambiente.');
        return new Response('Server configuration error', { status: 500 });
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      })
      
      if (!paymentResponse.ok) {
        console.error(`Erro ao consultar pagamento ${paymentId} no MP: ${paymentResponse.statusText}`);
        return new Response('Payment query failed', { status: 200 });
      }

      const paymentData = await paymentResponse.json()
      console.log(`Payment MP ${paymentId} status: ${paymentData.status}, order_id: ${paymentData.external_reference}`)

      // Atualizar status do pedido no Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey && paymentData.external_reference) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
        const orderId = paymentData.external_reference;
        
        let newStatus = 'pending'
        if (paymentData.status === 'approved') {
          newStatus = 'paid'
        } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(paymentData.status)) {
          newStatus = 'cancelled'
        }

        let paymentMethod = 'mercado_pago'
        if (paymentData.payment_type_id === 'credit_card') {
          paymentMethod = 'credit_card'
        } else if (paymentData.payment_type_id === 'bank_transfer') {
          paymentMethod = 'pix'
        } else if (paymentData.payment_type_id === 'ticket') {
          paymentMethod = 'boleto'
        }
        
        const { error } = await supabaseClient
          .from('orders')
          .update({ 
            status: newStatus,
            payment_method: paymentMethod
          })
          .eq('id', orderId)
          
        if (error) {
          console.error('Erro ao atualizar status do pedido no Supabase:', error)
        } else {
          console.log(`Pedido ${orderId} atualizado para: ${newStatus} (${paymentMethod})`)
          
          // Se o pagamento foi aprovado, enviar e-mail de confirmação
          if (newStatus === 'paid') {
            try {
              const { data: orderDetails } = await supabaseClient
                .from('orders')
                .select('*, order_items(price, products(name, size))')
                .eq('id', orderId)
                .single();

              if (orderDetails) {
                const address = orderDetails.shipping_address || {};
                const customerName = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Cliente';
                const customerEmail = paymentData.payer?.email || address.email || 'contato@palm-co.com';

                const orderItems = orderDetails.order_items || [];
                const itemsList = orderItems.map((item: any) => ({
                  name: item.products?.name || 'Produto',
                  size: item.products?.size || 'Único',
                  price: item.price
                }));

                const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                  },
                  body: JSON.stringify({
                    type: 'order_confirmed',
                    email: customerEmail,
                    name: customerName,
                    orderId: orderId,
                    totalAmount: orderDetails.total_amount,
                    items: itemsList
                  })
                });

                if (emailResponse.ok) {
                  console.log(`E-mail de confirmação enviado com sucesso para ${customerEmail}`);
                } else {
                  const errText = await emailResponse.text();
                  console.error(`Erro ao chamar a Edge Function de e-mail: ${errText}`);
                }
              }
            } catch (mailErr: any) {
              console.error('Erro ao preparar/enviar e-mail de confirmação do pedido:', mailErr.message);
            }
          }

          // Se o pagamento foi cancelado/rejeitado, devolver os produtos ao estoque
          if (newStatus === 'cancelled') {
            const { data: items } = await supabaseClient
              .from('order_items')
              .select('product_id')
              .eq('order_id', orderId);
              
            if (items && items.length > 0) {
              for (const item of items) {
                await supabaseClient
                  .from('products')
                  .update({ is_sold: false })
                  .eq('id', item.product_id);
              }
              console.log(`Estoque liberado para os produtos do pedido cancelado ${orderId}`);
            }
          }
        }
      } else {
        console.error('Credenciais do Supabase ausentes ou external_reference vazia.')
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook error exception:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // Retornamos 200 para evitar loops de retry do webhook pelo MP
    })
  }
})
