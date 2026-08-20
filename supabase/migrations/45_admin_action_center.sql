-- BLOCO 7 - CENTRAL DE ACAO OPERACIONAL

CREATE OR REPLACE FUNCTION public.admin_action_center()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(alert_row) ORDER BY priority_order, occurred_at), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT 'payment_expired'::TEXT AS type, 'high'::TEXT AS severity, 1 AS priority_order,
      'Pedido pendente vencido'::TEXT AS title,
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' ainda precisa ser cancelado e liberar o estoque.')::TEXT AS detail,
      'orders'::TEXT AS section, o.id::TEXT AS resource_id, o.created_at AS occurred_at
    FROM public.orders o
    WHERE public.has_admin_permission('orders.manage')
      AND o.status = 'pending' AND o.reservation_expires_at < NOW()

    UNION ALL
    SELECT 'order_to_process', 'medium', 2, 'Pedido pago aguardando separacao',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' esta pago ha mais de 24 horas.'),
      'orders', o.id::TEXT, o.created_at
    FROM public.orders o
    WHERE public.has_admin_permission('orders.manage')
      AND o.payment_status IN ('paid', 'partially_refunded')
      AND o.fulfillment_status IN ('unfulfilled', 'processing')
      AND o.created_at < NOW() - INTERVAL '24 hours'

    UNION ALL
    SELECT 'shipping_failed', 'high', 1, 'Falha na emissao de etiqueta',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ': ' || COALESCE(NULLIF(o.shipping_label_error, ''), 'verifique a SuperFrete.')),
      'orders', o.id::TEXT, o.created_at
    FROM public.orders o
    WHERE public.has_admin_permission('shipping.manage') AND o.shipping_label_status = 'failed'

    UNION ALL
    SELECT 'return_requested', 'medium', 2, 'Nova devolucao para analisar',
      ('Pedido #' || UPPER(LEFT(r.order_id::TEXT, 8)) || ': ' || LEFT(r.reason, 160)),
      'orders', r.order_id::TEXT, r.created_at
    FROM public.order_returns r
    WHERE public.has_admin_permission('returns.manage') AND r.status = 'requested'

    UNION ALL
    SELECT 'financial_risk', 'high', 1,
      CASE WHEN pr.status = 'processing' THEN 'Reembolso sem conclusao' ELSE 'Reembolso com falha' END,
      ('Pedido #' || UPPER(LEFT(pr.order_id::TEXT, 8)) || ': R$ ' || TO_CHAR(pr.amount, 'FM999999990D00')),
      'orders', pr.order_id::TEXT, pr.created_at
    FROM public.payment_refunds pr
    WHERE public.has_admin_permission('refunds.manage')
      AND (pr.status = 'failed' OR (pr.status = 'processing' AND pr.created_at < NOW() - INTERVAL '5 minutes'))

    UNION ALL
    SELECT 'chargeback', 'high', 1, 'Pagamento contestado',
      ('Pedido #' || UPPER(LEFT(o.id::TEXT, 8)) || ' exige conferencia no Mercado Pago.'),
      'orders', o.id::TEXT, o.created_at
    FROM public.orders o
    WHERE public.has_admin_permission('refunds.manage') AND o.payment_status = 'charged_back'

    UNION ALL
    SELECT 'notification_failed', 'medium', 2, 'E-mail nao enviado',
      ('Tipo ' || nj.type || ' para ' || regexp_replace(nj.recipient, '(^.).*(@.*$)', '\\1***\\2')),
      'health', nj.id::TEXT, COALESCE(nj.updated_at, nj.created_at)
    FROM public.notification_jobs nj
    WHERE public.has_admin_permission('health.read') AND nj.status = 'failed'

    UNION ALL
    SELECT 'out_of_stock', 'low', 3, 'Produto sem estoque',
      (p.name || COALESCE(' · SKU ' || NULLIF(p.sku, ''), '')),
      'inventory', p.id::TEXT, p.created_at
    FROM public.products p
    WHERE public.has_admin_permission('inventory.manage')
      AND p.archived_at IS NULL AND p.stock_quantity = 0
  ) alert_row;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_action_center() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_action_center() TO authenticated, service_role;
