-- =========================================================================
-- FASE 4 - LITTLE PALM CO. CUSTOMER BALANCES (STORE CREDIT)
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. ADICIONAR COLUNA DE STORE CREDIT
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_credit NUMERIC(10, 2) DEFAULT 0.00;
