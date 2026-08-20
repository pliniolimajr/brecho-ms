-- BLOCO 2 - TRANSICOES DE PEDIDOS EM LOTE

CREATE OR REPLACE FUNCTION public.admin_bulk_transition_order_status(
  p_order_ids UUID[], p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(array_length(p_order_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um pedido.';
  END IF;
  IF array_length(p_order_ids, 1) > 100 THEN
    RAISE EXCEPTION 'O limite por operacao e de 100 pedidos.';
  END IF;

  FOREACH v_order_id IN ARRAY p_order_ids LOOP
    PERFORM public.admin_transition_order_status(v_order_id, p_new_status);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('updated', v_count, 'status', p_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_transition_order_status(UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_transition_order_status(UUID[], TEXT) TO authenticated, service_role;

