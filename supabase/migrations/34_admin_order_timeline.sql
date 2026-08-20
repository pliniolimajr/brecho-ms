-- BLOCO 1 - ACESSO SEGURO A LINHA DO TEMPO DOS PEDIDOS

CREATE OR REPLACE FUNCTION public.admin_get_order_events(p_order_id UUID)
RETURNS SETOF public.order_events
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT event.* FROM public.order_events event
  WHERE public.is_admin() AND event.order_id = p_order_id
  ORDER BY event.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_order_event(
  p_order_id UUID, p_event_type TEXT, p_title TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS public.order_events
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_event public.order_events%ROWTYPE;
  v_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Pedido nao encontrado.';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.order_events(order_id, event_type, title, details, actor_id, actor_email)
  VALUES (
    p_order_id,
    LEFT(COALESCE(NULLIF(BTRIM(p_event_type), ''), 'admin_note'), 80),
    LEFT(COALESCE(NULLIF(BTRIM(p_title), ''), 'Evento administrativo'), 240),
    COALESCE(p_details, '{}'::JSONB), auth.uid(), v_email
  ) RETURNING * INTO v_event;
  RETURN v_event;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_order_events(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_order_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_order_events(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_order_event(UUID, TEXT, TEXT, JSONB) TO authenticated, service_role;
