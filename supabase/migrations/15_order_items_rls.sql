-- =========================================================================
-- FASE 2 FIX - LITTLE Palm CO. E-COMMERCE
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- O RLS (Row Level Security) da tabela order_items estava bloqueando 
-- a inserção dos itens do pedido pelo cliente.

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Permitir leitura dos itens caso o usuário seja dono do pedido
CREATE POLICY "Usuários podem ver seus próprios itens de pedido"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
);

-- Permitir inserção de itens de pedido (liberado para insert)
-- Assim o checkout conseguirá salvar os itens de forma atômica
CREATE POLICY "Permitir inserção de itens de pedido"
ON public.order_items FOR INSERT
WITH CHECK (true);

-- Para segurança do painel admin, permitir tudo para role = service_role ou anon para casos específicos
-- Mas o true no insert já cobre o anon/authenticated
