-- =========================================================================
-- CORRECAO - PERMITIR NOVOS TIPOS NA FUNCAO DE ENFILEIRAMENTO
-- =========================================================================

CREATE OR REPLACE FUNCTION public.enqueue_notification(
    p_type TEXT,
    p_recipient TEXT,
    p_payload JSONB,
    p_deduplication_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_type NOT IN (
        'welcome',
        'order_confirmed',
        'order_shipped',
        'order_delivered'
    ) THEN
        RAISE EXCEPTION 'Tipo de notificacao invalido.';
    END IF;

    IF char_length(trim(COALESCE(p_recipient, ''))) NOT BETWEEN 5 AND 254
       OR trim(p_recipient) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
        RAISE EXCEPTION 'Destinatario invalido.';
    END IF;

    IF char_length(trim(COALESCE(p_deduplication_key, ''))) NOT BETWEEN 1 AND 200 THEN
        RAISE EXCEPTION 'Chave de deduplicacao invalida.';
    END IF;

    INSERT INTO public.notification_jobs (
        type, recipient, payload, deduplication_key
    )
    VALUES (
        p_type,
        lower(trim(p_recipient)),
        COALESCE(p_payload, '{}'::JSONB),
        p_deduplication_key
    )
    ON CONFLICT (deduplication_key) DO UPDATE
    SET deduplication_key = EXCLUDED.deduplication_key
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification(TEXT, TEXT, JSONB, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_notification(TEXT, TEXT, JSONB, TEXT)
TO service_role;
