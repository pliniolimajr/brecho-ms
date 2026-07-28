-- =========================================================================
-- FASE 4 - LITTLE Palm CO. RPC PARA CHECAGEM DE CPF
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- Cria uma função segura (SECURITY DEFINER) para verificar se um CPF já existe
-- sem comprometer as regras de RLS (Row Level Security) da tabela customers.
CREATE OR REPLACE FUNCTION public.check_cpf_exists(p_cpf text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.customers
    WHERE cpf = p_cpf
  );
END;
$$;
