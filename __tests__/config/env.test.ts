describe('config/env (public)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('parses valid env with all public variables', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://sentry.example.com/123'

    const { env } = await import('@/config/env')

    expect(env.NODE_ENV).toBe('production')
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe('https://sentry.example.com/123')
  })

  it('defaults NODE_ENV to development when not set', async () => {
    delete process.env.NODE_ENV

    const { env } = await import('@/config/env')

    expect(env.NODE_ENV).toBe('development')
  })

  it('allows NEXT_PUBLIC_SENTRY_DSN to be optional', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.NEXT_PUBLIC_SENTRY_DSN

    const { env } = await import('@/config/env')

    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()
  })

  it('rejects invalid NODE_ENV', async () => {
    process.env.NODE_ENV = 'staging' as string

    // With NODE_ENV !== 'test', env.ts parses eagerly at import — import itself throws
    await expect(import('@/config/env')).rejects.toThrow()
  })

  it('rejects invalid NEXT_PUBLIC_SENTRY_DSN (not a URL)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'not-a-url'

    const { env } = await import('@/config/env')

    expect(() => env.NEXT_PUBLIC_SENTRY_DSN).toThrow()
  })

  it('accepts all valid NODE_ENV values', async () => {
    for (const mode of ['production', 'development', 'test'] as const) {
      jest.resetModules()
      process.env = { ...originalEnv }
      process.env.NODE_ENV = mode

      const { env } = await import('@/config/env')
      expect(env.NODE_ENV).toBe(mode)
    }
  })

  it('exports Env type matching schema shape', async () => {
    process.env.NODE_ENV = 'test'

    const { env } = await import('@/config/env')

    expect(Object.keys(env)).toEqual(expect.arrayContaining(['NODE_ENV', 'NEXT_PUBLIC_SENTRY_DSN']))
  })

  it('filters "undefined" string from process.env assignment', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'undefined'

    const { env } = await import('@/config/env')

    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()
  })

  it('reads process.env dynamically in test mode (Proxy)', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.NEXT_PUBLIC_SENTRY_DSN

    const { env } = await import('@/config/env')

    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()

    // Change env var after import
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://changed.sentry.io/456'
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe('https://changed.sentry.io/456')

    // Clean up
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
  })

  it('getOwnPropertyDescriptor returns undefined for non-schema keys in Proxy', async () => {
    process.env.NODE_ENV = 'test'

    const { env } = await import('@/config/env')

    const descriptor = Object.getOwnPropertyDescriptor(env, 'NON_EXISTENT_KEY')
    expect(descriptor).toBeUndefined()
  })

  it('does not include server-only vars (UPSTASH, HEALTH_SECRET)', async () => {
    process.env.NODE_ENV = 'test'

    const { env } = await import('@/config/env')

    const keys = Object.keys(env)
    expect(keys).not.toContain('UPSTASH_REDIS_REST_URL')
    expect(keys).not.toContain('UPSTASH_REDIS_REST_TOKEN')
    expect(keys).not.toContain('HEALTH_SECRET')
  })

  it('logs console.warn when filtering "undefined" string', async () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'undefined'

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { env } = await import('@/config/env')

    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      '[env] Filtered "undefined" string from NEXT_PUBLIC_SENTRY_DSN',
    )

    warnSpy.mockRestore()
  })
})
