-- =========================================================================
-- FASE 3 - LITTLE Palm CO. LOGÍSTICA & FULFILLMENT (SHIPPING LABEL URL)
-- Execute no SQL Editor do Supabase ou aplique as migrações
-- =========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
