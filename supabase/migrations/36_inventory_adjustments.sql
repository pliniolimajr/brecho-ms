-- BLOCO 2 - AJUSTES AUDITAVEIS DE ESTOQUE

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE OR REPLACE FUNCTION public.record_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.inventory_movements (
      product_id, previous_quantity, new_quantity, delta, reason, note, changed_by
    ) VALUES (
      NEW.id,
      COALESCE(OLD.stock_quantity, 0),
      COALESCE(NEW.stock_quantity, 0),
      COALESCE(NEW.stock_quantity, 0) - COALESCE(OLD.stock_quantity, 0),
      COALESCE(NULLIF(current_setting('app.inventory_reason', TRUE), ''), 'system_adjustment'),
      NULLIF(current_setting('app.inventory_note', TRUE), ''),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(
  p_product_id UUID,
  p_new_quantity INTEGER,
  p_reason TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_allowed_reasons CONSTANT TEXT[] := ARRAY[
    'acquisition', 'manual_correction', 'damage_or_loss', 'customer_return',
    'order_cancellation', 'physical_count'
  ];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF p_new_quantity < 0 THEN RAISE EXCEPTION 'A quantidade nao pode ser negativa.'; END IF;
  IF NOT (p_reason = ANY(v_allowed_reasons)) THEN RAISE EXCEPTION 'Motivo de ajuste invalido.'; END IF;

  PERFORM set_config('app.inventory_reason', p_reason, TRUE);
  PERFORM set_config('app.inventory_note', COALESCE(LEFT(BTRIM(p_note), 500), ''), TRUE);

  UPDATE public.products
  SET stock_quantity = p_new_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto nao encontrado.'; END IF;
  RETURN v_product;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_inventory_movements(
  p_product_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID, product_id UUID, product_name TEXT, sku TEXT,
  previous_quantity INTEGER, new_quantity INTEGER, delta INTEGER,
  reason TEXT, note TEXT, changed_by_email TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT movement.id, movement.product_id, product.name, product.sku,
    movement.previous_quantity, movement.new_quantity, movement.delta,
    movement.reason, movement.note, actor.email, movement.created_at
  FROM public.inventory_movements movement
  JOIN public.products product ON product.id = movement.product_id
  LEFT JOIN auth.users actor ON actor.id = movement.changed_by
  WHERE public.is_admin()
    AND (p_product_id IS NULL OR movement.product_id = p_product_id)
  ORDER BY movement.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_inventory(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_inventory_movements(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_movements(UUID, INTEGER) TO authenticated, service_role;

