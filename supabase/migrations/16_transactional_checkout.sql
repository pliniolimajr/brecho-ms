-- =========================================================================
-- FASE 1 - CHECKOUT E RESERVA DE ESTOQUE TRANSACIONAIS
-- =========================================================================
-- Esta migração garante que pedido, itens, cupom e estoque sejam alterados
-- juntos. Se qualquer etapa falhar, o PostgreSQL desfaz toda a operação.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS checkout_token UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE OR REPLACE FUNCTION public.create_order_with_stock_reservation(
    p_items JSONB,
    p_coupon_id UUID,
    p_shipping_cost NUMERIC,
    p_shipping_address JSONB
)
RETURNS TABLE (
    order_id UUID,
    checkout_token UUID,
    subtotal NUMERIC,
    discount_amount NUMERIC,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_product public.products%ROWTYPE;
    v_coupon public.coupons%ROWTYPE;
    v_order_id UUID;
    v_checkout_token UUID;
    v_subtotal NUMERIC(12, 2) := 0;
    v_discount NUMERIC(12, 2) := 0;
    v_total NUMERIC(12, 2);
    v_shipping NUMERIC(12, 2) := COALESCE(p_shipping_cost, 0);
    v_item_count INTEGER;
    v_unique_item_count INTEGER;
BEGIN
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho está vazio.'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_shipping_address IS NULL
       OR jsonb_typeof(p_shipping_address) <> 'object' THEN
        RAISE EXCEPTION 'O endereço de entrega é inválido.'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_shipping < 0 OR v_shipping > 10000 THEN
        RAISE EXCEPTION 'O valor do frete é inválido.'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT jsonb_array_length(p_items),
           COUNT(DISTINCT item->>'product_id')
    INTO v_item_count, v_unique_item_count
    FROM jsonb_array_elements(p_items) AS item;

    IF v_item_count <> v_unique_item_count THEN
        RAISE EXCEPTION 'O carrinho contém produtos duplicados.'
            USING ERRCODE = 'P0001';
    END IF;

    -- Ordenar os IDs mantém uma ordem de bloqueio consistente e reduz
    -- a possibilidade de deadlock entre checkouts simultâneos.
    FOR v_item IN
        SELECT item
        FROM jsonb_array_elements(p_items) AS item
        ORDER BY item->>'product_id'
    LOOP
        IF COALESCE(v_item->>'product_id', '') = ''
           OR (v_item->>'product_id') !~*
              '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Um dos produtos possui identificador inválido.'
                USING ERRCODE = 'P0001';
        END IF;

        SELECT *
        INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Um produto do carrinho não está mais disponível.'
                USING ERRCODE = 'P0001';
        END IF;

        IF COALESCE(v_product.is_sold, FALSE)
           OR COALESCE(v_product.stock_quantity, 0) <= 0 THEN
            RAISE EXCEPTION 'O produto "%" está esgotado.', v_product.name
                USING ERRCODE = 'P0001';
        END IF;

        v_subtotal := v_subtotal + v_product.price;
    END LOOP;

    IF p_coupon_id IS NOT NULL THEN
        SELECT *
        INTO v_coupon
        FROM public.coupons
        WHERE id = p_coupon_id
        FOR UPDATE;

        IF NOT FOUND
           OR NOT v_coupon.is_active
           OR v_coupon.valid_from > NOW()
           OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW())
           OR v_subtotal < v_coupon.min_purchase_amount
           OR (v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses) THEN
            RAISE EXCEPTION 'O cupom não é mais válido.'
                USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.discount_type = 'percentage' THEN
            v_discount := ROUND(v_subtotal * v_coupon.discount_value / 100, 2);
        ELSE
            v_discount := LEAST(v_coupon.discount_value, v_subtotal);
        END IF;
    END IF;

    v_total := GREATEST(0, v_subtotal + v_shipping - v_discount);
    v_checkout_token := gen_random_uuid();

    INSERT INTO public.orders (
        user_id,
        status,
        total_amount,
        payment_method,
        coupon_id,
        discount_amount,
        shipping_address,
        checkout_token
    )
    VALUES (
        auth.uid(),
        'pending',
        v_total,
        'mercado_pago',
        p_coupon_id,
        v_discount,
        p_shipping_address,
        v_checkout_token
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN
        SELECT item
        FROM jsonb_array_elements(p_items) AS item
        ORDER BY item->>'product_id'
    LOOP
        SELECT *
        INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID;

        INSERT INTO public.order_items (order_id, product_id, price)
        VALUES (v_order_id, v_product.id, v_product.price);

        UPDATE public.products
        SET stock_quantity = stock_quantity - 1,
            is_sold = (stock_quantity - 1 <= 0)
        WHERE id = v_product.id;
    END LOOP;

    IF p_coupon_id IS NOT NULL THEN
        UPDATE public.coupons
        SET used_count = used_count + 1
        WHERE id = p_coupon_id;
    END IF;

    RETURN QUERY
    SELECT
        v_order_id,
        v_checkout_token,
        v_subtotal,
        v_discount,
        v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_stock_reservation(
    p_order_id UUID,
    p_checkout_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_item RECORD;
BEGIN
    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND checkout_token = p_checkout_token
    FOR UPDATE;

    IF NOT FOUND OR v_order.status <> 'pending' THEN
        RETURN FALSE;
    END IF;

    FOR v_item IN
        SELECT product_id
        FROM public.order_items
        WHERE order_id = p_order_id
        ORDER BY product_id
    LOOP
        PERFORM 1
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + 1,
            is_sold = FALSE
        WHERE id = v_item.product_id;
    END LOOP;

    IF v_order.coupon_id IS NOT NULL THEN
        UPDATE public.coupons
        SET used_count = GREATEST(used_count - 1, 0)
        WHERE id = v_order.coupon_id;
    END IF;

    DELETE FROM public.orders
    WHERE id = p_order_id
      AND checkout_token = p_checkout_token;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_stock_reservation(
    JSONB, UUID, NUMERIC, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_order_stock_reservation(
    UUID, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservation(
    JSONB, UUID, NUMERIC, JSONB
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_order_stock_reservation(
    UUID, UUID
) TO anon, authenticated;

-- O frontend passa a usar somente as funções transacionais acima.
DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Clientes inserem itens no pedido" ON public.order_items;
DROP POLICY IF EXISTS "Permitir inserção de itens de pedido" ON public.order_items;
