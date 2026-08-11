const SENSITIVE_KEYS = /email|phone|cpf|address|street|postal|zip|token|authorization|password|secret/i;

export function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redactSensitiveData(item),
  ]));
}

export async function initializeMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.05),
    beforeSend(event) {
      return redactSensitiveData(event) as typeof event;
    },
  });
  return true;
}

export async function captureOperationalError(error: unknown, context?: Record<string, unknown>) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  const Sentry = await import('@sentry/react');
  Sentry.captureException(error, { extra: redactSensitiveData(context) as Record<string, unknown> });
}
