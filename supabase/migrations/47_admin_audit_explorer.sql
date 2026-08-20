-- BLOCO 7 - EXPLORADOR DE AUDITORIA ADMINISTRATIVA

CREATE OR REPLACE FUNCTION public.admin_list_audit(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_action TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_total BIGINT;
  v_items JSONB;
BEGIN
  IF NOT public.has_admin_permission('audit.read') THEN
    RAISE EXCEPTION 'Somente o proprietario consulta a auditoria.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.admin_audit_log log
  LEFT JOIN auth.users actor ON actor.id = log.actor_id
  WHERE (p_action IS NULL OR p_action = '' OR log.action = p_action)
    AND (p_start_date IS NULL OR log.created_at >= p_start_date::TIMESTAMPTZ)
    AND (p_end_date IS NULL OR log.created_at < (p_end_date + 1)::TIMESTAMPTZ)
    AND (p_search IS NULL OR p_search = '' OR
      log.resource_id ILIKE '%' || p_search || '%' OR
      log.resource_type ILIKE '%' || p_search || '%' OR
      actor.email ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.created_at DESC), '[]'::JSONB)
  INTO v_items
  FROM (
    SELECT log.id, log.action, log.resource_type, log.resource_id, log.details,
      log.created_at, COALESCE(actor.email, 'Sistema') AS actor_email
    FROM public.admin_audit_log log
    LEFT JOIN auth.users actor ON actor.id = log.actor_id
    WHERE (p_action IS NULL OR p_action = '' OR log.action = p_action)
      AND (p_start_date IS NULL OR log.created_at >= p_start_date::TIMESTAMPTZ)
      AND (p_end_date IS NULL OR log.created_at < (p_end_date + 1)::TIMESTAMPTZ)
      AND (p_search IS NULL OR p_search = '' OR
        log.resource_id ILIKE '%' || p_search || '%' OR
        log.resource_type ILIKE '%' || p_search || '%' OR
        actor.email ILIKE '%' || p_search || '%')
    ORDER BY log.created_at DESC
    LIMIT v_page_size OFFSET (v_page - 1) * v_page_size
  ) row_data;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_page_size);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_audit(INTEGER, INTEGER, TEXT, TEXT, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(INTEGER, INTEGER, TEXT, TEXT, DATE, DATE) TO authenticated, service_role;
