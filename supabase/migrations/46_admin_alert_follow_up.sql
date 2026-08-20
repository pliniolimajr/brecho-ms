-- BLOCO 7 - ACOMPANHAMENTO DAS PENDENCIAS OPERACIONAIS

CREATE TABLE IF NOT EXISTS public.admin_alert_snoozes (
  alert_key TEXT PRIMARY KEY,
  alert_data JSONB NOT NULL,
  snoozed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snoozed_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_alert_snoozes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_alert_snoozes FROM anon, authenticated;

ALTER FUNCTION public.admin_action_center() RENAME TO admin_action_center_internal;
REVOKE ALL ON FUNCTION public.admin_action_center_internal() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_action_center()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(enriched.item ORDER BY enriched.priority_order, enriched.occurred_at), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT item || jsonb_build_object('alert_key', item->>'type' || ':' || item->>'resource_id') AS item,
      COALESCE((item->>'priority_order')::INTEGER, 9) AS priority_order,
      (item->>'occurred_at')::TIMESTAMPTZ AS occurred_at
    FROM jsonb_array_elements(public.admin_action_center_internal()) item
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_alert_snoozes s
      WHERE s.alert_key = ((item->>'type') || ':' || (item->>'resource_id'))
        AND s.snoozed_until > NOW()
    )
  ) enriched;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_snooze_alert(p_alert_key TEXT, p_hours INTEGER DEFAULT 24)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_alert JSONB;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  IF p_hours < 1 OR p_hours > 168 THEN RAISE EXCEPTION 'O prazo deve ficar entre 1 hora e 7 dias.'; END IF;

  SELECT item INTO v_alert
  FROM jsonb_array_elements(public.admin_action_center_internal()) item
  WHERE ((item->>'type') || ':' || (item->>'resource_id')) = p_alert_key
  LIMIT 1;
  IF v_alert IS NULL THEN RAISE EXCEPTION 'Pendencia nao encontrada ou sem permissao para este usuario.'; END IF;

  INSERT INTO public.admin_alert_snoozes(alert_key, alert_data, snoozed_by, snoozed_until)
  VALUES (p_alert_key, v_alert, auth.uid(), NOW() + make_interval(hours => p_hours))
  ON CONFLICT (alert_key) DO UPDATE SET alert_data = EXCLUDED.alert_data, snoozed_by = auth.uid(),
    snoozed_until = EXCLUDED.snoozed_until, updated_at = NOW();
  PERFORM public.write_admin_audit('operational_alert_snoozed', 'admin_alert', p_alert_key,
    jsonb_build_object('hours', p_hours));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_alert(p_alert_key TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.admin_alert_snoozes WHERE alert_key = p_alert_key;
  PERFORM public.write_admin_audit('operational_alert_restored', 'admin_alert', p_alert_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_snoozed_alerts()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(
    (item || jsonb_build_object('alert_key', item->>'type' || ':' || item->>'resource_id',
      'snoozed_until', s.snoozed_until)) ORDER BY s.snoozed_until
  ), '[]'::JSONB) INTO v_result
  FROM jsonb_array_elements(public.admin_action_center_internal()) item
  JOIN public.admin_alert_snoozes s ON s.alert_key = ((item->>'type') || ':' || (item->>'resource_id'))
  WHERE s.snoozed_until > NOW();
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_action_center() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_snooze_alert(TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_alert(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_snoozed_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_action_center() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_snooze_alert(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_alert(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_snoozed_alerts() TO authenticated, service_role;
