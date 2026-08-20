-- BLOCO 4 - SESSOES SEGURAS PARA CARRINHOS ABANDONADOS

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS edit_token UUID DEFAULT gen_random_uuid();
UPDATE public.abandoned_carts SET edit_token = gen_random_uuid() WHERE edit_token IS NULL;
ALTER TABLE public.abandoned_carts ALTER COLUMN edit_token SET DEFAULT gen_random_uuid();
ALTER TABLE public.abandoned_carts ALTER COLUMN edit_token SET NOT NULL;

DROP POLICY IF EXISTS "Qualquer um pode inserir carrinho abandonado" ON public.abandoned_carts;
DROP POLICY IF EXISTS "Qualquer um pode atualizar seu próprio carrinho abandonado" ON public.abandoned_carts;
DROP POLICY IF EXISTS "Administradores gerenciam carrinhos abandonados" ON public.abandoned_carts;
CREATE POLICY "Administradores gerenciam carrinhos abandonados"
ON public.abandoned_carts FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.abandoned_carts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_abandoned_cart(
  p_cart_id UUID,
  p_edit_token UUID,
  p_cart_items JSONB,
  p_customer_info JSONB,
  p_total_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_cart public.abandoned_carts%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  IF p_cart_id IS NULL OR p_edit_token IS NULL THEN RAISE EXCEPTION 'Sessao do carrinho invalida.'; END IF;
  IF jsonb_typeof(p_cart_items) <> 'array' OR jsonb_array_length(p_cart_items) NOT BETWEEN 1 AND 100
    OR octet_length(p_cart_items::TEXT) > 50000 THEN RAISE EXCEPTION 'Itens do carrinho invalidos.'; END IF;
  IF jsonb_typeof(p_customer_info) <> 'object' OR octet_length(p_customer_info::TEXT) > 10000 THEN
    RAISE EXCEPTION 'Dados do cliente invalidos.';
  END IF;
  IF p_total_amount < 0 OR p_total_amount > 1000000 THEN RAISE EXCEPTION 'Valor do carrinho invalido.'; END IF;

  SELECT * INTO v_cart FROM public.abandoned_carts WHERE id = p_cart_id FOR UPDATE;
  IF FOUND THEN
    IF v_cart.edit_token <> p_edit_token THEN
      RAISE EXCEPTION 'Sessao do carrinho nao autorizada.' USING ERRCODE = '42501';
    END IF;
    IF v_cart.status <> 'abandoned' THEN RETURN v_cart.id; END IF;
    UPDATE public.abandoned_carts SET
      user_id = COALESCE(v_user_id, user_id), cart_items = p_cart_items,
      customer_info = p_customer_info, total_amount = p_total_amount
    WHERE id = p_cart_id;
  ELSE
    INSERT INTO public.abandoned_carts(id, edit_token, user_id, cart_items, customer_info, total_amount, status)
    VALUES (p_cart_id, p_edit_token, v_user_id, p_cart_items, p_customer_info, p_total_amount, 'abandoned');
  END IF;
  RETURN p_cart_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_abandoned_cart(
  p_cart_id UUID,
  p_edit_token UUID,
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_cart public.abandoned_carts%ROWTYPE;
BEGIN
  SELECT * INTO v_cart FROM public.abandoned_carts WHERE id = p_cart_id FOR UPDATE;
  IF NOT FOUND OR v_cart.edit_token <> p_edit_token THEN
    RAISE EXCEPTION 'Sessao do carrinho nao autorizada.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  UPDATE public.abandoned_carts SET status = 'recovered', order_id = p_order_id, recovered_at = NOW()
  WHERE id = p_cart_id AND status = 'abandoned';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.save_abandoned_cart(UUID, UUID, JSONB, JSONB, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recover_abandoned_cart(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_abandoned_cart(UUID, UUID, JSONB, JSONB, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_abandoned_cart(UUID, UUID, UUID) TO anon, authenticated;
