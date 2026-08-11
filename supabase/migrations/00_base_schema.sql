-- =========================================================================
-- BASE IDEMPOTENTE PARA RECONSTRUIR O PROJETO EM UM SUPABASE VAZIO
-- As tabelas abaixo existiam antes do histórico formal de migrações.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  long_description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL DEFAULT 'Outros',
  size TEXT,
  image_url TEXT NOT NULL,
  gallery TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  is_sold BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL,
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Produtos visíveis para todos" ON public.products;
CREATE POLICY "Produtos visíveis para todos"
ON public.products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Usuários veem seus próprios pedidos" ON public.orders;
CREATE POLICY "Usuários veem seus próprios pedidos"
ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.orders;
CREATE POLICY "Clientes podem criar pedidos"
ON public.orders FOR INSERT WITH CHECK (TRUE);

