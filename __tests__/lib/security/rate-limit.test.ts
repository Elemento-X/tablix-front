import { NextRequest } from 'next/server'
import { rateLimit, rateLimiters } from '@/lib/security/rate-limit'

describe('rate-limit.ts', () => {
  // Contador para gerar IPs únicos em cada teste
  let testCounter = 0

  const createRequest = (headers: Record<string, string> = {}): NextRequest => {
    // Se não houver IP especificado, gerar um único para este teste
    if (!headers['x-forwarded-for']) {
      testCounter++
      headers['x-forwarded-for'] = `192.168.${Math.floor(testCounter / 256)}.${testCounter % 256}`
    }
    return new NextRequest('http://localhost:3000/test', {
      headers: new Headers(headers),
    })
  }

  beforeEach(() => {
    jest.useFakeTimers()
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

      // Advance time exactly to reset time
      jest.advanceTimersByTime(60000)

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
      expect(results.every(r => r.success)).toBe(true)

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

      // Advance by 30 seconds
      jest.advanceTimersByTime(30000)

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
      const request1 = createRequest({ 'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.100, 10.0.0.2' })

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

    it('should prefer x-forwarded-for over x-real-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'x-forwarded-for': '192.168.1.100',
        'x-real-ip': '10.0.0.5',
      })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.100' })

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

    it('should prefer x-forwarded-for over cf-connecting-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'x-forwarded-for': '192.168.1.100',
        'cf-connecting-ip': '203.0.113.0',
      })
      const request2 = createRequest({ 'x-forwarded-for': '192.168.1.100' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should prefer x-real-ip over cf-connecting-ip', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest({
        'x-real-ip': '10.0.0.5',
        'cf-connecting-ip': '203.0.113.0',
      })
      const request2 = createRequest({ 'x-real-ip': '10.0.0.5' })

      await limiter.check(request1)
      const result = await limiter.check(request2)

      expect(result.success).toBe(false)
    })

    it('should generate random identifier when no headers present', async () => {
      const limiter = rateLimit({ interval: 60000, maxRequests: 1 })
      const request1 = createRequest()
      const request2 = createRequest()

      await limiter.check(request1)
      const result = await limiter.check(request2)

      // Different random identifiers should both be allowed
      expect(result.success).toBe(true)
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

    it('should have process limiter with 30 requests per minute', async () => {
      const request = createRequest({ 'x-forwarded-for': '192.168.1.101' })

      // Should allow 30 requests
      for (let i = 0; i < 30; i++) {
        const result = await rateLimiters.process.check(request)
        expect(result.success).toBe(true)
      }

      // 31st request should be blocked
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
      expect(result.remaining).toBe(29) // First request to process limiter
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

      // Advance time by 1 minute
      jest.advanceTimersByTime(60000)

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
})
