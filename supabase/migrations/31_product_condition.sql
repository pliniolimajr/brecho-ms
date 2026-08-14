-- Estado de conservação informado pela curadoria.
-- Produtos existentes permanecem sem classificação até revisão humana.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS condition_notes TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_condition_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_condition_check
  CHECK (
    condition IS NULL OR condition IN (
      'new_with_tags',
      'new_without_tags',
      'excellent',
      'very_good',
      'good'
    )
  );

COMMENT ON COLUMN public.products.condition IS
  'Classificação humana do estado de conservação da peça.';

COMMENT ON COLUMN public.products.condition_notes IS
  'Marcas de uso, particularidades e observações relevantes para a compra.';
