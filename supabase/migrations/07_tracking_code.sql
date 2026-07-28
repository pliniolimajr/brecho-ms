-- =========================================================================
-- FASE 3 - LITTLE PALM CO. LOGÍSTICA & FULFILLMENT (TRACKING CODE)
-- Execute no SQL Editor do Supabase ou aplique as migrações
-- =========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT DEFAULT 'Correios';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_service TEXT; -- PAC, SEDEX, etc.
