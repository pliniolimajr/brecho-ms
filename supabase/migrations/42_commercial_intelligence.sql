-- BLOCO 5 - INTELIGENCIA COMERCIAL E RELATORIOS CONSOLIDADOS

CREATE OR REPLACE FUNCTION public.admin_sales_report(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start TIMESTAMPTZ := COALESCE(p_start_date::TIMESTAMPTZ, NOW() - INTERVAL '30 days');
  v_end TIMESTAMPTZ := COALESCE((p_end_date + 1)::TIMESTAMPTZ, NOW());
  v_duration INTERVAL;
  v_previous_start TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF v_start >= v_end THEN RAISE EXCEPTION 'Periodo do relatorio invalido.'; END IF;
  IF v_end - v_start > INTERVAL '10 years' THEN RAISE EXCEPTION 'Periodo do relatorio muito amplo.'; END IF;
  v_duration := v_end - v_start;
  v_previous_start := v_start - v_duration;

  WITH refunds AS (
    SELECT order_id, COALESCE(SUM(amount), 0) AS amount
    FROM public.payment_refunds WHERE status = 'approved' GROUP BY order_id
  ), eligible_orders AS (
    SELECT o.*, COALESCE(r.amount, 0) AS refunded_amount,
      GREATEST(o.total_amount - COALESCE(r.amount, 0), 0) AS net_amount
    FROM public.orders o LEFT JOIN refunds r ON r.order_id = o.id
    WHERE o.payment_status IN ('paid', 'partially_refunded', 'refunded')
  ), current_orders AS (
    SELECT * FROM eligible_orders WHERE created_at >= v_start AND created_at < v_end
  ), previous_orders AS (
    SELECT * FROM eligible_orders WHERE created_at >= v_previous_start AND created_at < v_start
  ), current_cogs AS (
    SELECT COALESCE(SUM(COALESCE(p.acquisition_cost, 0)), 0) AS amount
    FROM current_orders o JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.products p ON p.id = oi.product_id WHERE o.net_amount > 0
  ), customer_orders AS (
    SELECT COALESCE(o.user_id::TEXT, lower(NULLIF(BTRIM(o.shipping_address->>'email'), '')),
      regexp_replace(COALESCE(o.shipping_address->>'phone', ''), '\D', '', 'g'), o.id::TEXT) AS customer_key,
      COUNT(*) AS purchase_count
    FROM current_orders o WHERE o.net_amount > 0 GROUP BY 1
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start', v_start, 'end', v_end, 'previous_start', v_previous_start),
    'summary', jsonb_build_object(
      'gross_revenue', COALESCE((SELECT SUM(total_amount) FROM current_orders), 0),
      'net_revenue', COALESCE((SELECT SUM(net_amount) FROM current_orders), 0),
      'refunds', COALESCE((SELECT SUM(refunded_amount) FROM current_orders), 0),
      'acquisition_cost', (SELECT amount FROM current_cogs),
      'estimated_margin', COALESCE((SELECT SUM(net_amount) FROM current_orders), 0) - (SELECT amount FROM current_cogs),
      'paid_orders', (SELECT COUNT(*) FROM current_orders WHERE net_amount > 0),
      'average_ticket', COALESCE((SELECT AVG(net_amount) FROM current_orders WHERE net_amount > 0), 0),
      'cancelled_orders', (SELECT COUNT(*) FROM public.orders WHERE created_at >= v_start AND created_at < v_end AND order_status = 'cancelled'),
      'repeat_rate', COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE purchase_count >= 2) / NULLIF(COUNT(*), 0), 2) FROM customer_orders), 0)
    ),
    'comparison', jsonb_build_object(
      'previous_net_revenue', COALESCE((SELECT SUM(net_amount) FROM previous_orders), 0),
      'previous_paid_orders', (SELECT COUNT(*) FROM previous_orders WHERE net_amount > 0)
    ),
    'funnel', jsonb_build_object(
      'carts', (SELECT COUNT(*) FROM public.abandoned_carts WHERE created_at >= v_start AND created_at < v_end),
      'orders', (SELECT COUNT(*) FROM public.orders WHERE created_at >= v_start AND created_at < v_end),
      'paid', (SELECT COUNT(*) FROM current_orders WHERE net_amount > 0),
      'recovered_carts', (SELECT COUNT(*) FROM public.abandoned_carts WHERE recovered_at >= v_start AND recovered_at < v_end)
    ),
    'payment_methods', COALESCE((SELECT jsonb_agg(x ORDER BY x.orders DESC) FROM (
      SELECT COALESCE(payment_method, 'nao_informado') AS method, COUNT(*) AS orders, COALESCE(SUM(net_amount), 0) AS revenue
      FROM current_orders WHERE net_amount > 0 GROUP BY 1
    ) x), '[]'::JSONB),
    'top_products', COALESCE((SELECT jsonb_agg(x ORDER BY x.quantity DESC, x.revenue DESC) FROM (
      SELECT p.id AS product_id, p.name, COUNT(*) AS quantity, COALESCE(SUM(oi.price), 0) AS revenue,
        COALESCE(SUM(p.acquisition_cost), 0) AS acquisition_cost,
        COALESCE(SUM(oi.price - COALESCE(p.acquisition_cost, 0)), 0) AS estimated_margin
      FROM current_orders o JOIN public.order_items oi ON oi.order_id = o.id
      LEFT JOIN public.products p ON p.id = oi.product_id WHERE o.net_amount > 0
      GROUP BY p.id, p.name ORDER BY COUNT(*) DESC, COALESCE(SUM(oi.price), 0) DESC LIMIT 10
    ) x), '[]'::JSONB),
    'coupon_performance', COALESCE((SELECT jsonb_agg(x ORDER BY x.orders DESC) FROM (
      SELECT c.id AS coupon_id, c.code, COUNT(o.id) AS orders,
        COALESCE(SUM(o.discount_amount), 0) AS discount_granted,
        COALESCE(SUM(GREATEST(o.total_amount - COALESCE(r.amount, 0), 0)), 0) AS net_revenue
      FROM public.coupons c LEFT JOIN public.orders o ON o.coupon_id = c.id
        AND o.created_at >= v_start AND o.created_at < v_end
        AND o.payment_status IN ('paid', 'partially_refunded', 'refunded')
      LEFT JOIN refunds r ON r.order_id = o.id GROUP BY c.id, c.code
    ) x), '[]'::JSONB),
    'timeline', COALESCE((SELECT jsonb_agg(x ORDER BY x."day") FROM (
      SELECT date_trunc('day', created_at)::DATE AS "day",
        COALESCE(SUM(net_amount), 0) AS net_revenue, COUNT(*) AS orders
      FROM current_orders GROUP BY 1
    ) x), '[]'::JSONB)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sales_report(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_sales_report(DATE, DATE) TO authenticated, service_role;
