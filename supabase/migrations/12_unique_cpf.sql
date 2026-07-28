-- =========================================================================
-- FASE 4 - LITTLE PALM CO. UNIQUE CPF CONSTRAINT
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- Criar um index único parcial para o CPF, ignorando quando for nulo ou vazio ('')
CREATE UNIQUE INDEX IF NOT EXISTS unique_cpf_if_provided 
ON public.customers (cpf) 
WHERE cpf IS NOT NULL AND cpf <> '';
