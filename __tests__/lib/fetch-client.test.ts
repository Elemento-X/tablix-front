/**
 * @jest-environment jsdom
 */
import {
  FetchError,
  fetchWithResilience,
  getCsrfToken,
  ENDPOINT_TIMEOUTS,
  type FetchErrorType,
} from '@/lib/fetch-client'

// Install global fetch mock — required so jest can track calls
global.fetch = jest.fn()

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFetchResponse(
  ok: boolean,
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return {
    ok,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

/**
 * Creates a fetch mock that respects AbortSignal.
 * If the signal is already aborted or becomes aborted, rejects with AbortError.
 */
function makePendingFetchMock(
  onSignal?: (signal: AbortSignal) => void,
): jest.Mock {
  return jest.fn().mockImplementation((_url: string, init: RequestInit) => {
    const signal = init?.signal as AbortSignal | undefined

    if (onSignal && signal) onSignal(signal)

    return new Promise<Response>((_resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      }
    })
  })
}

const fetchMock = global.fetch as jest.Mock

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()

  // Default: online
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    writable: true,
    value: true,
  })

  // Clear cookies
  document.cookie.split(';').forEach((c) => {
    const [key] = c.trim().split('=')
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  })
})

// ── FetchError ────────────────────────────────────────────────────────────────

describe('FetchError', () => {
  it('sets all fields correctly via constructor', () => {
    const err = new FetchError('rate-limit', 'Too many requests', 429, 30000)

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(FetchError)
    expect(err.name).toBe('FetchError')
    expect(err.message).toBe('Too many requests')
    expect(err.type).toBe('rate-limit')
    expect(err.status).toBe(429)
    expect(err.retryAfter).toBe(30000)
  })

  it('defaults status and retryAfter to null', () => {
    const err = new FetchError('offline', 'No internet')

    expect(err.status).toBeNull()
    expect(err.retryAfter).toBeNull()
  })

  it.each<[FetchErrorType]>([
    ['offline'],
    ['timeout'],
    ['server'],
    ['rate-limit'],
    ['client'],
    ['unknown'],
  ])('type "%s" is a valid FetchErrorType', (type) => {
    const err = new FetchError(type, 'msg')
    expect(err.type).toBe(type)
  })
})

// ── ENDPOINT_TIMEOUTS ─────────────────────────────────────────────────────────

describe('ENDPOINT_TIMEOUTS', () => {
  it('/api/usage has 10 000ms timeout', () => {
    expect(ENDPOINT_TIMEOUTS['/api/usage']).toBe(10_000)
  })

  it('/api/preview has 30 000ms timeout', () => {
    expect(ENDPOINT_TIMEOUTS['/api/preview']).toBe(30_000)
  })

  it('/api/unification/complete has 10 000ms timeout', () => {
    expect(ENDPOINT_TIMEOUTS['/api/unification/complete']).toBe(10_000)
  })

  it('/api/process has 60 000ms timeout', () => {
    expect(ENDPOINT_TIMEOUTS['/api/process']).toBe(60_000)
  })
})

// ── getCsrfToken ──────────────────────────────────────────────────────────────

describe('getCsrfToken', () => {
  it('returns null when __csrf cookie is absent', () => {
    expect(getCsrfToken()).toBeNull()
  })

  it('returns the token value when __csrf cookie is present', () => {
    document.cookie = '__csrf=abc123'
    expect(getCsrfToken()).toBe('abc123')
  })

  it('returns correct value when multiple cookies exist', () => {
    document.cookie = 'session=xyz'
    document.cookie = '__csrf=tok-456'
    document.cookie = 'other=val'
    expect(getCsrfToken()).toBe('tok-456')
  })

  it('returns null when only unrelated cookies exist', () => {
    document.cookie = 'unrelated=hello'
    expect(getCsrfToken()).toBeNull()
  })
})

// ── Offline detection ─────────────────────────────────────────────────────────

describe('fetchWithResilience — offline detection', () => {
  it('throws FetchError(offline) immediately without calling fetch when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    await expect(fetchWithResilience('/api/usage')).rejects.toMatchObject({
      type: 'offline',
      message: 'No internet connection',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ── CSRF header injection ─────────────────────────────────────────────────────

describe('fetchWithResilience — CSRF header injection', () => {
  beforeEach(() => {
    document.cookie = '__csrf=csrf-token-test'
  })

  it('does NOT inject X-CSRF-Token on GET requests', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/usage', { method: 'GET' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('does NOT inject X-CSRF-Token on HEAD requests', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, {}))

    await fetchWithResilience('/api/usage', { method: 'HEAD' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('injects X-CSRF-Token on POST requests', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/process', { method: 'POST' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token-test')
  })

  it('injects X-CSRF-Token on PUT requests', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/process', { method: 'PUT' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token-test')
  })

  it('does NOT inject X-CSRF-Token when skipCsrf=true', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/process', { method: 'POST', skipCsrf: true })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('does NOT inject X-CSRF-Token on POST when __csrf cookie is absent', async () => {
    // Override beforeEach: clear the csrf cookie
    document.cookie = '__csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/process', { method: 'POST' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })
})

// ── Timeout via AbortController ───────────────────────────────────────────────

describe('fetchWithResilience — timeout', () => {
  it('aborts request after timeout and throws FetchError(timeout)', async () => {
    jest.useFakeTimers()

    // Use abort-aware mock so the promise rejects when signal fires
    fetchMock.mockImplementation(makePendingFetchMock().getMockImplementation())

    const abortAwareMock = makePendingFetchMock()
    fetchMock.mockImplementationOnce(abortAwareMock.getMockImplementation()!)

    const promise = fetchWithResilience('/some/endpoint', {
      timeout: 500,
      retry: { maxAttempts: 1 },
    })

    // Advance past the 500ms timeout to trigger AbortController
    jest.advanceTimersByTime(600)
    await Promise.resolve() // flush microtasks

    await expect(promise).rejects.toMatchObject({ type: 'timeout' })

    jest.useRealTimers()
  }, 10_000)

  it('uses ENDPOINT_TIMEOUTS value for /api/usage (10 000ms)', async () => {
    jest.useFakeTimers()

    const abortAwareFetch = makePendingFetchMock()
    fetchMock.mockImplementationOnce(abortAwareFetch.getMockImplementation()!)

    const promise = fetchWithResilience('/api/usage', {
      retry: { maxAttempts: 1 },
    })

    // /api/usage preset = 10 000ms
    jest.advanceTimersByTime(10_001)
    await Promise.resolve()

    await expect(promise).rejects.toMatchObject({ type: 'timeout' })

    jest.useRealTimers()
  }, 10_000)

  it('does NOT abort before timeout elapses', async () => {
    jest.useFakeTimers()

    let capturedSignal: AbortSignal | undefined
    let rejectFetch!: (reason: unknown) => void

    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        rejectFetch = reject
        capturedSignal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })
    })

    const promise = fetchWithResilience('/some/endpoint', {
      timeout: 1000,
      retry: { maxAttempts: 1 },
    })

    // At 999ms — still within timeout, not yet aborted
    jest.advanceTimersByTime(999)
    expect(capturedSignal?.aborted).toBe(false)

    // Advance past timeout so timer cleans up, then catch the rejection
    jest.advanceTimersByTime(2)
    await Promise.resolve()
    await expect(promise).rejects.toMatchObject({ type: 'timeout' })

    // Suppress unhandled in case reject was never called via signal
    rejectFetch(new DOMException('Aborted', 'AbortError'))

    jest.useRealTimers()
  }, 10_000)
})

// ── Error classification ──────────────────────────────────────────────────────

describe('fetchWithResilience — error classification', () => {
  it('classifies 429 as rate-limit with retryAfter in ms', async () => {
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse(false, 429, undefined, { 'Retry-After': '30' }),
    )

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({
      type: 'rate-limit',
      status: 429,
      retryAfter: 30_000, // header 30s → 30 000ms
    })
  })

  it('classifies 429 without Retry-After header as retryAfter=null', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 429))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({
      type: 'rate-limit',
      status: 429,
      retryAfter: null,
    })
  })

  it('classifies 500 as server error', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'server', status: 500 })
  })

  it('classifies 503 as server error', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 503))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'server', status: 503 })
  })

  it('classifies 400 as client error', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 400))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'client', status: 400 })
  })

  it('classifies 401 as client error', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 401))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'client', status: 401 })
  })

  it('classifies 403 as client error', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 403))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'client', status: 403 })
  })

  it('classifies TypeError (network failure) as offline', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'offline' })
  })

  it('classifies AbortError as timeout', async () => {
    // navigator.onLine is true so it does not short-circuit as offline
    fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'timeout' })
  })

  it('classifies unknown thrown non-Error value as unknown', async () => {
    fetchMock.mockRejectedValueOnce('string error')

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'unknown' })
  })

  it('classifies unknown thrown Error with original message', async () => {
    fetchMock.mockRejectedValueOnce(new Error('some unexpected error'))

    await expect(
      fetchWithResilience('/api/usage', { retry: { maxAttempts: 1 } }),
    ).rejects.toMatchObject({ type: 'unknown', message: 'some unexpected error' })
  })
})

// ── Retry logic ───────────────────────────────────────────────────────────────

describe('fetchWithResilience — retry', () => {
  /**
   * Retry tests use real timers + a minimal baseDelay so the delay resolves
   * immediately without needing fake timer manipulation.
   */
  const fastRetry = { baseDelay: 1, factor: 1, maxDelay: 1 }

  it('retries on server error for GET and exhausts all attempts', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/usage', {
        method: 'GET',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'server' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries on network error (offline/TypeError) for GET', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(
      fetchWithResilience('/api/usage', {
        method: 'GET',
        retry: { maxAttempts: 2, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'offline' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry on 4xx client errors for GET', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 400))

    await expect(
      fetchWithResilience('/api/usage', {
        method: 'GET',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'client' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 401 client errors for GET', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 401))

    await expect(
      fetchWithResilience('/api/usage', {
        method: 'GET',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'client' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on POST (idempotent=false by default)', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/process', {
        method: 'POST',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'server' })

    // No retry — single attempt only
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries on POST when idempotent=true and server error', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/process', {
        method: 'POST',
        idempotent: true,
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'server' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does NOT retry on POST with idempotent=true for 4xx errors', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 422))

    await expect(
      fetchWithResilience('/api/process', {
        method: 'POST',
        idempotent: true,
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'client' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on PUT (idempotent=false by default)', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/process', {
        method: 'PUT',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'server' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on DELETE (idempotent=false by default)', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 500))

    await expect(
      fetchWithResilience('/api/process', {
        method: 'DELETE',
        retry: { maxAttempts: 3, ...fastRetry },
      }),
    ).rejects.toMatchObject({ type: 'server' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('succeeds on second attempt after first server error', async () => {
    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(false, 500))
      .mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    const result = await fetchWithResilience('/api/usage', {
      method: 'GET',
      retry: { maxAttempts: 3, ...fastRetry },
    })

    expect(result.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('re-checks online status before retry and throws offline if navigator.onLine changed', async () => {
    // First attempt: server error → triggers retry sleep
    // During the sleep, navigator.onLine changes to false
    // Implementation re-checks before retrying and throws offline

    let attempt = 0
    fetchMock.mockImplementation(() => {
      attempt++
      if (attempt === 1) {
        // Simulate going offline during the sleep between attempts
        return Promise.resolve(makeFetchResponse(false, 500))
      }
      return Promise.resolve(makeFetchResponse(true, 200, {}))
    })

    // We need to go offline AFTER the first call but before the retry
    // We achieve this by overriding after the mock is set up
    const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine')

    // Intercept the sleep delay — go offline after the first fetch completes
    const originalSetTimeout = global.setTimeout
    ;(global as typeof global).setTimeout = ((
      fn: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ) => {
      // The sleep() call in the retry path uses a dynamic delay.
      // Set offline right when the delay fires.
      return originalSetTimeout(() => {
        Object.defineProperty(navigator, 'onLine', {
          configurable: true,
          value: false,
        })
        fn(...args)
      }, delay, ...args)
    }) as typeof global.setTimeout

    await expect(
      fetchWithResilience('/api/usage', {
        method: 'GET',
        retry: { maxAttempts: 3, baseDelay: 1, factor: 1, maxDelay: 1 },
      }),
    ).rejects.toMatchObject({ type: 'offline' })

    // Restore
    ;(global as typeof global).setTimeout = originalSetTimeout
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', {
        ...originalOnLine,
        value: true,
      })
    }
  })
})

// ── Success path ──────────────────────────────────────────────────────────────

describe('fetchWithResilience — success path', () => {
  it('returns empty object and response on 204 No Content without calling .json()', async () => {
    const jsonSpy = jest.fn()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: jsonSpy,
    } as unknown as Response)

    const { data, response } = await fetchWithResilience('/api/unification/complete', {
      method: 'POST',
    })

    expect(data).toEqual({})
    expect(response.status).toBe(204)
    expect(jsonSpy).not.toHaveBeenCalled()
  })

  it('returns parsed data and response on 200', async () => {
    const body = { items: [1, 2, 3] }
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, body))

    const { data, response } = await fetchWithResilience<typeof body>('/api/usage')

    expect(data).toEqual(body)
    expect(response.status).toBe(200)
  })

  it('passes through custom headers from options', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, {}))

    await fetchWithResilience('/api/usage', {
      headers: { Authorization: 'Bearer token' },
    })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token')
  })

  it('attaches AbortSignal for unknown endpoint (uses 15s default timeout)', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, {}))

    await fetchWithResilience('/api/unknown-endpoint')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('method defaults to GET when not specified — no CSRF injected', async () => {
    document.cookie = '__csrf=some-token'
    fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, { ok: true }))

    await fetchWithResilience('/api/usage')

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })
})
