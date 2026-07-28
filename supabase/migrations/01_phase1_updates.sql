-- =========================================================================
-- FASE 1 - LITTLE Palm CO. E-COMMERCE
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. ATUALIZAÇÕES NA TABELA PRODUCTS
-- Adiciona os novos campos da Fase 1 e garante compatibilidade
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS measurements JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1;

-- 2. NOVA TABELA: CUSTOMERS
-- Guarda informações de cobrança e cadastro
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    cpf TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS - SEGURANÇA PARA CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes veem seus próprios dados" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clientes podem inserir seus dados" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clientes podem atualizar seus dados" ON public.customers FOR UPDATE USING (auth.uid() = user_id);

-- 4. BUCKET DE IMAGENS (Storage)
-- ATENÇÃO: Caso o comando de insert de bucket falhe, vá na interface web do Supabase > Storage, 
-- clique em 'New Bucket' e chame de 'product-images' marcando como PUBLIC.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
CREATE POLICY "Imagens visíveis para todos" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Apenas admin envia imagens" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');
