-- Resumo operacional sem dados pessoais, restrito a administradores.
CREATE OR REPLACE FUNCTION public.admin_operational_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'checked_at', NOW(),
    'notifications', jsonb_build_object(
      'failed', COUNT(*) FILTER (WHERE status = 'failed'),
      'stale', COUNT(*) FILTER (
        WHERE status IN ('pending', 'processing')
          AND scheduled_at < NOW() - INTERVAL '15 minutes'
      )
    )
  )
  INTO v_result
  FROM public.notification_jobs;

  v_result := v_result || jsonb_build_object(
    'payments', jsonb_build_object(
      'expired_pending', (
        SELECT COUNT(*)
        FROM public.orders
        WHERE status = 'pending'
          AND reservation_expires_at < NOW()
      ),
      'processed_last_24h', (
        SELECT COUNT(*)
        FROM public.payment_events
        WHERE processed_at >= NOW() - INTERVAL '24 hours'
      )
    ),
    'shipping', jsonb_build_object(
      'failed', (
        SELECT COUNT(*)
        FROM public.orders
        WHERE shipping_label_status = 'failed'
      ),
      'stuck', (
        SELECT COUNT(*)
        FROM public.orders
        WHERE shipping_label_status = 'creating'
          AND created_at < NOW() - INTERVAL '15 minutes'
      )
    )
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_operational_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_operational_health() TO authenticated, service_role;
