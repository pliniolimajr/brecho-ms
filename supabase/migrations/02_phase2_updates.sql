-- =========================================================================
-- FASE 2 - LITTLE Palm CO. E-COMMERCE
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- 1. TABELA WISHLIST
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- RLS para Wishlist
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem sua própria wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários adicionam à sua própria wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários removem da sua própria wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);

-- 2. TABELA REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados criam reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam seus próprios reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários deletam seus próprios reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);
