/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/unification/complete/route'

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
}))

import { atomicIncrementUnification } from '@/lib/usage-tracker'
import { getUserFingerprint, setFingerprintCookie } from '@/lib/fingerprint'
import { consumeUnificationToken } from '@/lib/security/unification-token'

describe('POST /api/unification/complete', () => {
  const createRequest = (body: Record<string, unknown> = { token: 'valid-token-abc123' }) => {
    return new NextRequest('http://localhost:3000/api/unification/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUserFingerprint as jest.Mock).mockReturnValue({
      isNew: false,
      cookieId: 'existing-user',
      fingerprint: 'test-fingerprint-hash',
    })
    ;(consumeUnificationToken as jest.Mock).mockResolvedValue(true)
  })

  describe('token validation', () => {
    it('should return 400 when no body provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/unification/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
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

      expect(consumeUnificationToken).toHaveBeenCalledWith('my-token', 'test-fingerprint-hash')
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
      expect(setFingerprintCookie).toHaveBeenCalledWith(expect.any(Object), 'new-user-id')
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
      ;(atomicIncrementUnification as jest.Mock).mockRejectedValue(new Error('Redis error'))

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
