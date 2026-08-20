import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { operationalLogger } from '../_shared/logger.ts'

const logger = operationalLogger('refund-payment')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const API_TIMEOUT_MS = 15_000

class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message)
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function safeText(value: unknown, maxLength = 800) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo nao permitido.' } }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const mercadoPagoToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!supabaseUrl || !serviceRoleKey || !mercadoPagoToken) {
    return jsonResponse({ error: { code: 'NOT_CONFIGURED', message: 'Servico de reembolso nao configurado.' } }, 503)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  let refundRecordId: string | null = null

  try {
    const authHeader = req.headers.get('authorization') || ''
    const userToken = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await adminClient.auth.getUser(userToken)
    if (userError || !userData.user) throw new HttpError('Sessao invalida.', 401, 'UNAUTHORIZED')

    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('id, role, is_active')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!adminRow?.is_active || !['owner', 'finance'].includes(adminRow.role)) {
      throw new HttpError('Somente proprietario ou financeiro pode realizar reembolsos.', 403, 'FORBIDDEN')
    }

    const payload = await req.json() as {
      orderId?: string
      amount?: number
      idempotencyKey?: string
      returnId?: string | null
    }
    if (!UUID_PATTERN.test(payload.orderId || '')) throw new HttpError('Pedido invalido.', 400, 'INVALID_ORDER')
    if (!UUID_PATTERN.test(payload.idempotencyKey || '')) throw new HttpError('Chave de seguranca invalida.', 400, 'INVALID_IDEMPOTENCY_KEY')
    if (payload.returnId && !UUID_PATTERN.test(payload.returnId)) throw new HttpError('Devolucao invalida.', 400, 'INVALID_RETURN')

    const requestedAmount = Number(payload.amount)
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new HttpError('Informe um valor de reembolso valido.', 400, 'INVALID_AMOUNT')
    }
    const amount = Math.round(requestedAmount * 100) / 100

    const { data: existing } = await adminClient
      .from('payment_refunds')
      .select('*')
      .eq('idempotency_key', payload.idempotencyKey)
      .maybeSingle()
    const processingAgeMs = existing?.created_at ? Date.now() - new Date(existing.created_at).getTime() : 0
    if (existing?.status === 'processing' && processingAgeMs < 120_000) {
      throw new HttpError('Este reembolso ja esta em processamento.', 409, 'REFUND_IN_PROGRESS')
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, total_amount, payment_status, fulfillment_status, order_status, status')
      .eq('id', payload.orderId)
      .single()
    if (orderError || !order) throw new HttpError('Pedido nao encontrado.', 404, 'ORDER_NOT_FOUND')
    if (existing?.status === 'approved') {
      const { data: completedRefunds } = await adminClient
        .from('payment_refunds')
        .select('amount')
        .eq('order_id', order.id)
        .eq('status', 'approved')
      const completedAmount = (completedRefunds || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const reconciledStatus = completedAmount >= Number(order.total_amount) ? 'refunded' : 'partially_refunded'
      const { error: reconcileError } = await adminClient.from('orders').update({
        payment_status: reconciledStatus,
        status: reconciledStatus === 'refunded' ? 'cancelled' : order.status,
        order_status: reconciledStatus === 'refunded' ? 'cancelled' : order.order_status,
        fulfillment_status: reconciledStatus === 'refunded' ? 'not_required' : order.fulfillment_status,
      }).eq('id', order.id)
      if (reconcileError) throw new HttpError('Reembolso aprovado, mas o pedido precisa ser reconciliado.', 500, 'ORDER_RECONCILIATION_REQUIRED')
      return jsonResponse({ refund: existing, paymentStatus: reconciledStatus, reused: true }, 200)
    }
    if (!['paid', 'partially_refunded'].includes(order.payment_status)) {
      throw new HttpError('Somente pagamentos aprovados podem ser reembolsados.', 409, 'PAYMENT_NOT_REFUNDABLE')
    }

    const { data: paymentEvent } = await adminClient
      .from('payment_events')
      .select('payment_id')
      .eq('order_id', order.id)
      .eq('payment_status', 'approved')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!paymentEvent?.payment_id) throw new HttpError('Pagamento aprovado nao localizado.', 409, 'PAYMENT_ID_NOT_FOUND')

    const { data: approvedRefunds, error: refundsError } = await adminClient
      .from('payment_refunds')
      .select('amount')
      .eq('order_id', order.id)
      .eq('status', 'approved')
    if (refundsError) throw new HttpError('Nao foi possivel validar o saldo reembolsavel.', 500, 'REFUND_LOOKUP_FAILED')
    const refundedAmount = (approvedRefunds || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const refundableAmount = Math.round((Number(order.total_amount) - refundedAmount) * 100) / 100
    if (amount > refundableAmount || refundableAmount <= 0) {
      throw new HttpError(`Valor maximo disponivel para reembolso: R$ ${refundableAmount.toFixed(2)}.`, 409, 'AMOUNT_EXCEEDS_BALANCE')
    }

    if (payload.returnId) {
      const { data: returnRow } = await adminClient
        .from('order_returns')
        .select('id')
        .eq('id', payload.returnId)
        .eq('order_id', order.id)
        .maybeSingle()
      if (!returnRow) throw new HttpError('A devolucao nao pertence a este pedido.', 409, 'RETURN_ORDER_MISMATCH')
    }

    const refundPayload = {
        order_id: order.id,
        return_id: payload.returnId || null,
        payment_id: paymentEvent.payment_id,
        amount,
        status: 'processing',
        idempotency_key: payload.idempotencyKey,
        requested_by: userData.user.id,
        last_error: null,
        processed_at: null,
      }
    if (existing) {
      if (existing.order_id !== order.id || Number(existing.amount) !== amount) {
        throw new HttpError('A chave de seguranca ja pertence a outro reembolso.', 409, 'IDEMPOTENCY_CONFLICT')
      }
      const { error: retryError } = await adminClient
        .from('payment_refunds')
        .update({ status: 'processing', last_error: null, processed_at: null })
        .eq('id', existing.id)
      if (retryError) throw new HttpError('Nao foi possivel retomar o reembolso.', 500, 'REFUND_RETRY_FAILED')
      refundRecordId = existing.id
    } else {
      const { data: inserted, error: insertError } = await adminClient
        .from('payment_refunds')
        .insert(refundPayload)
        .select('id')
        .single()
      if (insertError || !inserted) {
        if (insertError?.code === '23505') throw new HttpError('Esta solicitacao ja foi registrada.', 409, 'DUPLICATE_REQUEST')
        throw new HttpError('Nao foi possivel registrar o reembolso.', 500, 'REFUND_CREATE_FAILED')
      }
      refundRecordId = inserted.id
    }

    const isFullRefund = Math.abs(amount - refundableAmount) < 0.001
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    let providerResponse: Response
    let providerData: Record<string, unknown>
    try {
      providerResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentEvent.payment_id}/refunds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': payload.idempotencyKey!,
        },
        body: isFullRefund ? undefined : JSON.stringify({ amount }),
        signal: controller.signal,
      })
      const raw = await providerResponse.text()
      try {
        providerData = raw ? JSON.parse(raw) : {}
      } catch {
        providerData = { raw: raw.slice(0, 1000) }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new HttpError('O Mercado Pago demorou para responder. Verifique antes de tentar novamente.', 504, 'PROVIDER_TIMEOUT')
      }
      throw new HttpError('Nao foi possivel acessar o Mercado Pago.', 502, 'PROVIDER_UNAVAILABLE')
    } finally {
      clearTimeout(timeoutId)
    }

    if (!providerResponse.ok) {
      const providerMessage = safeText(providerData.message || providerData.error || 'Reembolso recusado pelo Mercado Pago.')
      await adminClient.from('payment_refunds').update({
        status: 'failed', last_error: providerMessage, provider_payload: providerData, processed_at: new Date().toISOString(),
      }).eq('id', refundRecordId)
      refundRecordId = null
      throw new HttpError(providerMessage, providerResponse.status >= 500 ? 502 : 409, 'PROVIDER_REJECTED')
    }

    const providerRefundId = safeText(providerData.id, 200) || null
    const newRefundedAmount = Math.round((refundedAmount + amount) * 100) / 100
    const paymentStatus = newRefundedAmount >= Number(order.total_amount) ? 'refunded' : 'partially_refunded'
    const legacyStatus = paymentStatus === 'refunded' ? 'cancelled' : order.status

    const { error: updateRefundError } = await adminClient.from('payment_refunds').update({
      status: 'approved', provider_refund_id: providerRefundId,
      provider_payload: providerData, last_error: null, processed_at: new Date().toISOString(),
    }).eq('id', refundRecordId)
    if (updateRefundError) throw new HttpError('Reembolso confirmado, mas houve falha ao salvar o retorno.', 500, 'REFUND_RECONCILIATION_REQUIRED')

    const { error: updateOrderError } = await adminClient.from('orders').update({
      payment_status: paymentStatus,
      status: legacyStatus,
      order_status: paymentStatus === 'refunded' ? 'cancelled' : order.order_status,
      fulfillment_status: paymentStatus === 'refunded' ? 'not_required' : order.fulfillment_status,
    }).eq('id', order.id)
    if (updateOrderError) throw new HttpError('Reembolso confirmado, mas o pedido precisa ser reconciliado.', 500, 'ORDER_RECONCILIATION_REQUIRED')

    await adminClient.from('order_events').insert({
      order_id: order.id,
      event_type: 'refund_approved',
      title: paymentStatus === 'refunded' ? 'Reembolso total aprovado' : 'Reembolso parcial aprovado',
      details: { refund_id: refundRecordId, provider_refund_id: providerRefundId, amount },
      actor_id: userData.user.id,
      actor_email: userData.user.email || 'administrador',
    })

    logger.info('refund_approved', { orderId: order.id, refundRecordId, amount, paymentStatus })
    return jsonResponse({
      refund: { id: refundRecordId, providerRefundId, amount, status: 'approved' },
      paymentStatus,
    }, 200)
  } catch (error) {
    if (refundRecordId && error instanceof HttpError && !['REFUND_RECONCILIATION_REQUIRED', 'ORDER_RECONCILIATION_REQUIRED'].includes(error.code)) {
      await adminClient.from('payment_refunds').update({
        status: 'failed', last_error: safeText(error.message), processed_at: new Date().toISOString(),
      }).eq('id', refundRecordId)
    }
    const httpError = error instanceof HttpError
      ? error
      : new HttpError('Erro inesperado ao processar o reembolso.', 500, 'INTERNAL_ERROR')
    logger.error('refund_failed', error, { code: httpError.code })
    return jsonResponse({ error: { code: httpError.code, message: httpError.message } }, httpError.status)
  }
})
