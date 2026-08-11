-- =========================================================================
-- FASE 2 - RATE LIMITING ATOMICO PARA EDGE FUNCTIONS PUBLICAS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  endpoint TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (endpoint, key_hash)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_endpoint TEXT,
  p_key_hash TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.api_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_window INTERVAL;
BEGIN
  IF char_length(p_endpoint) NOT BETWEEN 1 AND 80
     OR char_length(p_key_hash) <> 64
     OR p_limit NOT BETWEEN 1 AND 10000
     OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Configuracao de rate limit invalida.';
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  INSERT INTO public.api_rate_limits AS limits (
    endpoint, key_hash, window_started_at, request_count, updated_at
  ) VALUES (
    p_endpoint, p_key_hash, v_now, 1, v_now
  )
  ON CONFLICT (endpoint, key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN v_now
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at + v_window <= v_now THEN 1
      ELSE limits.request_count + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  allowed := v_row.request_count <= p_limit;
  retry_after := CASE WHEN allowed THEN 0 ELSE GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (v_row.window_started_at + v_window - v_now)))::INTEGER
  ) END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
TO service_role;

CREATE INDEX IF NOT EXISTS api_rate_limits_updated_at_idx
ON public.api_rate_limits(updated_at);

