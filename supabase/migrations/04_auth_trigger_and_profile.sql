-- =========================================================================
-- FASE 4 - LITTLE PALM CO. AUTO USER PROFILE CREATION & NAME & PREFERENCES
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. ADICIONAR CAMPOS DE NOME E PREFERÊNCIA NA TABELA CUSTOMERS
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferences TEXT;

-- 2. FUNÇÃO E TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE APÓS SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.customers (user_id, first_name, last_name, phone, cpf, birth_date, preferences)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'first_name', ''), 
      split_part(new.raw_user_meta_data->>'full_name', ' ', 1), 
      split_part(new.raw_user_meta_data->>'name', ' ', 1), 
      ''
    ),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'last_name', ''), 
      substr(new.raw_user_meta_data->>'full_name', length(split_part(new.raw_user_meta_data->>'full_name', ' ', 1)) + 2), 
      substr(new.raw_user_meta_data->>'name', length(split_part(new.raw_user_meta_data->>'name', ' ', 1)) + 2), 
      ''
    ),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'cpf', ''),
    (NULLIF(new.raw_user_meta_data->>'birth_date', ''))::DATE,
    COALESCE(new.raw_user_meta_data->>'preferences', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que o trigger existe de forma limpa
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
