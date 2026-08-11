export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfter?: number,
  ) {
    super(message)
  }
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...extraHeaders,
    },
    status,
  })
}

export function errorResponse(error: unknown, requestId: string) {
  const apiError = error instanceof ApiError
    ? error
    : new ApiError('Ocorreu um erro interno. Tente novamente.', 500, 'INTERNAL_ERROR')
  const headers = apiError.retryAfter
    ? { 'Retry-After': String(apiError.retryAfter) }
    : {}

  return jsonResponse({
    error: {
      code: apiError.code,
      message: apiError.message,
      requestId,
    },
  }, apiError.status, requestId, headers)
}

export async function parseJsonBody<T>(req: Request, maxBytes = 50_000): Promise<T> {
  const body = await req.text()
  if (!body || new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiError('Corpo da solicitação inválido ou muito grande.', 400, 'INVALID_BODY')
  }
  try {
    return JSON.parse(body) as T
  } catch {
    throw new ApiError('JSON inválido.', 400, 'INVALID_JSON')
  }
}

function jwtSubject(req: Request) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const payload = token.split('.')[1]
    if (!payload) return ''
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
    return typeof decoded.sub === 'string' ? decoded.sub : ''
  } catch {
    return ''
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function enforceRateLimit(
  req: Request,
  supabase: any,
  endpoint: string,
  limit: number,
  windowSeconds: number,
  discriminator = '',
) {
  const forwardedFor = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const client = jwtSubject(req)
    || req.headers.get('cf-connecting-ip')
    || forwardedFor
    || req.headers.get('user-agent')
    || 'unknown-client'
  const keyHash = await sha256(`${endpoint}:${client}:${discriminator}`)
  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_endpoint: endpoint,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('Falha ao consultar rate limit.', { endpoint, error: error.message })
    throw new ApiError('Serviço temporariamente indisponível.', 503, 'RATE_LIMIT_UNAVAILABLE')
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.allowed) {
    throw new ApiError(
      'Muitas tentativas. Aguarde um pouco e tente novamente.',
      429,
      'RATE_LIMITED',
      Number(result?.retry_after) || windowSeconds,
    )
  }
}

