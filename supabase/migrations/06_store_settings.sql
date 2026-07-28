-- =========================================================================
-- FASE 2 - LITTLE PALM CO. CMS DA VITRINE (STORE SETTINGS)
-- Execute no SQL Editor do Supabase ou aplique as migrações
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura pública das configurações da loja" ON public.store_settings;
CREATE POLICY "Permitir leitura pública das configurações da loja" 
    ON public.store_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Permitir modificação para usuários autenticados" ON public.store_settings;
CREATE POLICY "Permitir modificação para usuários autenticados" 
    ON public.store_settings FOR ALL 
    USING (auth.role() = 'authenticated');

-- Inserir dados padrão (se não existirem)
INSERT INTO public.store_settings (key, value) 
VALUES ('top_bar', '{"text": "Novidades toda semana. Compre online com envio para todo o Brasil.", "visible": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.store_settings (key, value) 
VALUES ('hero_banner', '{"imageUrl": "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&q=80&w=2000", "title": "Palm Co.", "subtitle": "Descubra as últimas tendências e estilos que combinam com você. Valorize o que é bom e transforme o seu guarda-roupa com produtos exclusivos.", "tagline": "Moda Sustentável", "buttonText": "Compre Agora"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
