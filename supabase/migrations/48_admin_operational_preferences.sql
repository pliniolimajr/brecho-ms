-- BLOCO 7 - PREFERENCIAS OPERACIONAIS

CREATE TABLE IF NOT EXISTS public.admin_operational_preferences (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  processing_warning_hours INTEGER NOT NULL DEFAULT 24 CHECK (processing_warning_hours BETWEEN 1 AND 168),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold BETWEEN 0 AND 100),
  default_snooze_hours INTEGER NOT NULL DEFAULT 24 CHECK (default_snooze_hours BETWEEN 1 AND 168),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.admin_operational_preferences(id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.admin_operational_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_operational_preferences FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_operational_preferences()
RETURNS public.admin_operational_preferences
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result public.admin_operational_preferences%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_result FROM public.admin_operational_preferences WHERE id = TRUE;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_update_operational_preferences(
  p_processing_warning_hours INTEGER,
  p_low_stock_threshold INTEGER,
  p_default_snooze_hours INTEGER
)
RETURNS public.admin_operational_preferences
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result public.admin_operational_preferences%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('settings.manage') THEN
    RAISE EXCEPTION 'Somente o proprietario altera estas preferencias.' USING ERRCODE = '42501';
  END IF;
  IF p_processing_warning_hours NOT BETWEEN 1 AND 168 OR p_default_snooze_hours NOT BETWEEN 1 AND 168
    OR p_low_stock_threshold NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Preferencias fora dos limites permitidos.'; END IF;
  UPDATE public.admin_operational_preferences SET
    processing_warning_hours = p_processing_warning_hours,
    low_stock_threshold = p_low_stock_threshold,
    default_snooze_hours = p_default_snooze_hours,
    updated_by = auth.uid(), updated_at = NOW()
  WHERE id = TRUE RETURNING * INTO v_result;
  PERFORM public.write_admin_audit('operational_preferences_updated', 'admin_settings', 'operations',
    jsonb_build_object('processing_warning_hours', p_processing_warning_hours,
      'low_stock_threshold', p_low_stock_threshold, 'default_snooze_hours', p_default_snooze_hours));
  RETURN v_result;
END;
$$;

-- Atualiza a fonte da Central de Acao para usar os limites configurados.
CREATE OR REPLACE FUNCTION public.admin_action_center_internal()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result JSONB; v_processing_hours INTEGER; v_low_stock INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  SELECT processing_warning_hours, low_stock_threshold INTO v_processing_hours, v_low_stock
  FROM public.admin_operational_preferences WHERE id = TRUE;

  SELECT COALESCE(jsonb_agg(to_jsonb(alert_row) ORDER BY priority_order, occurred_at), '[]'::JSONB) INTO v_result
  FROM (
    SELECT 'payment_expired'::TEXT type, 'high'::TEXT severity, 1 priority_order, 'Pedido pendente vencido'::TEXT title,
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' ainda precisa ser cancelado e liberar o estoque.')::TEXT detail,
      'orders'::TEXT section, o.id::TEXT resource_id, o.created_at occurred_at
    FROM public.orders o WHERE public.has_admin_permission('orders.manage') AND o.status = 'pending' AND o.reservation_expires_at < NOW()
    UNION ALL
    SELECT 'order_to_process', 'medium', 2, 'Pedido pago aguardando separacao',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' esta pago ha mais de ' || v_processing_hours || ' horas.'),
      'orders', o.id::TEXT, o.created_at FROM public.orders o
    WHERE public.has_admin_permission('orders.manage') AND o.payment_status IN ('paid', 'partially_refunded')
      AND o.fulfillment_status IN ('unfulfilled', 'processing') AND o.created_at < NOW() - make_interval(hours => v_processing_hours)
    UNION ALL
    SELECT 'shipping_failed', 'high', 1, 'Falha na emissao de etiqueta',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ': ' || COALESCE(NULLIF(o.shipping_label_error, ''), 'verifique a SuperFrete.')),
      'orders', o.id::TEXT, o.created_at FROM public.orders o
    WHERE public.has_admin_permission('shipping.manage') AND o.shipping_label_status = 'failed'
    UNION ALL
    SELECT 'return_requested', 'medium', 2, 'Nova devolucao para analisar',
      ('Pedido #' || UPPER(LEFT(r.order_id::TEXT, 8)) || ': ' || LEFT(r.reason, 160)),
      'orders', r.order_id::TEXT, r.created_at FROM public.order_returns r
    WHERE public.has_admin_permission('returns.manage') AND r.status = 'requested'
    UNION ALL
    SELECT 'financial_risk', 'high', 1,
      CASE WHEN pr.status = 'processing' THEN 'Reembolso sem conclusao' ELSE 'Reembolso com falha' END,
      ('Pedido #' || UPPER(LEFT(pr.order_id::TEXT, 8)) || ': R$ ' || TO_CHAR(pr.amount, 'FM999999990D00')),
      'orders', pr.order_id::TEXT, pr.created_at FROM public.payment_refunds pr
    WHERE public.has_admin_permission('refunds.manage') AND (pr.status = 'failed' OR (pr.status = 'processing' AND pr.created_at < NOW() - INTERVAL '5 minutes'))
    UNION ALL
    SELECT 'chargeback', 'high', 1, 'Pagamento contestado',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' exige conferencia no Mercado Pago.'),
      'orders', o.id::TEXT, o.created_at FROM public.orders o
    WHERE public.has_admin_permission('refunds.manage') AND o.payment_status = 'charged_back'
    UNION ALL
    SELECT 'notification_failed', 'medium', 2, 'E-mail nao enviado',
      ('Tipo ' || nj.type || ' para ' || regexp_replace(nj.recipient, '(^.).*(@.*$)', '\\1***\\2')),
      'health', nj.id::TEXT, COALESCE(nj.updated_at, nj.created_at) FROM public.notification_jobs nj
    WHERE public.has_admin_permission('health.read') AND nj.status = 'failed'
    UNION ALL
    SELECT 'low_stock', 'low', 3, 'Produto com estoque baixo',
      (p.name || ' · ' || p.stock_quantity || ' unidade(s)' || COALESCE(' · SKU ' || NULLIF(p.sku, ''), '')),
      'inventory', p.id::TEXT, p.created_at FROM public.products p
    WHERE public.has_admin_permission('inventory.manage') AND p.archived_at IS NULL AND p.stock_quantity <= v_low_stock
  ) alert_row;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_operational_preferences() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_update_operational_preferences(INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_operational_preferences() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owner_update_operational_preferences(INTEGER, INTEGER, INTEGER) TO authenticated, service_role;
