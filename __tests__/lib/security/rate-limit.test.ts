import { NextRequest } from 'next/server'
import {
  rateLimit,
  rateLimiters,
  __resetRateLimitStore,
} from '@/lib/security/rate-limit'

describe('rate-limit.ts', () => {
  // Contador para gerar IPs únicos em cada teste
  let testCounter = 0

  const createRequest = (headers: Record<string, string> = {}): NextRequest => {
    // Se não houver nenhum header de IP especificado, gerar um único para este teste
    if (
      !headers['x-forwarded-for'] &&
      !headers['x-real-ip'] &&
      !headers['cf-connecting-ip']
    ) {
      testCounter++
      headers['x-forwarded-for'] =
        `192.168.${Math.floor(testCounter / 256)}.${testCounter % 256}`
    }
    return new NextRequest('http://localhost:3000/test', {
      headers: new Headers(headers),
    })
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: Date.now() })
    // Reset the rate limit store before each test
    __resetRateLimitStore()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  afterAll(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('rateLimit', () => {
    it('should allow first request', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 3 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      const result = await limiter.check(request)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(2) // 3 max - 1 used = 2 remaining
    })

    it('should allow multiple requests under limit', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 3 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      const result1 = await limiter.check(request)
      const result2 = await limiter.check(request)

      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)
    })

    it('should allow exactly maxRequests requests', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 3 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      const result1 = await limiter.check(request)
      const result2 = await limiter.check(request)
      const result3 = await limiter.check(request)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should block requests when limit is reached', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 3 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      // Make 3 requests to reach limit
      await limiter.check(request)
      await limiter.check(request)
      await limiter.check(request)

      // 4th request should be blocked
      const result = await limiter.check(request)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should block multiple requests over limit', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 2 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request)
      await limiter.check(request)

      const result1 = await limiter.check(request)
      const result2 = await limiter.check(request)

      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
    })

    it('should reset count after interval expires', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 2 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      // Use up limit
      await limiter.check(request)
      await limiter.check(request)

      // Advance time past interval
      jest.advanceTimersByTime(60001)

      // Should allow new requests
      const result = await limiter.check(request)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should reset count exactly at resetTime', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request)

      // Advance time exactly to reset time (need to advance both timers and Date.now())
      jest.advanceTimersByTime(60000)
      jest.setSystemTime(Date.now() + 60000)

      const result = await limiter.check(request)

      expect(result.success).toBe(true)
    })

    it('should track different IPs independently', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 2 })
      const request1 = createRequest({ 'x-forwarded-for': '192.168.1.100' })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.200' })

      // Use up limit for IP1
      await limiter.check(request1)
      await limiter.check(request1)
      const result1 = await limiter.check(request1)

      // IP2 should still have access
      const result2 = await limiter.check(request2)

      expect(result1.success).toBe(false)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)
    })

    it('should handle concurrent requests from same IP', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 5 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      // Make 3 requests
      const results = await Promise.all([
        limiter.check(request),
        limiter.check(request),
        limiter.check(request),
      ])

      // All should succeed
      expect(results.every((r) => r.success)).toBe(true)

      // Remaining should decrease
      const finalResult = await limiter.check(request)
      expect(finalResult.remaining).toBeLessThan(5)
    })

    it('should work with custom interval', async () => {
      const limiter = rateLimit({ interval: 30000, maxRequests: 2 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request)
      await limiter.check(request)

      // Should be blocked
      let result = await limiter.check(request)
      expect(result.success).toBe(false)

      // Advance by 30 seconds (both timers and Date.now())
      jest.advanceTimersByTime(30000)
      jest.setSystemTime(Date.now() + 30000)

      // Should be allowed again
      result = await limiter.check(request)
      expect(result.success).toBe(true)
    })

    it('should work with maxRequests = 1', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      const result1 = await limiter.check(request)
      const result2 = await limiter.check(request)

      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(0)
      expect(result2.success).toBe(false)
    })

    it('should work with high maxRequests', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 100 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      const result = await limiter.check(request)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(99)
    })
  })

  describe('getIdentifier (via rateLimit)', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'x-forwarded-for': '192.168.1.100' })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      // Same IP should be blocked
      expect(result.success).toBe(false)
    })

    it('should use first IP from x-forwarded-for when multiple IPs present', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1',
      })
      const request2 = createRequest({
        'x-forwarded-for': '192.168.1.100, 10.0.0.2',
      })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      // Same first IP should be blocked
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from x-forwarded-for IP', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'x-forwarded-for': '  192.168.1.100  ' })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should use x-real-ip when x-forwarded-for is missing', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'x-real-ip': '10.0.0.5' })
      const request2 = createRequest({ 'x-real-ip': '10.0.0.5' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should trim whitespace from x-real-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'x-real-ip': '  10.0.0.5  ' })
      const request2 = createRequest({ 'x-real-ip': '10.0.0.5' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should prefer cf-connecting-ip over x-forwarded-for', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'cf-connecting-ip': '203.0.113.0',
        'x-forwarded-for': '192.168.1.100',
      })
      const request2 = createRequest({ 'cf-connecting-ip': '203.0.113.0' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should use cf-connecting-ip when other headers are missing', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'cf-connecting-ip': '203.0.113.0' })
      const request2 = createRequest({ 'cf-connecting-ip': '203.0.113.0' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should trim whitespace from cf-connecting-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({ 'cf-connecting-ip': '  203.0.113.0  ' })
      const request2 = createRequest({ 'cf-connecting-ip': '203.0.113.0' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should prefer cf-connecting-ip over x-real-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'cf-connecting-ip': '203.0.113.0',
        'x-real-ip': '10.0.0.5',
      })
      const request2 = createRequest({ 'cf-connecting-ip': '203.0.113.0' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should prefer x-real-ip over x-forwarded-for', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'x-real-ip': '10.0.0.5',
        'x-forwarded-for': '192.168.1.100',
      })
      const request2 = createRequest({ 'x-real-ip': '10.0.0.5' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should use fixed fallback identifier when no headers present', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      // Create requests without any IP headers (bypass createRequest auto-IP)
      const request1 = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({}),
      })
      const request2 = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({}),
      })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      // Same fallback IP (127.0.0.1) means same identifier — should be rate limited
      expect(result.success).toBe(false)
    })

    it('should handle empty header values', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request = createRequest({ 'x-forwarded-for': '' })

      // Should not crash and should generate fallback identifier
      const result = await limiter.check(request)
      expect(result.success).toBe(true)
    })
  })

  describe('rateLimiters presets', () => {
    it('should have upload limiter with 10 requests per minute', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      // Should allow 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiters.upload.check(request)
        expect(result.success).toBe(true)
      }

      // 11th request should be blocked
      const result = await rateLimiters.upload.check(request)
      expect(result.success).toBe(false)
    })

    it('should have process limiter with 5 requests per minute', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.101' })

      // Should allow 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiters.process.check(request)
        expect(result.success).toBe(true)
      }

      // 6th request should be blocked
      const result = await rateLimiters.process.check(request)
      expect(result.success).toBe(false)
    })

    it('should have api limiter with 100 requests per minute', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.102' })

      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        const result = await rateLimiters.api.check(request)
        expect(result.success).toBe(true)
      }

      // 101st request should be blocked
      const result = await rateLimiters.api.check(request)
      expect(result.success).toBe(false)
    })

    it('should track limiters independently', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.103' })

      // Use upload limiter
      await rateLimiters.upload.check(request)

      // Process limiter should be independent
      const result = await rateLimiters.process.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4) // First request to process limiter
    })

    it('should reset upload limiter after 1 minute', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.104' })

      // Use up upload limit
      for (let i = 0; i < 10; i++) {
        await rateLimiters.upload.check(request)
      }

      // Should be blocked
      let result = await rateLimiters.upload.check(request)
      expect(result.success).toBe(false)

      // Advance time by 1 minute (both timers and Date.now())
      jest.advanceTimersByTime(60000)
      jest.setSystemTime(Date.now() + 60000)

      // Should be allowed again
      result = await rateLimiters.upload.check(request)
      expect(result.success).toBe(true)
    })
  })

  describe('remaining count accuracy', () => {
    it('should return correct remaining count for each request', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 5 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.105' })

      const result1 = await limiter.check(request)
      expect(result1.remaining).toBe(4)

      const result2 = await limiter.check(request)
      expect(result2.remaining).toBe(3)

      const result3 = await limiter.check(request)
      expect(result3.remaining).toBe(2)

      const result4 = await limiter.check(request)
      expect(result4.remaining).toBe(1)

      const result5 = await limiter.check(request)
      expect(result5.remaining).toBe(0)
    })

    it('should return 0 remaining when limit exceeded', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 2 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.106' })

      await limiter.check(request)
      await limiter.check(request)
      const result = await limiter.check(request)

      expect(result.remaining).toBe(0)
    })
  })

  describe('cleanup of expired entries', () => {
    it('should clean up expired entries when interval fires', async () => {
      const limiter = rateLimit({ interval: 1000, maxRequests: 2 })
      const request = createRequest({ 'x-forwarded-for': '10.0.0.1' })

      // Use up limit
      await limiter.check(request)
      await limiter.check(request)

      let result = await limiter.check(request)
      expect(result.success).toBe(false)

      // Advance time well past interval to trigger expiry + cleanup
      jest.advanceTimersByTime(10 * 60 * 1000 + 2000) // 10 min + 2s to trigger cleanup interval
      jest.setSystemTime(Date.now() + 10 * 60 * 1000 + 2000)

      // Entry should have expired, new request allowed
      result = await limiter.check(request)
      expect(result.success).toBe(true)
    })

    it('should execute setInterval cleanup callback and delete expired entries', async () => {
      jest.resetModules()

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl } = require('@/lib/security/rate-limit')
      const limiter = rl({ interval: 1000, maxRequests: 1 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '99.99.99.99' }),
      })

      await limiter.check(request)
      let result = await limiter.check(request)
      expect(result.success).toBe(false)

      // Advance past entry's resetTime (1s) and past cleanup interval (10min)
      jest.advanceTimersByTime(10 * 60 * 1000 + 2000)
      jest.setSystemTime(Date.now() + 10 * 60 * 1000 + 2000)

      result = await limiter.check(request)
      expect(result.success).toBe(true)
    })

    it('should handle interval without unref method', async () => {
      jest.resetModules()

      // Mock setInterval to return object without unref
      const originalSetInterval = global.setInterval
      const mockSetInterval = (...args: Parameters<typeof setInterval>) => {
        const id = originalSetInterval(...args)
        const idWithoutUnref = Object.create(id)
        idWithoutUnref.unref = undefined
        return idWithoutUnref
      }
      global.setInterval = mockSetInterval as typeof setInterval

      // Re-require module — the `if (typeof cleanupInterval.unref === 'function')` false branch is now hit
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl } = require('@/lib/security/rate-limit')
      const limiter = rl({ interval: 60000, maxRequests: 5 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '77.77.77.77' }),
      })

      const result = await limiter.check(request)
      expect(result.success).toBe(true)

      global.setInterval = originalSetInterval
    })

    it('should NOT delete entries that have not yet expired during cleanup', async () => {
      jest.resetModules()

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl } = require('@/lib/security/rate-limit')
      // Long interval (30min) — entry won't expire when cleanup runs at 10min
      const limiter = rl({ interval: 30 * 60 * 1000, maxRequests: 1 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '88.88.88.88' }),
      })

      await limiter.check(request)

      // Trigger cleanup (10min) but entry resetTime is 30min away
      jest.advanceTimersByTime(10 * 60 * 1000 + 1000)
      jest.setSystemTime(Date.now() + 10 * 60 * 1000 + 1000)

      // Entry still valid — should remain blocked
      const result = await limiter.check(request)
      expect(result.success).toBe(false)
    })
  })

  describe('Upstash Redis path', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should use Upstash when available, then fall back on error', async () => {
      jest.resetModules()

      const mockLimitFn = jest
        .fn()
        .mockResolvedValue({ success: true, remaining: 7 })

      jest.doMock('@/lib/redis', () => ({
        getRedisClient: () => ({}),
      }))

      jest.doMock('@upstash/ratelimit', () => ({
        Ratelimit: class MockRatelimit {
          static slidingWindow() {
            return {}
          }

          limit = mockLimitFn
        },
      }))

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl } = require('@/lib/security/rate-limit')
      const limiter = rl({ interval: 60000, maxRequests: 10 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '1.2.3.4' }),
      })

      // Success path — Upstash returns its result
      const result = await limiter.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(7)
      expect(mockLimitFn).toHaveBeenCalled()

      // Failure path — Upstash throws, falls back to in-memory
      mockLimitFn.mockRejectedValueOnce(new Error('Redis connection lost'))
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const fallbackResult = await limiter.check(request)
      expect(fallbackResult.success).toBe(true)
      expect(fallbackResult.remaining).toBe(9) // in-memory fresh count
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Rate Limit] Redis failed:',
        'Redis connection lost',
      )
    })

    it('should fall back to in-memory when @upstash/ratelimit or Redis is unavailable', async () => {
      // Test 1: @upstash/ratelimit throws on require
      jest.resetModules()

      jest.doMock('@/lib/redis', () => ({
        getRedisClient: () => ({}),
      }))

      jest.doMock('@upstash/ratelimit', () => {
        throw new Error('Module not found')
      })

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl1 } = require('@/lib/security/rate-limit')
      const limiter1 = rl1({ interval: 60000, maxRequests: 5 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '1.2.3.4' }),
      })

      let result = await limiter1.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)

      // Test 2: @/lib/redis throws on require
      jest.resetModules()

      jest.doMock('@/lib/redis', () => {
        throw new Error('Redis module not found')
      })

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl2 } = require('@/lib/security/rate-limit')
      const limiter2 = rl2({ interval: 60000, maxRequests: 5 })

      result = await limiter2.check(request)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('namespace isolation', () => {
    it('should use custom namespace when provided', async () => {
      const limiter1 = rateLimit({
        interval: 60000,
        maxRequests: 1,
        namespace: 'ns-A',
      })
      const limiter2 = rateLimit({
        interval: 60000,
        maxRequests: 1,
        namespace: 'ns-B',
      })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.200' })

      await limiter1.check(request)
      // limiter1 should be blocked
      const blocked = await limiter1.check(request)
      expect(blocked.success).toBe(false)

      // limiter2 should be independent (different namespace)
      const allowed = await limiter2.check(request)
      expect(allowed.success).toBe(true)
    })

    it('should use auto-generated namespace when none provided', async () => {
      // Two limiters with same options but no namespace should be independent
      // The auto-generated namespace uses Date.now(), so advance time between creations
      const limiter1 = rateLimit({ interval: 60000, maxRequests: 1 })
      jest.advanceTimersByTime(1) // ensure different timestamp for namespace
      const limiter2 = rateLimit({ interval: 60000, maxRequests: 1 })
      const request = createRequest({ 'x-forwarded-for': '192.168.1.201' })

      await limiter1.check(request)
      const blocked = await limiter1.check(request)
      expect(blocked.success).toBe(false)

      const allowed = await limiter2.check(request)
      expect(allowed.success).toBe(true)
    })
  })

  describe('fail-closed behavior in production', () => {
    afterEach(() => {
      // Restore NODE_ENV back to 'test' after each test
      process.env.NODE_ENV = 'test'
      jest.restoreAllMocks()
    })

    it('should reject request (fail-closed) when Redis throws in NODE_ENV=production', async () => {
      jest.resetModules()

      const mockLimitFn = jest
        .fn()
        .mockRejectedValue(new Error('Redis unavailable'))

      jest.doMock('@/lib/redis', () => ({
        getRedisClient: () => ({}),
      }))

      jest.doMock('@upstash/ratelimit', () => ({
        Ratelimit: class {
          static slidingWindow() {
            return {}
          }

          limit = mockLimitFn
        },
      }))

      // Set NODE_ENV to production — the branch checks process.env.NODE_ENV at call time
      process.env.NODE_ENV = 'production'

      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { rateLimit: rl } = require('@/lib/security/rate-limit')
      const limiter = rl({ interval: 60000, maxRequests: 10 })
      const request = new NextRequest('http://localhost:3000/test', {
        headers: new Headers({ 'x-forwarded-for': '5.6.7.8' }),
      })

      const result = await limiter.check(request)
      // In production, Redis failure must reject — never fall back to in-memory
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Rate Limit] Redis failed:',
        'Redis unavailable',
      )
    })
  })
})
