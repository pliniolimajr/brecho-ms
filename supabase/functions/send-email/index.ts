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
    const payload = await req.json()
    const { type, email, name, orderId, totalAmount, items } = payload

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY não configurada no ambiente. E-mail simulado com sucesso.');
      return new Response(JSON.stringify({ success: true, simulated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Palm CO. <onboarding@resend.dev>'
    
    let subject = ''
    let html = ''

    if (type === 'welcome') {
      subject = 'Bem-vindo à Palm CO. - Cupom de Boas-vindas inside! 🌟'
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF6F0; margin: 0; padding: 0; color: #423226; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border: 1px solid #EFEAE4; }
            .logo { text-align: center; font-size: 32px; font-family: Georgia, serif; letter-spacing: 2px; color: #1A332B; margin-bottom: 30px; text-transform: uppercase; }
            .hero-title { font-size: 24px; font-family: Georgia, serif; color: #1A332B; text-align: center; margin-bottom: 20px; }
            .text { font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center; color: #5C544E; }
            .coupon-box { text-align: center; border: 2px dashed #C06A35; padding: 20px; background-color: #FDF6F0; margin: 30px 0; border-radius: 4px; }
            .coupon-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #C06A35; margin-bottom: 5px; }
            .coupon-code { font-size: 28px; font-weight: bold; color: #1A332B; font-family: monospace; }
            .btn { display: block; width: 200px; margin: 30px auto 0; text-align: center; background-color: #1A332B; color: #ffffff !important; padding: 15px 25px; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #A8A29E; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Palm CO.</div>
            <h1 class="hero-title">Olá, ${name || 'Amiga(o)'}!</h1>
            <p class="text">Ficamos muito felizes em ter você na nossa newsletter. A partir de agora, você receberá novidades semanais sobre moda, sustentabilidade e novas curadorias em primeira mão.</p>
            <p class="text">Para comemorar sua chegada, preparamos um presente especial para sua próxima compra:</p>
            <div class="coupon-box">
              <div class="coupon-title">Use o cupom na finalização</div>
              <div class="coupon-code">BEMVINDO10</div>
            </div>
            <p class="text">Aproveite 10% de desconto na sua primeira compra!</p>
            <a href="https://palm-co.com" class="btn">Explorar Loja</a>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Palm CO. E-commerce Premium. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else if (type === 'order_confirmed') {
      subject = `Pedido Confirmado! #${orderId?.split('-')[0]?.toUpperCase()} - Palm CO.`
      const formattedTotal = Number(totalAmount).toFixed(2).replace('.', ',')
      
      let itemsListHtml = ''
      if (items && Array.isArray(items)) {
        itemsListHtml = items.map((item: any) => `
          <tr style="border-bottom: 1px solid #EFEAE4;">
            <td style="padding: 10px 0; font-size: 14px; color: #1A332B;"><strong>${item.name}</strong><br><span style="font-size: 12px; color: #8C827A;">Tamanho: ${item.size || 'Único'}</span></td>
            <td style="padding: 10px 0; text-align: right; font-size: 14px; color: #1A332B;">R$ ${Number(item.price).toFixed(2).replace('.', ',')}</td>
          </tr>
        `).join('')
      }

      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF6F0; margin: 0; padding: 0; color: #423226; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border: 1px solid #EFEAE4; }
            .logo { text-align: center; font-size: 32px; font-family: Georgia, serif; letter-spacing: 2px; color: #1A332B; margin-bottom: 30px; text-transform: uppercase; }
            .hero-title { font-size: 24px; font-family: Georgia, serif; color: #1A332B; text-align: center; margin-bottom: 20px; }
            .text { font-size: 16px; line-height: 1.6; margin-bottom: 25px; color: #5C544E; }
            .order-details { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .order-details th { text-align: left; padding-bottom: 10px; border-bottom: 2px solid #1A332B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8C827A; }
            .total-row td { padding-top: 15px; border-top: 2px solid #1A332B; font-size: 16px; font-weight: bold; color: #1A332B; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #A8A29E; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Palm CO.</div>
            <h1 class="hero-title">Seu pagamento foi confirmado!</h1>
            <p class="text">Olá, ${name || 'Cliente'}!</p>
            <p class="text">Confirmamos o pagamento do seu pedido <strong>#${orderId?.split('-')[0]?.toUpperCase()}</strong> com sucesso. Nossa equipe de curadoria já está preparando seu pacote com todo o carinho e cuidado que você merece.</p>
            
            <table class="order-details">
              <thead>
                <tr>
                  <th style="text-align: left;">Item</th>
                  <th style="text-align: right;">Preço</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
                <tr class="total-row">
                  <td style="padding-top: 15px;"><strong>Total</strong></td>
                  <td style="padding-top: 15px; text-align: right;"><strong>R$ ${formattedTotal}</strong></td>
                </tr>
              </tbody>
            </table>

            <p class="text" style="text-align: center; font-style: italic; color: #C06A35; font-size: 14px; margin-top: 30px;">
              Assim que o seu pedido for postado nos Correios, nós enviaremos o código de rastreamento para você acompanhar a entrega.
            </p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Palm CO. E-commerce Premium. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      throw new Error(`Tipo de e-mail não suportado: ${type}`)
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: subject,
        html: html
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify({ success: true, data }), {
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
