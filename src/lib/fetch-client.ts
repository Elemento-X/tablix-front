/**
 * Resilient fetch wrapper with retry, backoff, timeout, and error classification.
 *
 * Used by all client-side hooks that communicate with API routes.
 * Does NOT depend on React — pure library module.
 */

// ── Error types ──────────────────────────────────────────────────────────────

export type FetchErrorType = 'offline' | 'timeout' | 'server' | 'rate-limit' | 'client' | 'unknown'

export class FetchError extends Error {
  readonly type: FetchErrorType
  readonly status: number | null
  readonly retryAfter: number | null

  constructor(
    type: FetchErrorType,
    message: string,
    status: number | null = null,
    retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'FetchError'
    this.type = type
    this.status = status
    this.retryAfter = retryAfter
  }
}

// ── Timeout presets per endpoint ─────────────────────────────────────────────

export const ENDPOINT_TIMEOUTS: Record<string, number> = {
  '/api/usage': 10_000,
  '/api/preview': 30_000,
  '/api/unification/complete': 10_000,
  '/api/process': 60_000,
}

const DEFAULT_TIMEOUT = 15_000

// ── Retry config ─────────────────────────────────────────────────────────────

interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  factor: number
  maxDelay: number
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1_000,
  factor: 2,
  maxDelay: 10_000,
}

// ── Options ──────────────────────────────────────────────────────────────────

export interface ResilientFetchOptions extends Omit<RequestInit, 'signal'> {
  /** Override timeout in ms. Defaults to endpoint preset or 15s. */
  timeout?: number
  /** Allow retry even on POST. Defaults to false for POST/PUT/DELETE. */
  idempotent?: boolean
  /** Custom retry config. */
  retry?: Partial<RetryConfig>
  /** Skip CSRF token injection. Defaults to false. */
  skipCsrf?: boolean
}

// ── CSRF helper ──────────────────────────────────────────────────────────────

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((row) => row.startsWith('__csrf='))
  return match ? match.split('=')[1] : null
}

// ── Classify errors ──────────────────────────────────────────────────────────

function classifyResponseError(status: number, retryAfter: number | null): FetchError {
  if (status === 429) {
    return new FetchError('rate-limit', 'Too many requests', status, retryAfter)
  }
  if (status >= 500) {
    return new FetchError('server', `Server error (${status})`, status)
  }
  return new FetchError('client', `Client error (${status})`, status)
}

function classifyNetworkError(err: unknown): FetchError {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new FetchError('offline', 'No internet connection')
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new FetchError('timeout', 'Request timed out')
  }
  if (err instanceof TypeError) {
    return new FetchError('offline', 'Network request failed')
  }
  return new FetchError('unknown', err instanceof Error ? err.message : 'Unknown error')
}

// ── Retry logic ──────────────────────────────────────────────────────────────

function shouldRetry(error: FetchError, method: string, idempotent: boolean): boolean {
  const isRetryableMethod = method === 'GET' || method === 'HEAD' || idempotent

  if (!isRetryableMethod) return false

  // Never retry rate-limited requests — respect the server's throttling
  if (error.type === 'rate-limit') return false

  return error.type === 'offline' || error.type === 'timeout' || error.type === 'server'
}

function getRetryDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelay * Math.pow(config.factor, attempt)
  const capped = Math.min(exponential, config.maxDelay)
  // Add jitter: +-25%
  const jitter = capped * (0.75 + Math.random() * 0.5)
  return Math.round(jitter)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main function ────────────────────────────────────────────────────────────

export async function fetchWithResilience<T = unknown>(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<{ data: T; response: Response }> {
  const {
    timeout: timeoutOverride,
    idempotent = false,
    retry: retryOverride,
    skipCsrf = false,
    ...fetchInit
  } = options

  const method = (fetchInit.method ?? 'GET').toUpperCase()
  const timeoutMs = timeoutOverride ?? ENDPOINT_TIMEOUTS[url] ?? DEFAULT_TIMEOUT
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retryOverride }

  // Check offline before even trying
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new FetchError('offline', 'No internet connection')
  }

  // Inject CSRF token for state-changing requests
  const headers = new Headers(fetchInit.headers)
  if (!skipCsrf && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  let lastError: FetchError | null = null

  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    // Wait before retry (not on first attempt)
    if (attempt > 0 && lastError) {
      const delay = getRetryDelay(attempt - 1, retryConfig)
      await sleep(delay)

      // Re-check online status before retry
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new FetchError('offline', 'No internet connection')
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...fetchInit,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null

        const error = classifyResponseError(response.status, retryAfter)

        if (attempt < retryConfig.maxAttempts - 1 && shouldRetry(error, method, idempotent)) {
          lastError = error
          continue
        }

        throw error
      }

      const data = (await response.json()) as T
      return { data, response }
    } catch (err) {
      clearTimeout(timeoutId)

      if (err instanceof FetchError) {
        if (attempt < retryConfig.maxAttempts - 1 && shouldRetry(err, method, idempotent)) {
          lastError = err
          continue
        }
        throw err
      }

      const classified = classifyNetworkError(err)

      if (attempt < retryConfig.maxAttempts - 1 && shouldRetry(classified, method, idempotent)) {
        lastError = classified
        continue
      }

      throw classified
    }
  }

  // Should never reach here, but safety net
  throw lastError ?? new FetchError('unknown', 'Max retries exceeded')
}
