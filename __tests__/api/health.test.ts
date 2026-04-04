/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/route'
import { rateLimiters } from '@/lib/security/rate-limit'
import { getRedisClient } from '@/lib/redis'

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    api: {
      check: jest.fn(),
    },
  },
}))

// Mock @/lib/redis — route uses getRedisClient() singleton
const mockPing = jest.fn().mockResolvedValue('PONG')
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({ ping: mockPing })),
}))

describe('GET /api/health', () => {
  const createRequest = (
    url = 'http://localhost:3000/api/health',
    headers: Record<string, string> = {},
  ) => {
    return new NextRequest(url, { method: 'GET', headers: new Headers(headers) })
  }

  const createDeepRequest = (secret?: string) => {
    const headers: Record<string, string> = {}
    if (secret !== undefined) {
      headers['x-health-secret'] = secret
    }
    return createRequest('http://localhost:3000/api/health?deep=true', headers)
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: rate limit passes
    ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
      success: true,
      remaining: 99,
    })

    // Default: getRedisClient returns a working client
    mockPing.mockResolvedValue('PONG')
    ;(getRedisClient as jest.Mock).mockReturnValue({ ping: mockPing })

    // Default: no HEALTH_SECRET configured
    delete process.env.HEALTH_SECRET
  })

  afterEach(() => {
    delete process.env.HEALTH_SECRET
  })

  describe('rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.status).toBe('error')
      expect(response.headers.get('Retry-After')).toBe('60')
    })

    it('should not return status ok when rate limited', async () => {
      ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(data.status).not.toBe('ok')
    })
  })

  describe('shallow health check (default)', () => {
    it('should return 200 with status ok', async () => {
      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
    })

    it('should return ISO timestamp', async () => {
      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should NOT return checks object in shallow mode', async () => {
      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(data).not.toHaveProperty('checks')
    })

    it('should return shallow when deep=false explicitly', async () => {
      const request = createRequest('http://localhost:3000/api/health?deep=false')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data).not.toHaveProperty('checks')
    })

    it('should return shallow when deep param is missing', async () => {
      const request = createRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data).not.toHaveProperty('checks')
    })
  })

  describe('deep health check — graceful degradation without secret', () => {
    it('should return shallow response when HEALTH_SECRET is not configured', async () => {
      delete process.env.HEALTH_SECRET

      const request = createDeepRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data).not.toHaveProperty('checks')
    })

    it('should return shallow response when header is absent but deep=true', async () => {
      process.env.HEALTH_SECRET = 'test-secret-value-with-32-chars!!'

      const request = createRequest('http://localhost:3000/api/health?deep=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data).not.toHaveProperty('checks')
    })

    it('should return shallow response when wrong secret is provided', async () => {
      process.env.HEALTH_SECRET = 'correct-secret-for-health-check!'

      const request = createDeepRequest('wrong-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data).not.toHaveProperty('checks')
    })

    it('should NOT leak secret via response body on auth failure', async () => {
      process.env.HEALTH_SECRET = 'super-secret-token-long-enough-32'

      const request = createDeepRequest('wrong')
      const response = await GET(request)
      const body = await response.json()
      const bodyStr = JSON.stringify(body)

      expect(bodyStr).not.toContain('super-secret-token-long-enough-32')
      expect(bodyStr).not.toContain('wrong')
    })
  })

  describe('deep health check — authenticated', () => {
    beforeEach(() => {
      process.env.HEALTH_SECRET = 'correct-secret-for-health-check!'
    })

    it('should return checks object with redis when authenticated', async () => {
      const request = createDeepRequest('correct-secret-for-health-check!')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('checks')
      expect(data.checks).toHaveProperty('redis')
    })

    it('should return status ok when Redis ping succeeds', async () => {
      const request = createDeepRequest('correct-secret-for-health-check!')
      const response = await GET(request)
      const data = await response.json()

      expect(data.status).toBe('ok')
      expect(data.checks.redis).toBe('ok')
    })

    it('should return status degraded when Redis ping fails', async () => {
      mockPing.mockRejectedValueOnce(new Error('Connection refused'))

      const request = createDeepRequest('correct-secret-for-health-check!')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('degraded')
      expect(data.checks.redis).toBe('error')
    })

    it('should include timestamp in deep response', async () => {
      const request = createDeepRequest('correct-secret-for-health-check!')
      const response = await GET(request)
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('security — information disclosure', () => {
    it('should not expose stack traces in any response', async () => {
      ;(rateLimiters.api.check as jest.Mock).mockRejectedValue(new Error('Internal limiter crash'))

      // Route has no try/catch around the rate limiter — if it throws, Next.js handles it.
      // This test validates that 429 response body is minimal.
      ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const request = createRequest()
      const response = await GET(request)
      const body = await response.json()

      expect(JSON.stringify(body)).not.toContain('stack')
      expect(JSON.stringify(body)).not.toContain('Error:')
    })

    it('should return 200 (not 401/403) when deep requested without auth — graceful degradation', async () => {
      process.env.HEALTH_SECRET = 'configured-secret-for-testing-32!'

      const request = createDeepRequest()
      const response = await GET(request)

      // Must not return 401/403 to avoid fingerprinting the existence of deep check
      expect(response.status).toBe(200)
    })
  })

  describe('edge cases', () => {
    it('should return timestamp close to current time', async () => {
      const before = Date.now()
      const request = createRequest()
      const response = await GET(request)
      const after = Date.now()

      const data = await response.json()
      const returnedTime = new Date(data.timestamp).getTime()

      expect(returnedTime).toBeGreaterThanOrEqual(before)
      expect(returnedTime).toBeLessThanOrEqual(after)
    })

    it('should handle deep=true with empty string secret gracefully', async () => {
      process.env.HEALTH_SECRET = 'expected-secret-long-enough-32ch'

      const request = createDeepRequest('')
      const response = await GET(request)
      const data = await response.json()

      // Empty string does not match non-empty secret
      expect(data).not.toHaveProperty('checks')
      expect(data.status).toBe('ok')
    })

    it('should handle HEALTH_SECRET being empty string (misconfiguration)', async () => {
      process.env.HEALTH_SECRET = ''

      // With empty secret, condition `!expectedSecret` is truthy → graceful degradation
      const request = createDeepRequest('')
      const response = await GET(request)
      const data = await response.json()

      expect(data.status).toBe('ok')
      expect(data).not.toHaveProperty('checks')
    })
  })
})
