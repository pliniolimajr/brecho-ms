-- =========================================================================
-- PERMISSOES ADMINISTRATIVAS PARA PEDIDOS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Administradores veem todos os pedidos"
ON public.orders;

CREATE POLICY "Administradores veem todos os pedidos"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Administradores atualizam pedidos"
ON public.orders;

CREATE POLICY "Administradores atualizam pedidos"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores veem todos os itens de pedido"
ON public.order_items;

CREATE POLICY "Administradores veem todos os itens de pedido"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Administradores veem todos os clientes"
ON public.customers;

CREATE POLICY "Administradores veem todos os clientes"
ON public.customers
FOR SELECT
TO authenticated
USING (public.is_admin());
