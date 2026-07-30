-- =========================================================================
-- FASE 1 - PROCESSAMENTO TRANSACIONAL E IDEMPOTENTE DE PAGAMENTOS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_key TEXT UNIQUE NOT NULL,
    payment_id TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    payment_status TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_events_order_id_idx
ON public.payment_events(order_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.process_payment_event(
    p_order_id UUID,
    p_payment_id TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_payload JSONB
)
RETURNS TABLE (
    processed BOOLEAN,
    resulting_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_event_key TEXT;
    v_new_status TEXT;
    v_item RECORD;
BEGIN
    IF COALESCE(p_payment_id, '') = '' THEN
        RAISE EXCEPTION 'Identificador do pagamento ausente.';
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    v_event_key := p_payment_id || ':' || p_payment_status;

    INSERT INTO public.payment_events (
        event_key,
        payment_id,
        order_id,
        payment_status,
        payload
    )
    VALUES (
        v_event_key,
        p_payment_id,
        p_order_id,
        p_payment_status,
        p_payload
    )
    ON CONFLICT (event_key) DO NOTHING;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, v_order.status;
        RETURN;
    END IF;

    v_new_status := CASE
        WHEN p_payment_status = 'approved' THEN 'paid'
        WHEN p_payment_status IN ('cancelled', 'rejected', 'refunded', 'charged_back')
            THEN 'cancelled'
        ELSE 'pending'
    END;

    UPDATE public.orders
    SET status = v_new_status,
        payment_method = COALESCE(NULLIF(p_payment_method, ''), payment_method)
    WHERE id = p_order_id;

    -- Uma rejeição enquanto o pedido ainda estava pendente libera a reserva.
    -- Estornos posteriores ao pagamento não recolocam automaticamente um
    -- produto no catálogo, pois isso depende da devolução física.
    IF v_new_status = 'cancelled' AND v_order.status = 'pending' THEN
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
    END IF;

    RETURN QUERY SELECT TRUE, v_new_status;
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment_event(
    UUID, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_payment_event(
    UUID, TEXT, TEXT, TEXT, JSONB
) TO service_role;
