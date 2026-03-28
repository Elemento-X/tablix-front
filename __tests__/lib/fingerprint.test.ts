import { NextRequest, NextResponse } from 'next/server'
import {
  getUserFingerprint,
  setFingerprintCookie,
  getUserPlan,
  getCurrentMonthKey,
  createUploadCountKey,
} from '@/lib/fingerprint'

describe('fingerprint.ts', () => {
  describe('getUserFingerprint', () => {
    const createRequest = (
      options: {
        headers?: Record<string, string>
        cookie?: string
      } = {},
    ): NextRequest => {
      const url = 'http://localhost:3000/test'
      const headers = new Headers(options.headers || {})

      if (options.cookie) {
        headers.set('cookie', `tablix_fp=${options.cookie}`)
      }

      return new NextRequest(url, { headers })
    }

    describe('IP extraction', () => {
      it('should extract IP from x-forwarded-for header', () => {
        const request = createRequest({
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('192.168.1.100')
      })

      it('should use first IP from x-forwarded-for when multiple IPs present', () => {
        const request = createRequest({
          headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('192.168.1.100')
      })

      it('should trim whitespace from x-forwarded-for IP', () => {
        const request = createRequest({
          headers: { 'x-forwarded-for': '  192.168.1.100  ' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('192.168.1.100')
      })

      it('should extract IP from x-real-ip header when x-forwarded-for is missing', () => {
        const request = createRequest({
          headers: { 'x-real-ip': '10.0.0.5' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('10.0.0.5')
      })

      it('should trim whitespace from x-real-ip', () => {
        const request = createRequest({
          headers: { 'x-real-ip': '  10.0.0.5  ' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('10.0.0.5')
      })

      it('should prefer x-forwarded-for over x-real-ip', () => {
        const request = createRequest({
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'x-real-ip': '10.0.0.5',
          },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('192.168.1.100')
      })

      it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
        const request = createRequest({
          headers: { 'cf-connecting-ip': '203.0.113.0' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('203.0.113.0')
      })

      it('should trim whitespace from cf-connecting-ip', () => {
        const request = createRequest({
          headers: { 'cf-connecting-ip': '  203.0.113.0  ' },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('203.0.113.0')
      })

      it('should prefer x-forwarded-for over cf-connecting-ip', () => {
        const request = createRequest({
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'cf-connecting-ip': '203.0.113.0',
          },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('192.168.1.100')
      })

      it('should prefer x-real-ip over cf-connecting-ip', () => {
        const request = createRequest({
          headers: {
            'x-real-ip': '10.0.0.5',
            'cf-connecting-ip': '203.0.113.0',
          },
        })
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('10.0.0.5')
      })

      it('should fallback to 127.0.0.1 when no IP headers present', () => {
        const request = createRequest()
        const result = getUserFingerprint(request)

        expect(result.ip).toBe('127.0.0.1')
      })
    })

    describe('Cookie handling', () => {
      it('should create new fingerprint ID when no cookie exists', () => {
        const request = createRequest()
        const result = getUserFingerprint(request)

        expect(result.isNew).toBe(true)
        expect(result.cookieId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/)
        expect(result.cookieId.length).toBeGreaterThan(10)
      })

      it('should use existing cookie ID when cookie exists', () => {
        const existingId = '12345-abcdef'
        const request = createRequest({ cookie: existingId })
        const result = getUserFingerprint(request)

        expect(result.isNew).toBe(false)
        expect(result.cookieId).toBe(existingId)
      })

      it('should generate different IDs for different new users', () => {
        const request1 = createRequest()
        const request2 = createRequest()

        const result1 = getUserFingerprint(request1)
        const result2 = getUserFingerprint(request2)

        expect(result1.cookieId).not.toBe(result2.cookieId)
      })
    })

    describe('Fingerprint generation', () => {
      it('should generate consistent fingerprint for same cookie + IP', () => {
        const cookieId = 'test-123'
        const request1 = createRequest({
          cookie: cookieId,
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
        const request2 = createRequest({
          cookie: cookieId,
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })

        const result1 = getUserFingerprint(request1)
        const result2 = getUserFingerprint(request2)

        expect(result1.fingerprint).toBe(result2.fingerprint)
      })

      it('should generate different fingerprints for different IPs', () => {
        const cookieId = 'test-123'
        const request1 = createRequest({
          cookie: cookieId,
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
        const request2 = createRequest({
          cookie: cookieId,
          headers: { 'x-forwarded-for': '192.168.1.200' },
        })

        const result1 = getUserFingerprint(request1)
        const result2 = getUserFingerprint(request2)

        expect(result1.fingerprint).not.toBe(result2.fingerprint)
      })

      it('should generate different fingerprints for different cookie IDs', () => {
        const request1 = createRequest({
          cookie: 'user1-abc',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
        const request2 = createRequest({
          cookie: 'user2-xyz',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })

        const result1 = getUserFingerprint(request1)
        const result2 = getUserFingerprint(request2)

        expect(result1.fingerprint).not.toBe(result2.fingerprint)
      })

      it('should generate 32-character hex fingerprint', () => {
        const request = createRequest()
        const result = getUserFingerprint(request)

        expect(result.fingerprint).toMatch(/^[a-f0-9]{32}$/)
        expect(result.fingerprint.length).toBe(32)
      })

      it('should include all required fields in result', () => {
        const request = createRequest({
          cookie: 'test-123',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
        const result = getUserFingerprint(request)

        expect(result).toHaveProperty('fingerprint')
        expect(result).toHaveProperty('cookieId')
        expect(result).toHaveProperty('ip')
        expect(result).toHaveProperty('isNew')
        expect(typeof result.fingerprint).toBe('string')
        expect(typeof result.cookieId).toBe('string')
        expect(typeof result.ip).toBe('string')
        expect(typeof result.isNew).toBe('boolean')
      })
    })
  })

  describe('setFingerprintCookie', () => {
    it('should set cookie with correct name and value', () => {
      const response = NextResponse.json({})
      const cookieId = 'test-fingerprint-123'

      setFingerprintCookie(response, cookieId)

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.value).toBe(cookieId)
    })

    it('should set httpOnly flag', () => {
      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.httpOnly).toBe(true)
    })

    it('should set sameSite to strict', () => {
      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.sameSite).toBe('strict')
    })

    it('should set path to /', () => {
      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.path).toBe('/')
    })

    it('should set maxAge to 1 year in seconds', () => {
      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      const oneYearInSeconds = 60 * 60 * 24 * 365
      expect(cookie?.maxAge).toBe(oneYearInSeconds)
    })

    it('should set secure flag to true in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.secure).toBe(true)

      process.env.NODE_ENV = originalEnv
    })

    it('should set secure flag to false in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.secure).toBe(false)

      process.env.NODE_ENV = originalEnv
    })

    it('should set secure flag to false in test environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      const response = NextResponse.json({})
      setFingerprintCookie(response, 'test-123')

      const cookie = response.cookies.get('tablix_fp')
      expect(cookie?.secure).toBe(false)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getUserPlan', () => {
    const createRequest = (headers: Record<string, string> = {}): NextRequest => {
      return new NextRequest('http://localhost:3000/test', {
        headers: new Headers(headers),
      })
    }

    it('should return "free" by default', () => {
      const request = createRequest()
      const plan = getUserPlan(request)

      expect(plan).toBe('free')
    })

    it('should always return "free" regardless of x-tablix-plan header', () => {
      expect(getUserPlan(createRequest({ 'x-tablix-plan': 'pro' }))).toBe('free')
      expect(getUserPlan(createRequest({ 'x-tablix-plan': 'enterprise' }))).toBe('free')
      expect(getUserPlan(createRequest({ 'x-tablix-plan': 'Pro' }))).toBe('free')
      expect(getUserPlan(createRequest({ 'x-tablix-plan': 'invalid' }))).toBe('free')
      expect(getUserPlan(createRequest({ 'x-tablix-plan': '' }))).toBe('free')
    })
  })

  describe('getCurrentMonthKey', () => {
    it('should return current month in YYYY-MM format', () => {
      const monthKey = getCurrentMonthKey()

      expect(monthKey).toMatch(/^\d{4}-\d{2}$/)
    })

    it('should pad single-digit months with zero', () => {
      const now = new Date()
      const month = now.getMonth() + 1
      const monthKey = getCurrentMonthKey()

      if (month < 10) {
        expect(monthKey).toMatch(/^\d{4}-0\d$/)
      } else {
        expect(monthKey).toMatch(/^\d{4}-\d{2}$/)
      }
    })

    it('should return correct year', () => {
      const now = new Date()
      const year = now.getFullYear()
      const monthKey = getCurrentMonthKey()

      expect(monthKey.startsWith(year.toString())).toBe(true)
    })

    it('should return correct month', () => {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const monthKey = getCurrentMonthKey()

      expect(monthKey.endsWith(month)).toBe(true)
    })

    it('should generate same key when called multiple times in same month', () => {
      const key1 = getCurrentMonthKey()
      const key2 = getCurrentMonthKey()

      expect(key1).toBe(key2)
    })
  })

  describe('createUploadCountKey', () => {
    it('should create key in correct format', () => {
      const fingerprint = 'abc123def456'
      const monthKey = '2024-01'
      const key = createUploadCountKey(fingerprint, monthKey)

      expect(key).toBe('upload:abc123def456:2024-01')
    })

    it('should include upload prefix', () => {
      const key = createUploadCountKey('fingerprint', '2024-01')
      expect(key.startsWith('upload:')).toBe(true)
    })

    it('should include fingerprint in middle', () => {
      const fingerprint = 'test-fingerprint-hash'
      const key = createUploadCountKey(fingerprint, '2024-01')

      expect(key).toContain(fingerprint)
      expect(key.split(':')[1]).toBe(fingerprint)
    })

    it('should include month key at end', () => {
      const monthKey = '2024-12'
      const key = createUploadCountKey('fingerprint', monthKey)

      expect(key.endsWith(monthKey)).toBe(true)
      expect(key.split(':')[2]).toBe(monthKey)
    })

    it('should create different keys for different fingerprints', () => {
      const monthKey = '2024-01'
      const key1 = createUploadCountKey('fingerprint1', monthKey)
      const key2 = createUploadCountKey('fingerprint2', monthKey)

      expect(key1).not.toBe(key2)
    })

    it('should create different keys for different months', () => {
      const fingerprint = 'abc123'
      const key1 = createUploadCountKey(fingerprint, '2024-01')
      const key2 = createUploadCountKey(fingerprint, '2024-02')

      expect(key1).not.toBe(key2)
    })

    it('should handle long fingerprints', () => {
      const longFingerprint = 'a'.repeat(100)
      const key = createUploadCountKey(longFingerprint, '2024-01')

      expect(key).toBe(`upload:${longFingerprint}:2024-01`)
    })

    it('should use colon as separator', () => {
      const key = createUploadCountKey('fp', '2024-01')
      const parts = key.split(':')

      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('upload')
      expect(parts[1]).toBe('fp')
      expect(parts[2]).toBe('2024-01')
    })
  })
})
