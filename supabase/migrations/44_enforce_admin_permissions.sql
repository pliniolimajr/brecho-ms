-- BLOCO 6 - APLICACAO EFETIVA DAS PERMISSOES NAS RPCS ADMINISTRATIVAS

CREATE OR REPLACE FUNCTION public.assert_admin_permission(p_permission TEXT)
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_admin_permission(p_permission) THEN
    RAISE EXCEPTION 'Sua funcao administrativa nao permite esta acao.' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- As mesmas regras valem para acesso REST direto, nao apenas para as RPCs.
DROP POLICY IF EXISTS "Administradores atualizam pedidos" ON public.orders;
CREATE POLICY "Equipe autorizada atualiza pedidos" ON public.orders FOR UPDATE TO authenticated
USING (public.has_admin_permission('orders.manage')) WITH CHECK (public.has_admin_permission('orders.manage'));

-- Nenhum cliente altera colunas sensiveis do pedido diretamente pela API REST.
-- Status e rastreio passam exclusivamente pelas RPCs validadas abaixo.
REVOKE UPDATE ON public.orders FROM anon, authenticated;

DROP POLICY IF EXISTS "Administradores gerenciam devolucoes" ON public.order_returns;
CREATE POLICY "Equipe autorizada gerencia devolucoes" ON public.order_returns FOR ALL TO authenticated
USING (public.has_admin_permission('returns.manage')) WITH CHECK (public.has_admin_permission('returns.manage'));
DROP POLICY IF EXISTS "Administradores gerenciam itens devolvidos" ON public.return_items;
CREATE POLICY "Equipe autorizada gerencia itens devolvidos" ON public.return_items FOR ALL TO authenticated
USING (public.has_admin_permission('returns.manage')) WITH CHECK (public.has_admin_permission('returns.manage'));

DROP POLICY IF EXISTS "Administradores gerenciam carrinhos abandonados" ON public.abandoned_carts;
CREATE POLICY "Equipe autorizada gerencia carrinhos abandonados" ON public.abandoned_carts FOR ALL TO authenticated
USING (public.has_admin_permission('carts.manage')) WITH CHECK (public.has_admin_permission('carts.manage'));

-- O bucket de fotos tambem faz parte do catalogo e segue a mesma permissao.
DROP POLICY IF EXISTS "Administradores enviam imagens" ON storage.objects;
DROP POLICY IF EXISTS "Administradores atualizam imagens" ON storage.objects;
DROP POLICY IF EXISTS "Administradores removem imagens" ON storage.objects;
CREATE POLICY "Equipe de catalogo envia imagens" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_admin_permission('catalog.manage'));
CREATE POLICY "Equipe de catalogo atualiza imagens" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_admin_permission('catalog.manage'))
WITH CHECK (bucket_id = 'product-images' AND public.has_admin_permission('catalog.manage'));
CREATE POLICY "Equipe de catalogo remove imagens" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_admin_permission('catalog.manage'));

-- ESTOQUE
ALTER FUNCTION public.admin_adjust_inventory(UUID, INTEGER, TEXT, TEXT) RENAME TO admin_adjust_inventory_internal;
REVOKE ALL ON FUNCTION public.admin_adjust_inventory_internal(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_adjust_inventory(p_product_id UUID, p_new_quantity INTEGER, p_reason TEXT, p_note TEXT DEFAULT NULL)
RETURNS public.products LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.products%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('inventory.manage');
  v_result := public.admin_adjust_inventory_internal(p_product_id, p_new_quantity, p_reason, p_note);
  PERFORM public.write_admin_audit('inventory_adjusted', 'product', p_product_id::TEXT,
    jsonb_build_object('new_quantity', p_new_quantity, 'reason', p_reason, 'note', p_note));
  RETURN v_result;
END; $$;

ALTER FUNCTION public.admin_list_inventory_movements(UUID, INTEGER) RENAME TO admin_list_inventory_movements_internal;
REVOKE ALL ON FUNCTION public.admin_list_inventory_movements_internal(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_list_inventory_movements(p_product_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100)
RETURNS TABLE(id UUID, product_id UUID, product_name TEXT, sku TEXT, previous_quantity INTEGER,
  new_quantity INTEGER, delta INTEGER, reason TEXT, note TEXT, changed_by_email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.assert_admin_permission('catalog.read');
  RETURN QUERY SELECT * FROM public.admin_list_inventory_movements_internal(p_product_id, p_limit);
END; $$;

-- PEDIDOS E LINHA DO TEMPO
ALTER FUNCTION public.admin_list_orders(INTEGER, INTEGER, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT) RENAME TO admin_list_orders_internal;
REVOKE ALL ON FUNCTION public.admin_list_orders_internal(INTEGER, INTEGER, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_list_orders(p_page INTEGER DEFAULT 1, p_page_size INTEGER DEFAULT 20, p_status TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL, p_min_value NUMERIC DEFAULT NULL,
  p_max_value NUMERIC DEFAULT NULL, p_payment_method TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.assert_admin_permission('orders.read');
  RETURN public.admin_list_orders_internal(p_page, p_page_size, p_status, p_start_date, p_end_date, p_min_value, p_max_value, p_payment_method, p_search);
END; $$;

ALTER FUNCTION public.admin_transition_order_status(UUID, TEXT) RENAME TO admin_transition_order_status_internal;
REVOKE ALL ON FUNCTION public.admin_transition_order_status_internal(UUID, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_transition_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.orders%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('orders.manage');
  v_result := public.admin_transition_order_status_internal(p_order_id, p_new_status);
  PERFORM public.write_admin_audit('order_status_changed', 'order', p_order_id::TEXT, jsonb_build_object('status', p_new_status));
  RETURN v_result;
END; $$;

ALTER FUNCTION public.admin_bulk_transition_order_status(UUID[], TEXT) RENAME TO admin_bulk_transition_order_status_internal;
REVOKE ALL ON FUNCTION public.admin_bulk_transition_order_status_internal(UUID[], TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_bulk_transition_order_status(p_order_ids UUID[], p_new_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM public.assert_admin_permission('orders.manage');
  v_result := public.admin_bulk_transition_order_status_internal(p_order_ids, p_new_status);
  PERFORM public.write_admin_audit('bulk_order_status_changed', 'order_batch', NULL,
    jsonb_build_object('order_ids', p_order_ids, 'status', p_new_status));
  RETURN v_result;
END; $$;

ALTER FUNCTION public.admin_get_order_events(UUID) RENAME TO admin_get_order_events_internal;
REVOKE ALL ON FUNCTION public.admin_get_order_events_internal(UUID) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_get_order_events(p_order_id UUID)
RETURNS SETOF public.order_events LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.assert_admin_permission('orders.read');
  RETURN QUERY SELECT * FROM public.admin_get_order_events_internal(p_order_id);
END; $$;

ALTER FUNCTION public.admin_add_order_event(UUID, TEXT, TEXT, JSONB) RENAME TO admin_add_order_event_internal;
REVOKE ALL ON FUNCTION public.admin_add_order_event_internal(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_add_order_event(p_order_id UUID, p_event_type TEXT, p_title TEXT, p_details JSONB DEFAULT '{}'::JSONB)
RETURNS public.order_events LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.order_events%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('orders.manage');
  v_result := public.admin_add_order_event_internal(p_order_id, p_event_type, p_title, p_details);
  PERFORM public.write_admin_audit('order_event_added', 'order', p_order_id::TEXT, jsonb_build_object('event_type', p_event_type));
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(p_order_id UUID, p_tracking_code TEXT)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.orders%ROWTYPE; v_code TEXT := UPPER(BTRIM(COALESCE(p_tracking_code, '')));
BEGIN
  PERFORM public.assert_admin_permission('shipping.manage');
  IF v_code = '' OR LENGTH(v_code) > 80 THEN RAISE EXCEPTION 'Codigo de rastreio invalido.'; END IF;
  UPDATE public.orders SET tracking_code = v_code WHERE id = p_order_id RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  PERFORM public.admin_add_order_event_internal(p_order_id, 'admin_action', 'Codigo de rastreio atualizado',
    jsonb_build_object('description', 'Codigo: ' || v_code));
  PERFORM public.write_admin_audit('order_tracking_updated', 'order', p_order_id::TEXT, jsonb_build_object('tracking_code', v_code));
  RETURN v_result;
END; $$;

-- POS-VENDA
ALTER FUNCTION public.admin_get_order_post_sale(UUID) RENAME TO admin_get_order_post_sale_internal;
REVOKE ALL ON FUNCTION public.admin_get_order_post_sale_internal(UUID) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_get_order_post_sale(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.assert_admin_permission('orders.read'); RETURN public.admin_get_order_post_sale_internal(p_order_id); END; $$;

ALTER FUNCTION public.admin_create_order_return(UUID, TEXT, UUID[], TEXT) RENAME TO admin_create_order_return_internal;
REVOKE ALL ON FUNCTION public.admin_create_order_return_internal(UUID, TEXT, UUID[], TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_create_order_return(p_order_id UUID, p_reason TEXT, p_order_item_ids UUID[], p_internal_note TEXT DEFAULT NULL)
RETURNS public.order_returns LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.order_returns%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('returns.manage');
  v_result := public.admin_create_order_return_internal(p_order_id, p_reason, p_order_item_ids, p_internal_note);
  PERFORM public.write_admin_audit('return_created', 'order_return', v_result.id::TEXT, jsonb_build_object('order_id', p_order_id));
  RETURN v_result;
END; $$;

ALTER FUNCTION public.admin_transition_order_return(UUID, TEXT, BOOLEAN, TEXT) RENAME TO admin_transition_order_return_internal;
REVOKE ALL ON FUNCTION public.admin_transition_order_return_internal(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_transition_order_return(p_return_id UUID, p_new_status TEXT, p_restock BOOLEAN DEFAULT FALSE, p_internal_note TEXT DEFAULT NULL)
RETURNS public.order_returns LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.order_returns%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('returns.manage');
  v_result := public.admin_transition_order_return_internal(p_return_id, p_new_status, p_restock, p_internal_note);
  PERFORM public.write_admin_audit('return_status_changed', 'order_return', p_return_id::TEXT,
    jsonb_build_object('status', p_new_status, 'restocked', p_restock));
  RETURN v_result;
END; $$;

-- CRM E CARRINHOS
ALTER FUNCTION public.admin_crm_customers() RENAME TO admin_crm_customers_internal;
REVOKE ALL ON FUNCTION public.admin_crm_customers_internal() FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_crm_customers() RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.assert_admin_permission('customers.read'); RETURN public.admin_crm_customers_internal(); END; $$;

ALTER FUNCTION public.admin_mark_cart_contacted(UUID, TEXT) RENAME TO admin_mark_cart_contacted_internal;
REVOKE ALL ON FUNCTION public.admin_mark_cart_contacted_internal(UUID, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_mark_cart_contacted(p_cart_id UUID, p_note TEXT DEFAULT NULL)
RETURNS public.abandoned_carts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.abandoned_carts%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('carts.manage');
  v_result := public.admin_mark_cart_contacted_internal(p_cart_id, p_note);
  PERFORM public.write_admin_audit('cart_contacted', 'abandoned_cart', p_cart_id::TEXT, jsonb_build_object('note', p_note));
  RETURN v_result;
END; $$;

ALTER FUNCTION public.admin_close_abandoned_cart(UUID, TEXT, TEXT) RENAME TO admin_close_abandoned_cart_internal;
REVOKE ALL ON FUNCTION public.admin_close_abandoned_cart_internal(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_close_abandoned_cart(p_cart_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS public.abandoned_carts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result public.abandoned_carts%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_permission('carts.manage');
  v_result := public.admin_close_abandoned_cart_internal(p_cart_id, p_status, p_note);
  PERFORM public.write_admin_audit('cart_closed', 'abandoned_cart', p_cart_id::TEXT, jsonb_build_object('status', p_status));
  RETURN v_result;
END; $$;

-- RELATORIOS E SAUDE
ALTER FUNCTION public.admin_sales_report(DATE, DATE) RENAME TO admin_sales_report_internal;
REVOKE ALL ON FUNCTION public.admin_sales_report_internal(DATE, DATE) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_sales_report(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.assert_admin_permission('reports.read'); RETURN public.admin_sales_report_internal(p_start_date, p_end_date); END; $$;

ALTER FUNCTION public.admin_operational_health() RENAME TO admin_operational_health_internal;
REVOKE ALL ON FUNCTION public.admin_operational_health_internal() FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_operational_health() RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.assert_admin_permission('health.read'); RETURN public.admin_operational_health_internal(); END; $$;

ALTER FUNCTION public.admin_financial_risk_cases() RENAME TO admin_financial_risk_cases_internal;
REVOKE ALL ON FUNCTION public.admin_financial_risk_cases_internal() FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.admin_financial_risk_cases() RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.assert_admin_permission('health.read'); RETURN public.admin_financial_risk_cases_internal(); END; $$;

REVOKE ALL ON FUNCTION public.assert_admin_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_admin_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_movements(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(INTEGER, INTEGER, TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_transition_order_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_transition_order_status(UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_order_events(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_order_event(UUID, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_order_tracking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_order_post_sale(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_order_return(UUID, TEXT, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_transition_order_return(UUID, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_crm_customers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_cart_contacted(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_abandoned_cart(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_sales_report(DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_operational_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_financial_risk_cases() TO authenticated, service_role;
