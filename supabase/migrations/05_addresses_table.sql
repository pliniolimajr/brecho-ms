-- =========================================================================
-- FASE 4 - LITTLE Palm CO. ENDEREÇOS DOS CLIENTES (ADDRESSES)
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. CRIAÇÃO DA TABELA DE ENDEREÇOS
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR SEGURANÇA RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS PARA ENDEREÇOS
CREATE POLICY "Clientes veem seus próprios endereços" 
    ON public.addresses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Clientes podem criar seus próprios endereços" 
    ON public.addresses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes podem atualizar seus próprios endereços" 
    ON public.addresses FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Clientes podem excluir seus próprios endereços" 
    ON public.addresses FOR DELETE 
    USING (auth.uid() = user_id);
