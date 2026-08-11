interface ApiErrorPayload {
  error?: string | {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const error = (payload as ApiErrorPayload).error;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

