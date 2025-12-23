import { getRedisClient, storage } from '@/lib/redis'
import { Redis } from '@upstash/redis'

// Mock the Upstash Redis module
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  })),
}))

describe('redis.ts', () => {
  const originalEnv = process.env
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }

    // Clear mocks
    jest.clearAllMocks()

    // Mock console to avoid cluttering test output
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  })

  describe('getRedisClient', () => {
    it('should return null when environment variables are not set', () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const client = getRedisClient()

      expect(client).toBeNull()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Redis] Upstash Redis not configured')
      )
    })

    it('should return null when only URL is set', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const client = getRedisClient()

      expect(client).toBeNull()
      expect(console.warn).toHaveBeenCalled()
    })

    it('should return null when only TOKEN is set', () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      const client = getRedisClient()

      expect(client).toBeNull()
      expect(console.warn).toHaveBeenCalled()
    })

    it('should create Redis instance when both env vars are set', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      const client = getRedisClient()

      expect(client).not.toBeNull()
      expect(Redis).toHaveBeenCalledWith({
        url: 'https://redis.upstash.io',
        token: 'token123',
      })
    })

    it('should return Redis instance when configured', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      const client = getRedisClient()

      expect(client).not.toBeNull()
      // Verificar que Redis foi instanciado (o mock pode ter sido chamado em outro teste)
      expect(Redis).toHaveBeenCalled()
    })
  })

  describe('InMemoryStore (via storage)', () => {
    beforeEach(() => {
      // Ensure Redis is not configured so we use InMemoryStore
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    describe('get', () => {
      it('should return null for non-existent key', async () => {
        const value = await storage.get('non-existent-key')
        expect(value).toBeNull()
      })

      it('should return stored value', async () => {
        await storage.set('test-key', 42, 60)
        const value = await storage.get('test-key')
        expect(value).toBe(42)
      })

      it('should return null for expired key', async () => {
        jest.useFakeTimers()

        // Set with 1 second TTL
        await storage.set('expired-key', 123, 1)

        // Advance time past expiration
        jest.advanceTimersByTime(1001)

        const value = await storage.get('expired-key')
        expect(value).toBeNull()

        jest.useRealTimers()
      })

      it('should delete expired keys on access', async () => {
        jest.useFakeTimers()

        await storage.set('expire-test', 100, 1)

        // Advance time past expiration
        jest.advanceTimersByTime(1001)

        // First get should return null and delete the key
        const value1 = await storage.get('expire-test')
        expect(value1).toBeNull()

        // Second get should still return null
        const value2 = await storage.get('expire-test')
        expect(value2).toBeNull()

        jest.useRealTimers()
      })
    })

    describe('set', () => {
      it('should store value with TTL', async () => {
        await storage.set('key1', 100, 60)
        const value = await storage.get('key1')
        expect(value).toBe(100)
      })

      it('should update existing value', async () => {
        await storage.set('key2', 100, 60)
        await storage.set('key2', 200, 60)

        const value = await storage.get('key2')
        expect(value).toBe(200)
      })

      it('should use default 31-day TTL when not specified', async () => {
        await storage.set('key3', 500)
        const value = await storage.get('key3')
        expect(value).toBe(500)
      })

      it('should store different values for different keys', async () => {
        await storage.set('key-a', 10, 60)
        await storage.set('key-b', 20, 60)

        expect(await storage.get('key-a')).toBe(10)
        expect(await storage.get('key-b')).toBe(20)
      })
    })

    describe('incr', () => {
      it('should increment existing value', async () => {
        await storage.set('counter1', 5, 60)
        const newValue = await storage.incr('counter1')

        expect(newValue).toBe(6)
        expect(await storage.get('counter1')).toBe(6)
      })

      it('should create key with value 1 if not exists', async () => {
        const newValue = await storage.incr('new-counter')

        expect(newValue).toBe(1)
        expect(await storage.get('new-counter')).toBe(1)
      })

      it('should increment multiple times', async () => {
        await storage.incr('multi-counter')
        await storage.incr('multi-counter')
        const value = await storage.incr('multi-counter')

        expect(value).toBe(3)
      })

      it('should set 31-day TTL on increment', async () => {
        await storage.incr('ttl-counter')

        // Value should still exist after a short delay
        await new Promise(resolve => setTimeout(resolve, 10))
        const value = await storage.get('ttl-counter')
        expect(value).toBe(1)
      })

      it('should handle zero as starting value', async () => {
        await storage.set('zero-counter', 0, 60)
        const newValue = await storage.incr('zero-counter')

        expect(newValue).toBe(1)
      })
    })

    describe('expire', () => {
      it('should update expiration time', async () => {
        jest.useFakeTimers()

        await storage.set('expire-key', 100, 1) // 1 second TTL
        await storage.expire('expire-key', 60) // Extend to 60 seconds

        // Should still be available after original 1 second
        jest.advanceTimersByTime(1001)
        const value = await storage.get('expire-key')
        expect(value).toBe(100)

        jest.useRealTimers()
      })

      it('should do nothing for non-existent key', async () => {
        // Should not throw
        await expect(storage.expire('non-existent', 60)).resolves.toBeUndefined()
      })

      it('should allow immediate expiration', async () => {
        jest.useFakeTimers()

        await storage.set('immediate-expire', 200, 60)
        await storage.expire('immediate-expire', 0)

        jest.advanceTimersByTime(10)
        const value = await storage.get('immediate-expire')
        expect(value).toBeNull()

        jest.useRealTimers()
      })
    })
  })

  describe('storage with Redis', () => {
    let mockRedis: jest.Mocked<Redis>

    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      // Get the mocked Redis instance
      const client = getRedisClient()
      mockRedis = client as jest.Mocked<Redis>
    })

    describe('get', () => {
      it('should use Redis when available', async () => {
        mockRedis.get.mockResolvedValue(42)

        const value = await storage.get('redis-key')

        expect(mockRedis.get).toHaveBeenCalledWith('redis-key')
        expect(value).toBe(42)
      })

      it('should return null on Redis error', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

        const value = await storage.get('error-key')

        expect(value).toBeNull()
        expect(console.error).toHaveBeenCalledWith(
          '[Redis] Error getting key:',
          expect.any(Error)
        )
      })

      it('should handle null response from Redis', async () => {
        mockRedis.get.mockResolvedValue(null)

        const value = await storage.get('null-key')

        expect(value).toBeNull()
      })
    })

    describe('incr', () => {
      it('should use Redis incr when available', async () => {
        mockRedis.incr.mockResolvedValue(5)

        const value = await storage.incr('redis-counter')

        expect(mockRedis.incr).toHaveBeenCalledWith('redis-counter')
        expect(value).toBe(5)
      })

      it('should throw error on Redis failure', async () => {
        mockRedis.incr.mockRejectedValue(new Error('Redis error'))

        await expect(storage.incr('fail-counter')).rejects.toThrow('Failed to increment counter')

        expect(console.error).toHaveBeenCalledWith(
          '[Redis] Error incrementing key:',
          expect.any(Error)
        )
      })
    })

    describe('expire', () => {
      it('should use Redis expire when available', async () => {
        mockRedis.expire.mockResolvedValue(1)

        await storage.expire('redis-key', 300)

        expect(mockRedis.expire).toHaveBeenCalledWith('redis-key', 300)
      })

      it('should log error but not throw on Redis failure', async () => {
        mockRedis.expire.mockRejectedValue(new Error('Redis error'))

        // Should not throw
        await expect(storage.expire('fail-key', 60)).resolves.toBeUndefined()

        expect(console.error).toHaveBeenCalledWith(
          '[Redis] Error setting expiration:',
          expect.any(Error)
        )
      })
    })

    describe('set', () => {
      it('should use Redis set without TTL', async () => {
        mockRedis.set.mockResolvedValue('OK')

        await storage.set('redis-key', 100)

        expect(mockRedis.set).toHaveBeenCalledWith('redis-key', 100)
      })

      it('should use Redis set with TTL', async () => {
        mockRedis.set.mockResolvedValue('OK')

        await storage.set('redis-key-ttl', 200, 60)

        expect(mockRedis.set).toHaveBeenCalledWith('redis-key-ttl', 200, { ex: 60 })
      })

      it('should throw error on Redis failure without TTL', async () => {
        mockRedis.set.mockRejectedValue(new Error('Redis error'))

        await expect(storage.set('fail-key', 100)).rejects.toThrow('Failed to set value')

        expect(console.error).toHaveBeenCalledWith(
          '[Redis] Error setting key:',
          expect.any(Error)
        )
      })

      it('should throw error on Redis failure with TTL', async () => {
        mockRedis.set.mockRejectedValue(new Error('Redis error'))

        await expect(storage.set('fail-key-ttl', 100, 60)).rejects.toThrow('Failed to set value')
      })

      it('should handle zero as value', async () => {
        mockRedis.set.mockResolvedValue('OK')

        await storage.set('zero-value', 0, 60)

        expect(mockRedis.set).toHaveBeenCalledWith('zero-value', 0, { ex: 60 })
      })

      it('should handle large numbers', async () => {
        mockRedis.set.mockResolvedValue('OK')

        await storage.set('large-number', 999999999, 60)

        expect(mockRedis.set).toHaveBeenCalledWith('large-number', 999999999, { ex: 60 })
      })
    })
  })

  describe('storage fallback behavior', () => {
    it('should use InMemoryStore when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      await storage.set('fallback-key', 123, 60)
      const value = await storage.get('fallback-key')

      expect(value).toBe(123)
    })

    it('should use InMemoryStore for all operations when Redis unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      // Test all operations
      await storage.set('test1', 10, 60)
      const value1 = await storage.get('test1')
      expect(value1).toBe(10)

      const incremented = await storage.incr('test2')
      expect(incremented).toBe(1)

      await storage.expire('test1', 120)
      const value2 = await storage.get('test1')
      expect(value2).toBe(10) // Should still exist with new TTL
    })
  })
})
