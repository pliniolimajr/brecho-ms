-- =========================================================================
-- FASE 10 - TABELA SEPARADA PARA ADMINISTRADORES (LITTLE PALM CO.)
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- 1. CRIAR TABELA DEDICADA PARA ADMINISTRADORES
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados verifiquem se são administradores
CREATE POLICY "Usuários podem verificar seu status de admin" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. COMANDO DE EXEMPLO PARA CADASTRAR UM ADMINISTRADOR:
-- Insira o ID e E-mail do usuário do auth.users que será Admin:
-- INSERT INTO public.admin_users (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'SEU_EMAIL_DE_ADMIN@exemplo.com'
-- ON CONFLICT (user_id) DO NOTHING;
