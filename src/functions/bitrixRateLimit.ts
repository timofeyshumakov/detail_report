export const BITRIX_RATE_LIMIT_RETRY_MS = 60_000
export const BITRIX_RATE_LIMIT_MESSAGE =
  'Превышен лимит запросов к Bitrix24. Запрос будет повторён через минуту.'

export class BitrixRateLimitError extends Error {
  retryAfterMs: number
  code: string

  constructor(message = BITRIX_RATE_LIMIT_MESSAGE, retryAfterMs = BITRIX_RATE_LIMIT_RETRY_MS) {
    super(message)
    this.name = 'BitrixRateLimitError'
    this.code = 'QUERY_LIMIT_EXCEEDED'
    this.retryAfterMs = retryAfterMs
  }
}

type RateLimitPayload = {
  code?: string
  error?: string
  retryAfter?: number
}

let rateLimitNotifier: ((retryInMs: number, attempt: number) => void) | null = null

export function setBitrixRateLimitNotifier(
  notifier: ((retryInMs: number, attempt: number) => void) | null,
) {
  rateLimitNotifier = notifier
}

function normalizeErrorText(...parts: unknown[]): string {
  return parts
    .flatMap((part) => {
      if (part == null) return []
      if (typeof part === 'string') return [part]
      if (part instanceof Error) return [part.message]
      if (typeof part === 'object') {
        const record = part as Record<string, unknown>
        return [
          record.error,
          record.error_description,
          record.explanation,
          record.message,
          record.code,
        ].filter((value) => typeof value === 'string') as string[]
      }
      return [String(part)]
    })
    .join(' ')
    .toLowerCase()
}

export function isRateLimitError(error: unknown, payload: RateLimitPayload = {}): boolean {
  if (error instanceof BitrixRateLimitError) return true

  const code = String(payload.code || '').toUpperCase()
  if (code === 'QUERY_LIMIT_EXCEEDED' || code === 'TOO_MANY_REQUESTS') {
    return true
  }

  const text = normalizeErrorText(error, payload.error, payload.code)
  return /query_limit_exceeded|too many requests|too many|превышен лимит|rate limit|429/.test(text)
}

export function createRateLimitError(
  source: unknown,
  payload: RateLimitPayload = {},
): BitrixRateLimitError {
  const retryAfterSec = Number(payload.retryAfter)
  const retryAfterMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
    ? retryAfterSec * 1000
    : BITRIX_RATE_LIMIT_RETRY_MS

  const message = typeof payload.error === 'string' && payload.error.trim()
    ? payload.error
    : BITRIX_RATE_LIMIT_MESSAGE

  return new BitrixRateLimitError(message, retryAfterMs)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRateLimitRetry<T>(
  task: () => Promise<T>,
  options: {
    onRateLimit?: (retryInMs: number, attempt: number) => void
    maxRetries?: number
    retryDelayMs?: number
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const retryDelayMs = options.retryDelayMs ?? BITRIX_RATE_LIMIT_RETRY_MS

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await task()
    } catch (error) {
      const retryInMs = error instanceof BitrixRateLimitError
        ? error.retryAfterMs
        : retryDelayMs

      if (!isRateLimitError(error) || attempt >= maxRetries) {
        throw error
      }

      const notify = options.onRateLimit || rateLimitNotifier
      notify?.(retryInMs, attempt + 1)
      await sleep(retryInMs)
    }
  }

  throw new Error('Rate limit retry failed')
}
