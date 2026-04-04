/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/unification/complete/route'

import { atomicIncrementUnification } from '@/lib/usage-tracker'
import { getUserFingerprint, setFingerprintCookie } from '@/lib/fingerprint'
import { consumeUnificationToken } from '@/lib/security/unification-token'
import {
  validateContentType,
  validateBodySize,
  readBodyWithLimit,
} from '@/lib/security/validation-schemas'
import { rateLimiters } from '@/lib/security/rate-limit'

// Mock dependencies
jest.mock('@/lib/usage-tracker', () => ({
  atomicIncrementUnification: jest.fn(),
}))

jest.mock('@/lib/fingerprint', () => ({
  getUserFingerprint: jest.fn(),
  setFingerprintCookie: jest.fn(),
}))

jest.mock('@/lib/security/unification-token', () => ({
  consumeUnificationToken: jest.fn(),
}))

jest.mock('@/lib/security/validation-schemas', () => ({
  validateContentType: jest.fn(() => ({ valid: true })),
  validateBodySize: jest.fn(() => ({ valid: true })),
  readBodyWithLimit: jest.fn(),
}))

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    api: {
      check: jest.fn(),
    },
  },
}))

describe('POST /api/unification/complete', () => {
  const createRequest = (
    body: Record<string, unknown> = { token: 'valid-token-abc123' },
  ) => {
    return new NextRequest('http://localhost:3000/api/unification/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: validation passes
    ;(validateContentType as jest.Mock).mockReturnValue({ valid: true })
    ;(validateBodySize as jest.Mock).mockReturnValue({ valid: true })
    // Default: readBodyWithLimit reads the actual request body stream
    ;(readBodyWithLimit as jest.Mock).mockImplementation(
      async (request: Request) => {
        const body = request.body
        if (!body) {
          return { error: 'Missing request body' }
        }
        const reader = body.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
        reader.releaseLock()
        const totalBytes = chunks.reduce((sum, c) => sum + c.byteLength, 0)
        const result = new Uint8Array(totalBytes)
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.byteLength
        }
        return { body: result.buffer }
      },
    )

    // Default: rate limit passes
    ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
      success: true,
      remaining: 99,
    })
    ;(getUserFingerprint as jest.Mock).mockReturnValue({
      isNew: false,
      cookieId: 'existing-user',
      fingerprint: 'test-fingerprint-hash',
    })
    ;(consumeUnificationToken as jest.Mock).mockResolvedValue(true)
  })

  describe('rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      ;(rateLimiters.api.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Please try again later.')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('Retry-After')).toBe('60')
    })
  })

  describe('Content-Type validation', () => {
    it('should return 415 when Content-Type is invalid', async () => {
      ;(validateContentType as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Content-Type must be application/json',
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(415)
      expect(data.error).toBe('Content-Type must be application/json')
    })
  })

  describe('body size validation', () => {
    it('should return 413 when body is too large', async () => {
      // readBodyWithLimit is the real gate now (replaces validateBodySize)
      ;(readBodyWithLimit as jest.Mock).mockResolvedValue({
        error: 'Request body too large (max 1MB)',
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('Request body too large (max 1MB)')
    })
  })

  describe('token validation', () => {
    it('should return 413 when no body provided (missing body)', async () => {
      // readBodyWithLimit returns error when body stream is absent
      ;(readBodyWithLimit as jest.Mock).mockResolvedValue({
        error: 'Missing request body',
      })

      const request = new NextRequest(
        'http://localhost:3000/api/unification/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('Missing request body')
    })

    it('should return 400 when body is not valid JSON', async () => {
      // readBodyWithLimit returns bytes that are not valid JSON
      ;(readBodyWithLimit as jest.Mock).mockResolvedValue({
        body: new TextEncoder().encode('not-valid-json').buffer,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/unification/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not-valid-json',
        },
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('should return 400 when token is missing from body', async () => {
      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing unification token')
    })

    it('should return 400 when token is not a string (typeof check — Card #79)', async () => {
      // body.token exists but is a number — should be rejected by typeof check
      const request = createRequest({ token: 12345 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing unification token')
      // consumeUnificationToken must NOT be called with a non-string token
      expect(consumeUnificationToken).not.toHaveBeenCalled()
    })

    it('should return 400 when token is null', async () => {
      const request = createRequest({ token: null })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing unification token')
    })

    it('should return 400 when token is an object', async () => {
      const request = createRequest({ token: { nested: 'value' } })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing unification token')
      expect(consumeUnificationToken).not.toHaveBeenCalled()
    })

    it('should return 403 when token is invalid or expired', async () => {
      ;(consumeUnificationToken as jest.Mock).mockResolvedValue(false)

      const request = createRequest({ token: 'invalid-token' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid or expired unification token')
    })

    it('should validate token with correct fingerprint', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 1,
        plan: 'free',
        maxUnifications: 1,
      })

      const request = createRequest({ token: 'my-token' })
      await POST(request)

      expect(consumeUnificationToken).toHaveBeenCalledWith(
        'my-token',
        'test-fingerprint-hash',
      )
    })
  })

  describe('successful requests', () => {
    it('should atomically increment unification count for existing user', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 1,
        plan: 'free',
        maxUnifications: 1,
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.unifications).toEqual({
        current: 1,
        max: 1,
        remaining: 0,
      })

      expect(atomicIncrementUnification).toHaveBeenCalledWith(request)
      expect(setFingerprintCookie).not.toHaveBeenCalled()
    })

    it('should set cookie for new user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-user-id',
        fingerprint: 'new-user-fingerprint',
      })
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 1,
        plan: 'free',
        maxUnifications: 1,
      })

      const request = createRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(setFingerprintCookie).toHaveBeenCalledWith(
        expect.any(Object),
        'new-user-id',
      )
    })

    it('should handle Pro plan with higher limits', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 11,
        plan: 'pro',
        maxUnifications: 40,
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unifications).toEqual({
        current: 11,
        max: 40,
        remaining: 29,
      })
    })
  })

  describe('limit exceeded', () => {
    it('should return 403 when atomic check detects limit reached', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: false,
        newCount: 1,
        plan: 'free',
        maxUnifications: 1,
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unification limit reached for your plan.')
      expect(data.code).toBe('LIMIT_EXCEEDED')
    })
  })

  describe('error handling', () => {
    it('should return 500 on atomicIncrementUnification error', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockRejectedValue(
        new Error('Redis error'),
      )

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to record unification')

      jest.restoreAllMocks()
    })

    it('should return 500 on fingerprint error', async () => {
      ;(getUserFingerprint as jest.Mock).mockImplementation(() => {
        throw new Error('Fingerprint error')
      })

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to record unification')

      jest.restoreAllMocks()
    })
  })

  describe('edge cases', () => {
    it('should handle last available unification correctly', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 40,
        plan: 'pro',
        maxUnifications: 40,
      })

      const request = createRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unifications.remaining).toBe(0)
      expect(data.unifications.current).toBe(40)
    })

    it('should prevent race condition - single atomic operation', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: true,
        newCount: 1,
        plan: 'free',
        maxUnifications: 1,
      })

      const request = createRequest()
      await POST(request)

      expect(atomicIncrementUnification).toHaveBeenCalledTimes(1)
    })

    it('should not increment counter when token is invalid', async () => {
      ;(consumeUnificationToken as jest.Mock).mockResolvedValue(false)

      const request = createRequest({ token: 'bad-token' })
      await POST(request)

      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })
  })
})
