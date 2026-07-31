-- =========================================================================
-- FASE 1 - RETOMADA DE PAGAMENTO E EXPIRAÇÃO DE RESERVAS
-- =========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE
DEFAULT (NOW() + INTERVAL '30 minutes');

UPDATE public.orders
SET reservation_expires_at = created_at + INTERVAL '30 minutes'
WHERE status = 'pending' AND reservation_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.attach_order_payment_url(
    p_order_id UUID,
    p_checkout_token UUID,
    p_payment_url TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_payment_url IS NULL
       OR p_payment_url !~ '^https://([a-z0-9-]+\.)*mercadopago\.com(\.br)?/' THEN
        RAISE EXCEPTION 'URL de pagamento inválida.';
    END IF;

    UPDATE public.orders
    SET payment_url = p_payment_url,
        payment_expires_at = p_expires_at,
        reservation_expires_at = p_expires_at
    WHERE id = p_order_id
      AND checkout_token = p_checkout_token
      AND status = 'pending'
      AND COALESCE(reservation_expires_at, NOW()) >= NOW();

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stock_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_expired_count INTEGER := 0;
BEGIN
    FOR v_order IN
        SELECT id, coupon_id
        FROM public.orders
        WHERE status = 'pending'
          AND reservation_expires_at IS NOT NULL
          AND reservation_expires_at <= NOW()
        ORDER BY reservation_expires_at
        FOR UPDATE SKIP LOCKED
    LOOP
        FOR v_item IN
            SELECT product_id
            FROM public.order_items
            WHERE order_id = v_order.id
            ORDER BY product_id
        LOOP
            PERFORM 1 FROM public.products
            WHERE id = v_item.product_id FOR UPDATE;

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

        UPDATE public.orders
        SET status = 'cancelled', payment_url = NULL
        WHERE id = v_order.id AND status = 'pending';

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_order_payment_url(
    UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_stock_reservations() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.attach_order_payment_url(
    UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stock_reservations()
TO anon, authenticated, service_role;
