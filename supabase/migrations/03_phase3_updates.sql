-- =========================================================================
-- FASE 3 - LITTLE PALM CO. E-COMMERCE
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. TABELA DE CUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    min_purchase_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para Cupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver cupons" 
ON public.coupons FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar cupons" 
ON public.coupons FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- RPC para incrementar contador de uso
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ALTERAÇÕES NA TABELA DE PEDIDOS (ORDERS)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL;
