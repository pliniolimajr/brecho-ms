-- Permite que somente contas registradas em public.admin_users gerenciem o catálogo.
-- A leitura pública dos produtos continua sendo controlada pela policy existente.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.products FROM anon;
GRANT INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;

DROP POLICY IF EXISTS "Apenas admin modifica produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores inserem produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores atualizam produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores excluem produtos" ON public.products;

CREATE POLICY "Administradores inserem produtos"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Administradores atualizam produtos"
ON public.products
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Administradores excluem produtos"
ON public.products
FOR DELETE
TO authenticated
USING (public.is_admin());
