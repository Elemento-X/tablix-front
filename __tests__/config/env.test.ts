describe('config/env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('parses valid env with all variables', async () => {
    process.env.NODE_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token-123'

    const { env } = await import('@/config/env')

    expect(env.NODE_ENV).toBe('production')
    expect(env.UPSTASH_REDIS_REST_URL).toBe('https://redis.upstash.io')
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('token-123')
  })

  it('defaults NODE_ENV to development when not set', async () => {
    delete process.env.NODE_ENV
    process.env.UPSTASH_REDIS_REST_URL = undefined
    process.env.UPSTASH_REDIS_REST_TOKEN = undefined

    const { env } = await import('@/config/env')

    expect(env.NODE_ENV).toBe('development')
  })

  it('allows Redis vars to be optional', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { env } = await import('@/config/env')

    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined()
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
  })

  it('rejects invalid NODE_ENV', async () => {
    process.env.NODE_ENV = 'staging' as string

    await expect(import('@/config/env')).rejects.toThrow()
  })

  it('rejects invalid UPSTASH_REDIS_REST_URL (not a URL)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_URL = 'not-a-url'
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    await expect(import('@/config/env')).rejects.toThrow()
  })

  it('rejects empty UPSTASH_REDIS_REST_TOKEN', async () => {
    process.env.NODE_ENV = 'test'
    process.env.UPSTASH_REDIS_REST_TOKEN = ''

    await expect(import('@/config/env')).rejects.toThrow()
  })

  it('accepts all valid NODE_ENV values', async () => {
    for (const mode of ['production', 'development', 'test'] as const) {
      jest.resetModules()
      process.env = { ...originalEnv }
      process.env.NODE_ENV = mode
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { env } = await import('@/config/env')
      expect(env.NODE_ENV).toBe(mode)
    }
  })

  it('exports Env type matching schema shape', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const { env } = await import('@/config/env')

    expect(Object.keys(env)).toEqual(
      expect.arrayContaining([
        'NODE_ENV',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
      ]),
    )
  })
})
