UPDATE storage.buckets
SET public = TRUE,
    file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
WHERE id = 'product-images';

DROP POLICY IF EXISTS "Apenas admin envia imagens" ON storage.objects;
DROP POLICY IF EXISTS "Administradores enviam imagens" ON storage.objects;
DROP POLICY IF EXISTS "Administradores atualizam imagens" ON storage.objects;
DROP POLICY IF EXISTS "Administradores removem imagens" ON storage.objects;

CREATE POLICY "Administradores enviam imagens"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Administradores atualizam imagens"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Administradores removem imagens"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());
