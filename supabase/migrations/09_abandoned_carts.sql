-- =========================================================================
-- FASE 4 - LITTLE Palm CO. CARRINHOS ABANDONADOS
-- Execute no SQL Editor do Supabase ou aplique as migrações
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cart_items JSONB NOT NULL,
    customer_info JSONB DEFAULT '{}'::jsonb,
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'abandoned', -- 'abandoned', 'recovered'
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_abandoned_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_abandoned_carts_updated_at_trigger ON public.abandoned_carts;
CREATE TRIGGER update_abandoned_carts_updated_at_trigger
    BEFORE UPDATE ON public.abandoned_carts
    FOR EACH ROW
    EXECUTE FUNCTION update_abandoned_carts_updated_at();

-- Habilitar RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Qualquer um pode inserir carrinho abandonado" ON public.abandoned_carts;
CREATE POLICY "Qualquer um pode inserir carrinho abandonado" 
    ON public.abandoned_carts FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Qualquer um pode atualizar seu próprio carrinho abandonado" ON public.abandoned_carts;
CREATE POLICY "Qualquer um pode atualizar seu próprio carrinho abandonado" 
    ON public.abandoned_carts FOR UPDATE 
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem ver carrinhos abandonados" ON public.abandoned_carts;
CREATE POLICY "Usuários autenticados podem ver carrinhos abandonados" 
    ON public.abandoned_carts FOR SELECT 
    TO authenticated
    USING (true);
