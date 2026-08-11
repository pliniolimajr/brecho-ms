-- Paginação e filtros de pedidos executados no PostgreSQL.
CREATE OR REPLACE FUNCTION public.admin_list_orders(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_status TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_min_value NUMERIC DEFAULT NULL,
  p_max_value NUMERIC DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_offset INTEGER;
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  p_page := GREATEST(COALESCE(p_page, 1), 1);
  p_page_size := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset := (p_page - 1) * p_page_size;

  WITH filtered AS (
    SELECT o.*
    FROM public.orders o
    LEFT JOIN auth.users u ON u.id = o.user_id
    WHERE (p_status IS NULL OR o.status = p_status)
      AND (p_start_date IS NULL OR o.created_at >= p_start_date::TIMESTAMPTZ)
      AND (p_end_date IS NULL OR o.created_at < (p_end_date + 1)::TIMESTAMPTZ)
      AND (p_min_value IS NULL OR o.total_amount >= p_min_value)
      AND (p_max_value IS NULL OR o.total_amount <= p_max_value)
      AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
      AND (
        NULLIF(BTRIM(p_search), '') IS NULL
        OR o.id::TEXT ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(o.tracking_code, '') ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(o.shipping_address->>'firstName', '') ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(o.shipping_address->>'lastName', '') ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(o.shipping_address->>'phone', '') ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(o.shipping_address->>'email', '') ILIKE '%' || BTRIM(p_search) || '%'
        OR COALESCE(u.email, '') ILIKE '%' || BTRIM(p_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.order_items oi
          LEFT JOIN public.products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id
            AND COALESCE(p.name, '') ILIKE '%' || BTRIM(p_search) || '%'
        )
      )
  ),
  page_rows AS (
    SELECT * FROM filtered
    ORDER BY created_at DESC
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM filtered),
    'orders', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(pr) || jsonb_build_object(
          'order_items', COALESCE((
            SELECT jsonb_agg(
              to_jsonb(oi) || jsonb_build_object(
                'products', jsonb_build_object('name', p.name, 'size', p.size)
              )
            )
            FROM public.order_items oi
            LEFT JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = pr.id
          ), '[]'::JSONB)
        )
        ORDER BY pr.created_at DESC
      )
      FROM page_rows pr
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_orders(INTEGER, INTEGER, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(INTEGER, INTEGER, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT)
TO authenticated, service_role;
