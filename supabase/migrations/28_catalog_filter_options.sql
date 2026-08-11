CREATE OR REPLACE FUNCTION public.catalog_filter_options()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'brands', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT brand AS value FROM public.products WHERE NOT is_sold AND NULLIF(BTRIM(brand), '') IS NOT NULL) values_list), '[]'::JSONB),
    'colors', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT UNNEST(color) AS value FROM public.products WHERE NOT is_sold AND color IS NOT NULL) values_list WHERE NULLIF(BTRIM(value), '') IS NOT NULL), '[]'::JSONB),
    'materials', COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT material AS value FROM public.products WHERE NOT is_sold AND NULLIF(BTRIM(material), '') IS NOT NULL) values_list), '[]'::JSONB)
  );
$$;

REVOKE ALL ON FUNCTION public.catalog_filter_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_filter_options() TO anon, authenticated, service_role;
