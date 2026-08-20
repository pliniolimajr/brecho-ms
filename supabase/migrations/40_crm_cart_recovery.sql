-- BLOCO 4 - CRM CONSOLIDADO E RECUPERACAO AUDITAVEL DE CARRINHOS

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_note TEXT,
  ADD COLUMN IF NOT EXISTS contacted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_recovery_attempts_check;
ALTER TABLE public.abandoned_carts ADD CONSTRAINT abandoned_carts_recovery_attempts_check
  CHECK (recovery_attempts BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS public.abandoned_cart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.abandoned_carts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('contacted', 'recovered', 'dismissed')),
  note TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS abandoned_cart_events_cart_created_idx
  ON public.abandoned_cart_events(cart_id, created_at DESC);
ALTER TABLE public.abandoned_cart_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores veem historico de recuperacao" ON public.abandoned_cart_events;
CREATE POLICY "Administradores veem historico de recuperacao"
ON public.abandoned_cart_events FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_crm_customers()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  WITH approved_refunds AS (
    SELECT order_id, COALESCE(SUM(amount), 0) AS amount
    FROM public.payment_refunds WHERE status = 'approved' GROUP BY order_id
  ), order_values AS (
    SELECT o.*,
      GREATEST(o.total_amount - COALESCE(ar.amount, 0), 0) AS net_amount,
      o.payment_status IN ('paid', 'partially_refunded') AS counts_as_purchase
    FROM public.orders o LEFT JOIN approved_refunds ar ON ar.order_id = o.id
  ), registered AS (
    SELECT
      c.id::TEXT AS id, c.user_id, 'customer'::TEXT AS type,
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), 'Sem nome') AS name,
      COALESCE(u.email, '') AS email, COALESCE(c.phone, '') AS phone,
      COALESCE(c.cpf, '') AS cpf, c.birth_date, c.created_at,
      COUNT(ov.id) AS orders_count,
      COUNT(ov.id) FILTER (WHERE ov.counts_as_purchase) AS paid_orders_count,
      COALESCE(SUM(ov.net_amount) FILTER (WHERE ov.counts_as_purchase), 0) AS total_spent,
      MAX(ov.created_at) FILTER (WHERE ov.counts_as_purchase) AS last_purchase_date,
      COALESCE(AVG(ov.net_amount) FILTER (WHERE ov.counts_as_purchase), 0) AS average_ticket
    FROM public.customers c
    LEFT JOIN auth.users u ON u.id = c.user_id
    LEFT JOIN order_values ov ON ov.user_id = c.user_id
    GROUP BY c.id, c.user_id, c.first_name, c.last_name, u.email, c.phone, c.cpf, c.birth_date, c.created_at
  ), guests AS (
    SELECT
      ('guest_' || md5(COALESCE(NULLIF(lower(BTRIM(o.shipping_address->>'email')), ''), NULLIF(regexp_replace(COALESCE(o.shipping_address->>'phone', ''), '\\D', '', 'g'), ''), o.id::TEXT))) AS id,
      NULL::UUID AS user_id, 'guest'::TEXT AS type,
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', o.shipping_address->>'firstName', o.shipping_address->>'lastName')), ''), 'Visitante') AS name,
      COALESCE(o.shipping_address->>'email', '') AS email,
      COALESCE(o.shipping_address->>'phone', '') AS phone,
      COALESCE(o.shipping_address->>'cpf', '') AS cpf,
      NULL::DATE AS birth_date, MIN(o.created_at) AS created_at,
      COUNT(*) AS orders_count,
      COUNT(*) FILTER (WHERE o.counts_as_purchase) AS paid_orders_count,
      COALESCE(SUM(o.net_amount) FILTER (WHERE o.counts_as_purchase), 0) AS total_spent,
      MAX(o.created_at) FILTER (WHERE o.counts_as_purchase) AS last_purchase_date,
      COALESCE(AVG(o.net_amount) FILTER (WHERE o.counts_as_purchase), 0) AS average_ticket
    FROM order_values o WHERE o.user_id IS NULL
    GROUP BY
      COALESCE(NULLIF(lower(BTRIM(o.shipping_address->>'email')), ''), NULLIF(regexp_replace(COALESCE(o.shipping_address->>'phone', ''), '\\D', '', 'g'), ''), o.id::TEXT),
      COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', o.shipping_address->>'firstName', o.shipping_address->>'lastName')), ''), 'Visitante'),
      COALESCE(o.shipping_address->>'email', ''), COALESCE(o.shipping_address->>'phone', ''), COALESCE(o.shipping_address->>'cpf', '')
  ), customers_union AS (
    SELECT * FROM registered UNION ALL SELECT * FROM guests
  )
  SELECT COALESCE(jsonb_agg(
    to_jsonb(cu) || jsonb_build_object(
      'segment', CASE
        WHEN cu.total_spent >= 1000 OR cu.paid_orders_count >= 4 THEN 'vip'
        WHEN cu.last_purchase_date < NOW() - INTERVAL '120 days' THEN 'inactive'
        WHEN cu.paid_orders_count >= 2 THEN 'recurring'
        WHEN cu.paid_orders_count = 1 THEN 'new_customer'
        ELSE 'lead'
      END
    ) ORDER BY cu.total_spent DESC, cu.created_at DESC
  ), '[]'::JSONB) INTO v_result FROM customers_union cu;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_cart_contacted(p_cart_id UUID, p_note TEXT DEFAULT NULL)
RETURNS public.abandoned_carts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_cart public.abandoned_carts%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  UPDATE public.abandoned_carts SET
    recovery_attempts = recovery_attempts + 1, last_contacted_at = NOW(),
    recovery_note = COALESCE(NULLIF(BTRIM(COALESCE(p_note, '')), ''), recovery_note), contacted_by = auth.uid()
  WHERE id = p_cart_id AND status = 'abandoned' RETURNING * INTO v_cart;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carrinho abandonado nao encontrado.'; END IF;
  INSERT INTO public.abandoned_cart_events(cart_id, event_type, note, actor_id)
  VALUES (p_cart_id, 'contacted', NULLIF(BTRIM(COALESCE(p_note, '')), ''), auth.uid());
  RETURN v_cart;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_abandoned_cart(p_cart_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS public.abandoned_carts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_cart public.abandoned_carts%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('recovered', 'dismissed') THEN RAISE EXCEPTION 'Situacao de encerramento invalida.'; END IF;
  UPDATE public.abandoned_carts SET
    status = CASE WHEN p_status = 'recovered' THEN 'recovered' ELSE 'dismissed' END,
    recovered_at = CASE WHEN p_status = 'recovered' THEN NOW() ELSE recovered_at END,
    recovery_note = COALESCE(NULLIF(BTRIM(COALESCE(p_note, '')), ''), recovery_note), contacted_by = auth.uid()
  WHERE id = p_cart_id AND status = 'abandoned' RETURNING * INTO v_cart;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carrinho abandonado nao encontrado.'; END IF;
  INSERT INTO public.abandoned_cart_events(cart_id, event_type, note, actor_id)
  VALUES (p_cart_id, p_status, NULLIF(BTRIM(COALESCE(p_note, '')), ''), auth.uid());
  RETURN v_cart;
END;
$$;

ALTER TABLE public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_safe_payload;
ALTER TABLE public.abandoned_carts ADD CONSTRAINT abandoned_carts_safe_payload CHECK (
  jsonb_typeof(cart_items) = 'array' AND jsonb_array_length(cart_items) BETWEEN 1 AND 100
  AND octet_length(cart_items::TEXT) <= 50000 AND jsonb_typeof(customer_info) = 'object'
  AND octet_length(customer_info::TEXT) <= 10000 AND total_amount BETWEEN 0 AND 1000000
  AND status IN ('abandoned', 'recovered', 'dismissed')
) NOT VALID;

REVOKE ALL ON FUNCTION public.admin_crm_customers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mark_cart_contacted(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_close_abandoned_cart(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_crm_customers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_cart_contacted(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_abandoned_cart(UUID, TEXT, TEXT) TO authenticated, service_role;
