-- BLOCO 3 - POS-VENDA: DEVOLUCOES, REEMBOLSOS E REPOSICAO DE ESTOQUE

CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'received', 'completed', 'rejected', 'cancelled')),
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  internal_note TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.order_returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  restocked_at TIMESTAMPTZ,
  UNIQUE (return_id, order_item_id)
);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  return_id UUID REFERENCES public.order_returns(id) ON DELETE SET NULL,
  payment_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'approved', 'failed')),
  provider_refund_id TEXT,
  idempotency_key UUID NOT NULL UNIQUE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS order_returns_order_created_idx
  ON public.order_returns(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS return_items_return_idx
  ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS payment_refunds_order_created_idx
  ON public.payment_refunds(order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_provider_id_unique_idx
  ON public.payment_refunds(provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administradores gerenciam devolucoes" ON public.order_returns;
CREATE POLICY "Administradores gerenciam devolucoes"
ON public.order_returns FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores gerenciam itens devolvidos" ON public.return_items;
CREATE POLICY "Administradores gerenciam itens devolvidos"
ON public.return_items FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores consultam reembolsos" ON public.payment_refunds;
CREATE POLICY "Administradores consultam reembolsos"
ON public.payment_refunds FOR SELECT TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_get_order_post_sale(p_order_id UUID)
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
    'returns', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object('items', COALESCE((
        SELECT jsonb_agg(to_jsonb(ri) || jsonb_build_object(
          'product_name', p.name,
          'product_id', oi.product_id
        ))
        FROM public.return_items ri
        JOIN public.order_items oi ON oi.id = ri.order_item_id
        LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE ri.return_id = r.id
      ), '[]'::JSONB)) ORDER BY r.created_at DESC)
      FROM public.order_returns r WHERE r.order_id = p_order_id
    ), '[]'::JSONB),
    'refunds', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.created_at DESC)
      FROM public.payment_refunds pr WHERE pr.order_id = p_order_id
    ), '[]'::JSONB),
    'refundable_amount', GREATEST(
      COALESCE((SELECT total_amount FROM public.orders WHERE id = p_order_id), 0) -
      COALESCE((SELECT SUM(amount) FROM public.payment_refunds WHERE order_id = p_order_id AND status = 'approved'), 0),
      0
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_order_return(
  p_order_id UUID,
  p_reason TEXT,
  p_order_item_ids UUID[],
  p_internal_note TEXT DEFAULT NULL
)
RETURNS public.order_returns
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_return public.order_returns%ROWTYPE;
  v_expected INTEGER;
  v_valid INTEGER;
  v_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Pedido nao encontrado.';
  END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo da devolucao.';
  END IF;

  SELECT COUNT(DISTINCT value) INTO v_expected FROM unnest(COALESCE(p_order_item_ids, ARRAY[]::UUID[])) value;
  SELECT COUNT(*) INTO v_valid
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id AND oi.id = ANY(COALESCE(p_order_item_ids, ARRAY[]::UUID[]));
  IF v_expected = 0 OR v_valid <> v_expected THEN
    RAISE EXCEPTION 'Selecione itens validos deste pedido.';
  END IF;

  INSERT INTO public.order_returns(order_id, reason, internal_note, requested_by)
  VALUES (p_order_id, btrim(p_reason), NULLIF(btrim(COALESCE(p_internal_note, '')), ''), auth.uid())
  RETURNING * INTO v_return;

  INSERT INTO public.return_items(return_id, order_item_id)
  SELECT v_return.id, value FROM unnest(p_order_item_ids) value;

  UPDATE public.orders SET return_status = 'requested' WHERE id = p_order_id;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.order_events(order_id, event_type, title, details, actor_id, actor_email)
  VALUES (p_order_id, 'return_requested', 'Devolucao registrada',
    jsonb_build_object('return_id', v_return.id, 'reason', v_return.reason, 'item_count', v_expected),
    auth.uid(), v_email);
  RETURN v_return;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transition_order_return(
  p_return_id UUID,
  p_new_status TEXT,
  p_restock BOOLEAN DEFAULT FALSE,
  p_internal_note TEXT DEFAULT NULL
)
RETURNS public.order_returns
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_return public.order_returns%ROWTYPE;
  v_email TEXT;
  v_item RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_return FROM public.order_returns WHERE id = p_return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devolucao nao encontrada.'; END IF;
  IF NOT (
    (v_return.status = 'requested' AND p_new_status IN ('approved', 'rejected', 'cancelled')) OR
    (v_return.status = 'approved' AND p_new_status IN ('received', 'cancelled')) OR
    (v_return.status = 'received' AND p_new_status = 'completed') OR
    p_new_status = v_return.status
  ) THEN
    RAISE EXCEPTION 'Transicao de devolucao de % para % nao permitida.', v_return.status, p_new_status;
  END IF;
  IF p_restock AND p_new_status NOT IN ('received', 'completed') THEN
    RAISE EXCEPTION 'O estoque so pode ser reposto apos o recebimento fisico.';
  END IF;

  IF p_restock THEN
    FOR v_item IN
      SELECT ri.id, oi.product_id
      FROM public.return_items ri JOIN public.order_items oi ON oi.id = ri.order_item_id
      WHERE ri.return_id = p_return_id AND ri.restocked_at IS NULL
      FOR UPDATE OF ri
    LOOP
      PERFORM set_config('app.inventory_reason', 'customer_return', TRUE);
      UPDATE public.products SET stock_quantity = stock_quantity + 1 WHERE id = v_item.product_id;
      UPDATE public.return_items SET restocked_at = NOW() WHERE id = v_item.id;
    END LOOP;
  END IF;

  UPDATE public.order_returns SET
    status = p_new_status,
    internal_note = COALESCE(NULLIF(btrim(COALESCE(p_internal_note, '')), ''), internal_note),
    processed_by = auth.uid(), updated_at = NOW()
  WHERE id = p_return_id RETURNING * INTO v_return;

  UPDATE public.orders SET return_status = p_new_status WHERE id = v_return.order_id;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.order_events(order_id, event_type, title, details, actor_id, actor_email)
  VALUES (v_return.order_id, 'return_status_changed', 'Devolucao atualizada para ' || p_new_status,
    jsonb_build_object('return_id', p_return_id, 'restocked', p_restock), auth.uid(), v_email);
  RETURN v_return;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_order_post_sale(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_order_return(UUID, TEXT, UUID[], TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_transition_order_return(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_order_post_sale(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_order_return(UUID, TEXT, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_transition_order_return(UUID, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;
