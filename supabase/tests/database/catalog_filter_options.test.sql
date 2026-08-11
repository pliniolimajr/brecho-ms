BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(1);

INSERT INTO public.products (id, name, tagline, description, price, category, image_url, stock_quantity, is_sold, brand, color, material)
VALUES ('92000000-0000-4000-8000-000000000001', 'Produto para filtros', '', '', 80, 'Outros', 'https://example.com/filtro.jpg', 1, FALSE, 'Marca Teste', ARRAY['Azul', 'Branco'], 'Linho');

SELECT ok(
  public.catalog_filter_options()->'brands' ? 'Marca Teste'
  AND public.catalog_filter_options()->'colors' ? 'Azul'
  AND public.catalog_filter_options()->'materials' ? 'Linho',
  'opções dinâmicas incluem os produtos disponíveis'
);

SELECT * FROM finish();
ROLLBACK;
