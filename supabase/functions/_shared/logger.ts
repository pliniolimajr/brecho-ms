type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|email|phone|cpf|address|street|postal|zip|recipient|payload)/i

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message }
  }

  if (Array.isArray(value)) return value.map(item => sanitize(item, seen))
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return '[circular]'
  seen.add(value)

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(item, seen),
    ]),
  )
}

function write(level: LogLevel, service: string, event: string, context: LogContext = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service,
    event,
    ...sanitize(context) as LogContext,
  })

  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

export const operationalLogger = (service: string) => ({
  info: (event: string, context?: LogContext) => write('info', service, event, context),
  warn: (event: string, context?: LogContext) => write('warn', service, event, context),
  error: (event: string, context?: LogContext) => write('error', service, event, context),
})
