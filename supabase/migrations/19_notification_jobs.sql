-- =========================================================================
-- FASE 1 - FILA AUDITAVEL DE NOTIFICACOES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.newsletter_subscribers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE public.newsletter_subscribers
ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_unsubscribe_token_idx
ON public.newsletter_subscribers(unsubscribe_token);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.newsletter_subscribers FROM anon, authenticated;
GRANT INSERT (name, email) ON public.newsletter_subscribers TO anon, authenticated;

DROP POLICY IF EXISTS "Visitantes podem assinar newsletter"
ON public.newsletter_subscribers;

CREATE POLICY "Visitantes podem assinar newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
    char_length(trim(name)) BETWEEN 1 AND 100
    AND char_length(trim(email)) BETWEEN 5 AND 254
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND is_active = TRUE
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('welcome', 'order_confirmed')),
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    deduplication_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
    last_error TEXT,
    provider_message_id TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    processing_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT notification_recipient_format CHECK (
        char_length(recipient) BETWEEN 5 AND 254
        AND recipient ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
);

CREATE INDEX IF NOT EXISTS notification_jobs_due_idx
ON public.notification_jobs(status, scheduled_at)
WHERE status IN ('pending', 'processing');

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

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
    IF p_type NOT IN ('welcome', 'order_confirmed') THEN
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

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH due AS (
        SELECT id
        FROM public.notification_jobs
        WHERE attempts < max_attempts
          AND scheduled_at <= NOW()
          AND (
              status = 'pending'
              OR (status = 'processing' AND processing_at < NOW() - INTERVAL '10 minutes')
          )
        ORDER BY scheduled_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25)
    )
    UPDATE public.notification_jobs AS jobs
    SET status = 'processing',
        attempts = jobs.attempts + 1,
        processing_at = NOW(),
        updated_at = NOW()
    FROM due
    WHERE jobs.id = due.id
    RETURNING jobs.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_notification_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL,
    p_provider_message_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.notification_jobs
    SET status = CASE
            WHEN p_success THEN 'sent'
            WHEN attempts >= max_attempts THEN 'failed'
            ELSE 'pending'
        END,
        last_error = CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error, 'Erro desconhecido'), 1000) END,
        provider_message_id = CASE WHEN p_success THEN p_provider_message_id ELSE provider_message_id END,
        scheduled_at = CASE
            WHEN p_success OR attempts >= max_attempts THEN scheduled_at
            ELSE NOW() + make_interval(mins => LEAST(POWER(2, attempts)::INTEGER, 60))
        END,
        processing_at = NULL,
        sent_at = CASE WHEN p_success THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE id = p_job_id AND status = 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_newsletter_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.enqueue_notification(
        'welcome',
        NEW.email,
        jsonb_build_object(
            'name', NEW.name,
            'unsubscribeToken', NEW.unsubscribe_token
        ),
        'welcome:' || lower(trim(NEW.email))
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_newsletter_welcome_trigger
ON public.newsletter_subscribers;

CREATE TRIGGER queue_newsletter_welcome_trigger
AFTER INSERT ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.queue_newsletter_welcome();

REVOKE ALL ON TABLE public.notification_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_notification(TEXT, TEXT, JSONB, TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_jobs(INTEGER)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_notification_job(UUID, BOOLEAN, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_newsletter_welcome()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_notification(TEXT, TEXT, JSONB, TEXT)
TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INTEGER)
TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_notification_job(UUID, BOOLEAN, TEXT, TEXT)
TO service_role;
