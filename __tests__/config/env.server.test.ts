describe('config/env.server', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    // Re-register server-only mock after resetModules clears the registry
    jest.mock('server-only', () => ({}))
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('parses valid server env with all variables', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token-123'
    process.env.HEALTH_SECRET = 'super-secret-health-check-token-that-is-long'

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.NODE_ENV).toBe('test')
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://redis.upstash.io')
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBe('token-123')
    expect(serverEnv.HEALTH_SECRET).toBe('super-secret-health-check-token-that-is-long')
  })

  it('allows Redis vars to be optional in non-production', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBeUndefined()
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
  })

  it('allows HEALTH_SECRET to be optional', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.HEALTH_SECRET

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.HEALTH_SECRET).toBeUndefined()
  })

  it('treats empty HEALTH_SECRET as undefined (preprocess)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.HEALTH_SECRET = ''

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.HEALTH_SECRET).toBeUndefined()
  })

  it('rejects HEALTH_SECRET shorter than 32 chars', async () => {
    process.env.NODE_ENV = 'test'
    process.env.HEALTH_SECRET = 'too-short'

    const { serverEnv } = await import('@/config/env.server')

    expect(() => serverEnv.HEALTH_SECRET).toThrow()
  })

  it('rejects invalid UPSTASH_REDIS_REST_URL (not a URL)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'not-a-url'

    const { serverEnv } = await import('@/config/env.server')

    expect(() => serverEnv.UPSTASH_REDIS_REST_URL).toThrow()
  })

  it('rejects empty UPSTASH_REDIS_REST_TOKEN', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_TOKEN = ''

    const { serverEnv } = await import('@/config/env.server')

    expect(() => serverEnv.UPSTASH_REDIS_REST_TOKEN).toThrow()
  })

  it('requires Redis vars in production (refine)', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    // In production mode, Proxy is not used — eager parse throws at import
    await expect(import('@/config/env.server')).rejects.toThrow(/required in production/)
  })

  it('parses eagerly and returns plain object in production mode', async () => {
    process.env.NODE_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'prod-token-value'

    const { serverEnv } = await import('@/config/env.server')

    // In production mode, serverEnv is a plain parsed object (not Proxy)
    expect(serverEnv.NODE_ENV).toBe('production')
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://redis.upstash.io')
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBe('prod-token-value')
    expect(Object.keys(serverEnv)).toEqual(
      expect.arrayContaining(['NODE_ENV', 'UPSTASH_REDIS_REST_URL']),
    )
  })

  it('parses HEALTH_SECRET eagerly in production mode (preprocess + min 32)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'prod-token-value'
    process.env.HEALTH_SECRET = 'prod-health-secret-with-32-chars!!'

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.HEALTH_SECRET).toBe('prod-health-secret-with-32-chars!!')
  })

  it('preprocesses empty HEALTH_SECRET to undefined in production (eager)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'prod-token-value'
    process.env.HEALTH_SECRET = ''

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.HEALTH_SECRET).toBeUndefined()
  })

  it('rejects partial Redis config (URL without TOKEN)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { serverEnv } = await import('@/config/env.server')

    expect(() => serverEnv.NODE_ENV).toThrow(/both be set or both be absent/)
  })

  it('rejects partial Redis config (TOKEN without URL)', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    process.env.UPSTASH_REDIS_REST_TOKEN = 'orphan-token'

    const { serverEnv } = await import('@/config/env.server')

    expect(() => serverEnv.NODE_ENV).toThrow(/both be set or both be absent/)
  })

  it('filters "undefined" string from process.env assignment', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'undefined'
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBeUndefined()
  })

  it('reads process.env dynamically in test mode (Proxy)', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { serverEnv } = await import('@/config/env.server')

    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBeUndefined()

    // Change env vars after import (must set pair to satisfy refine)
    process.env.UPSTASH_REDIS_REST_URL = 'https://dynamic.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'dynamic-token'
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://dynamic.upstash.io')

    // Clean up
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('exports ServerEnv type matching schema shape', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { serverEnv } = await import('@/config/env.server')

    expect(Object.keys(serverEnv)).toEqual(
      expect.arrayContaining([
        'NODE_ENV',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'HEALTH_SECRET',
      ]),
    )
  })

  it('getOwnPropertyDescriptor returns undefined for non-schema keys', async () => {
    process.env.NODE_ENV = 'test'

    const { serverEnv } = await import('@/config/env.server')

    const descriptor = Object.getOwnPropertyDescriptor(serverEnv, 'NON_EXISTENT_KEY')
    expect(descriptor).toBeUndefined()
  })

  it('logs console.warn when filtering "undefined" string', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'undefined'

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { serverEnv } = await import('@/config/env.server')

    // Access to trigger Proxy parse
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      '[env.server] Filtered "undefined" string from UPSTASH_REDIS_REST_URL',
    )

    warnSpy.mockRestore()
  })

  it('getOwnPropertyDescriptor returns descriptor for valid schema keys', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL

    const { serverEnv } = await import('@/config/env.server')

    const descriptor = Object.getOwnPropertyDescriptor(serverEnv, 'NODE_ENV')
    expect(descriptor).toBeDefined()
    expect(descriptor?.value).toBe('test')
    expect(descriptor?.enumerable).toBe(true)
    expect(descriptor?.configurable).toBe(true)
  })
})
