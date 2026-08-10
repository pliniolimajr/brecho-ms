-- =========================================================================
-- INTEGRACAO DE ETIQUETAS SUPERFRETE
-- =========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_provider TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_provider_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_shipping_provider_id_idx
ON public.orders(shipping_provider, shipping_provider_id)
WHERE shipping_provider_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_shipping_label_creation(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.orders
    SET shipping_provider = 'superfrete',
        shipping_label_status = 'creating',
        shipping_label_error = NULL
    WHERE id = p_order_id
      AND status IN ('paid', 'shipped')
      AND shipping_provider_id IS NULL
      AND COALESCE(shipping_label_status, 'new') <> 'creating';

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_shipping_label_creation(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_shipping_label_creation(UUID)
TO service_role;
