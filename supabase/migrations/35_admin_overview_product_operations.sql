-- BLOCO 2 - VISAO GERAL E DADOS COMERCIAIS DO PRODUTO

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS acquired_at DATE;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_acquisition_cost_check;
ALTER TABLE public.products ADD CONSTRAINT products_acquisition_cost_check
  CHECK (acquisition_cost IS NULL OR acquisition_cost >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
  ON public.products (UPPER(sku))
  WHERE sku IS NOT NULL AND BTRIM(sku) <> '';

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
      'last_7_days', COALESCE(SUM(total_amount) FILTER (
        WHERE payment_status IN ('paid', 'partially_refunded')
          AND created_at >= NOW() - INTERVAL '7 days'
      ), 0),
      'paid_last_7_days', COUNT(*) FILTER (
        WHERE payment_status IN ('paid', 'partially_refunded')
          AND created_at >= NOW() - INTERVAL '7 days'
      )
    )
  ) INTO v_result
  FROM public.orders;

  v_result := v_result || jsonb_build_object(
    'inventory', jsonb_build_object(
      'available', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NULL AND stock_quantity > 0),
      'out_of_stock', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NULL AND stock_quantity = 0),
      'archived', (SELECT COUNT(*) FROM public.products WHERE archived_at IS NOT NULL)
    ),
    'alerts', jsonb_build_object(
      'email_failures', (SELECT COUNT(*) FROM public.notification_jobs WHERE status = 'failed'),
      'shipping_failures', (SELECT COUNT(*) FROM public.orders WHERE shipping_label_status = 'failed'),
      'stale_payments', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending' AND reservation_expires_at < NOW())
    )
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated, service_role;
