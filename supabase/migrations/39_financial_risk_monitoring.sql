-- BLOCO 3 - MONITORAMENTO DE RISCO FINANCEIRO E CONTESTACOES

CREATE OR REPLACE FUNCTION public.admin_operational_health()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'checked_at', NOW(),
    'notifications', jsonb_build_object(
      'failed', COUNT(*) FILTER (WHERE status = 'failed'),
      'stale', COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND scheduled_at < NOW() - INTERVAL '15 minutes')
    )
  ) INTO v_result FROM public.notification_jobs;

  v_result := v_result || jsonb_build_object(
    'payments', jsonb_build_object(
      'expired_pending', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending' AND reservation_expires_at < NOW()),
      'processed_last_24h', (SELECT COUNT(*) FROM public.payment_events WHERE processed_at >= NOW() - INTERVAL '24 hours'),
      'chargebacks', (SELECT COUNT(*) FROM public.orders WHERE payment_status = 'charged_back'),
      'partial_refunds', (SELECT COUNT(*) FROM public.orders WHERE payment_status = 'partially_refunded'),
      'failed_refunds', (SELECT COUNT(*) FROM public.payment_refunds WHERE status = 'failed'),
      'stuck_refunds', (SELECT COUNT(*) FROM public.payment_refunds WHERE status = 'processing' AND created_at < NOW() - INTERVAL '5 minutes')
    ),
    'returns', jsonb_build_object(
      'requested', (SELECT COUNT(*) FROM public.order_returns WHERE status = 'requested'),
      'approved_waiting', (SELECT COUNT(*) FROM public.order_returns WHERE status = 'approved'),
      'received_waiting', (SELECT COUNT(*) FROM public.order_returns WHERE status = 'received')
    ),
    'shipping', jsonb_build_object(
      'failed', (SELECT COUNT(*) FROM public.orders WHERE shipping_label_status = 'failed'),
      'stuck', (SELECT COUNT(*) FROM public.orders WHERE shipping_label_status = 'creating' AND created_at < NOW() - INTERVAL '15 minutes')
    )
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_financial_risk_cases()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(case_row ORDER BY occurred_at DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      'chargeback'::TEXT AS type,
      o.id AS order_id,
      o.total_amount AS amount,
      'Contestacao recebida'::TEXT AS title,
      'Verifique o pagamento e as evidencias de entrega no Mercado Pago.'::TEXT AS detail,
      COALESCE((SELECT MAX(pe.processed_at) FROM public.payment_events pe WHERE pe.order_id = o.id AND pe.payment_status = 'charged_back'), o.created_at) AS occurred_at
    FROM public.orders o
    WHERE o.payment_status = 'charged_back'

    UNION ALL

    SELECT
      CASE WHEN pr.status = 'processing' THEN 'refund_stuck' ELSE 'refund_failed' END,
      pr.order_id,
      pr.amount,
      CASE WHEN pr.status = 'processing' THEN 'Reembolso sem conclusao' ELSE 'Reembolso com falha' END,
      COALESCE(NULLIF(pr.last_error, ''), 'Consulte o registro do reembolso e o Mercado Pago.'),
      COALESCE(pr.processed_at, pr.created_at)
    FROM public.payment_refunds pr
    WHERE pr.status = 'failed'
       OR (pr.status = 'processing' AND pr.created_at < NOW() - INTERVAL '5 minutes')
    ORDER BY occurred_at DESC
    LIMIT 50
  ) case_row;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'checked_at', NOW(),
    'orders', jsonb_build_object(
      'pending_payment', COUNT(*) FILTER (WHERE payment_status IN ('pending', 'in_process') AND order_status = 'open'),
      'to_process', COUNT(*) FILTER (WHERE payment_status = 'paid' AND fulfillment_status IN ('unfulfilled', 'processing')),
      'ready_to_ship', COUNT(*) FILTER (WHERE fulfillment_status = 'ready_to_ship'),
      'shipped', COUNT(*) FILTER (WHERE fulfillment_status = 'shipped')
    ),
    'sales', jsonb_build_object(
      'last_7_days', COALESCE(SUM(total_amount) FILTER (WHERE payment_status IN ('paid', 'partially_refunded') AND created_at >= NOW() - INTERVAL '7 days'), 0),
      'paid_last_7_days', COUNT(*) FILTER (WHERE payment_status IN ('paid', 'partially_refunded') AND created_at >= NOW() - INTERVAL '7 days')
    )
  ) INTO v_result FROM public.orders;

  v_result := v_result || jsonb_build_object(
    'inventory', jsonb_build_object(
      'available', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NULL AND stock_quantity > 0),
      'out_of_stock', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NULL AND stock_quantity = 0),
      'archived', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NOT NULL)
    ),
    'alerts', jsonb_build_object(
      'email_failures', (SELECT COUNT(*) FROM public.notification_jobs WHERE status = 'failed'),
      'shipping_failures', (SELECT COUNT(*) FROM public.orders WHERE shipping_label_status = 'failed'),
      'stale_payments', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending' AND reservation_expires_at < NOW()),
      'chargebacks', (SELECT COUNT(*) FROM public.orders WHERE payment_status = 'charged_back'),
      'refund_failures', (SELECT COUNT(*) FROM public.payment_refunds WHERE status = 'failed' OR (status = 'processing' AND created_at < NOW() - INTERVAL '5 minutes')),
      'pending_returns', (SELECT COUNT(*) FROM public.order_returns WHERE status IN ('requested', 'approved', 'received'))
    )
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_financial_risk_cases() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_financial_risk_cases() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_operational_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_operational_health() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated, service_role;
