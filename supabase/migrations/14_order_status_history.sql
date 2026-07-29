-- =========================================================================
-- FASE 3 - LITTLE Palm CO. E-COMMERCE
-- Rastreabilidade de Pedidos
-- Execute no SQL Editor do Supabase se necessário
-- =========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
