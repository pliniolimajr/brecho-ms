-- =========================================================================
-- FASE 1 - NOTIFICACOES DE ENVIO E ENTREGA
-- =========================================================================

ALTER TABLE public.notification_jobs
DROP CONSTRAINT IF EXISTS notification_jobs_type_check;

ALTER TABLE public.notification_jobs
ADD CONSTRAINT notification_jobs_type_check
CHECK (type IN (
    'welcome',
    'order_confirmed',
    'order_shipped',
    'order_delivered'
));

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

CREATE OR REPLACE FUNCTION public.queue_order_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_email TEXT;
    v_name TEXT;
BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = NEW.user_id;

    v_email := COALESCE(
        NULLIF(trim(v_email), ''),
        NULLIF(trim(NEW.shipping_address ->> 'email'), '')
    );

    IF v_email IS NULL THEN
        RETURN NEW;
    END IF;

    v_name := trim(concat_ws(
        ' ',
        NEW.shipping_address ->> 'firstName',
        NEW.shipping_address ->> 'lastName'
    ));

    IF NEW.status = 'shipped'
       AND NULLIF(trim(NEW.tracking_code), '') IS NOT NULL
       AND (
           OLD.status IS DISTINCT FROM NEW.status
           OR OLD.tracking_code IS DISTINCT FROM NEW.tracking_code
       ) THEN
        PERFORM public.enqueue_notification(
            'order_shipped',
            v_email,
            jsonb_build_object(
                'name', COALESCE(NULLIF(v_name, ''), 'Cliente'),
                'orderId', NEW.id,
                'trackingCode', NEW.tracking_code,
                'shippingCarrier', COALESCE(NEW.shipping_carrier, 'Transportadora'),
                'shippingService', COALESCE(NEW.shipping_service, '')
            ),
            'order_shipped:' || NEW.id::TEXT
        );
    END IF;

    IF NEW.status = 'delivered'
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.enqueue_notification(
            'order_delivered',
            v_email,
            jsonb_build_object(
                'name', COALESCE(NULLIF(v_name, ''), 'Cliente'),
                'orderId', NEW.id
            ),
            'order_delivered:' || NEW.id::TEXT
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_order_status_notification_trigger
ON public.orders;

CREATE TRIGGER queue_order_status_notification_trigger
AFTER UPDATE OF status, tracking_code ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.queue_order_status_notification();

REVOKE ALL ON FUNCTION public.queue_order_status_notification()
FROM PUBLIC, anon, authenticated;
