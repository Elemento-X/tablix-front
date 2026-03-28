/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/usage/route'

// Mock dependencies
jest.mock('@/lib/usage-tracker', () => ({
  getUserUsage: jest.fn(),
}))

jest.mock('@/lib/fingerprint', () => ({
  getUserFingerprint: jest.fn(),
  setFingerprintCookie: jest.fn(),
}))

import { getUserUsage } from '@/lib/usage-tracker'
import { getUserFingerprint, setFingerprintCookie } from '@/lib/fingerprint'

describe('GET /api/usage', () => {
  const createRequest = () => {
    return new NextRequest('http://localhost:3000/api/usage', {
      method: 'GET',
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('successful requests', () => {
    it('should return usage data for existing user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'existing-cookie',
      })

      ;(getUserUsage as jest.Mock).mockResolvedValue({
        plan: 'free',
        currentUnifications: 0,
        maxUnifications: 1,
        remainingUnifications: 1,
        maxInputFiles: 3,
        maxFileSize: 1048576,
        maxTotalSize: 1048576,
        maxRows: 500,
        maxColumns: 3,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        plan: 'free',
        unifications: {
          current: 0,
          max: 1,
          remaining: 1,
        },
        limits: {
          maxInputFiles: 3,
          maxFileSize: 1048576,
          maxTotalSize: 1048576,
          maxRows: 500,
          maxColumns: 3,
        },
      })

      // Should not set cookie for existing user
      expect(setFingerprintCookie).not.toHaveBeenCalled()
    })

    it('should set cookie for new user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-cookie-id',
      })

      ;(getUserUsage as jest.Mock).mockResolvedValue({
        plan: 'free',
        currentUnifications: 0,
        maxUnifications: 1,
        remainingUnifications: 1,
        maxInputFiles: 3,
        maxFileSize: 1048576,
        maxTotalSize: 1048576,
        maxRows: 500,
        maxColumns: 3,
      })

      const request = createRequest()
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(setFingerprintCookie).toHaveBeenCalledWith(expect.any(Object), 'new-cookie-id')
    })

    it('should return Pro plan usage data', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'pro-user',
      })

      ;(getUserUsage as jest.Mock).mockResolvedValue({
        plan: 'pro',
        currentUnifications: 10,
        maxUnifications: 40,
        remainingUnifications: 30,
        maxInputFiles: 15,
        maxFileSize: 2097152,
        maxTotalSize: 31457280,
        maxRows: 5000,
        maxColumns: 10,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBe('pro')
      expect(data.unifications.max).toBe(40)
      expect(data.limits.maxInputFiles).toBe(15)
    })

    it('should return Enterprise plan usage data', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'enterprise-user',
      })

      ;(getUserUsage as jest.Mock).mockResolvedValue({
        plan: 'enterprise',
        currentUnifications: 100,
        maxUnifications: Infinity,
        remainingUnifications: Infinity,
        maxInputFiles: Infinity,
        maxFileSize: 52428800,
        maxTotalSize: Infinity,
        maxRows: Infinity,
        maxColumns: Infinity,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBe('enterprise')
    })
  })

  describe('error handling', () => {
    it('should return 500 on getUserUsage error', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'user',
      })

      ;(getUserUsage as jest.Mock).mockRejectedValue(new Error('Database error'))

      // Mock console.error to avoid polluting test output
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get usage statistics')

      jest.restoreAllMocks()
    })

    it('should return 500 on fingerprint error', async () => {
      ;(getUserFingerprint as jest.Mock).mockImplementation(() => {
        throw new Error('Fingerprint error')
      })

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get usage statistics')

      jest.restoreAllMocks()
    })
  })

  describe('user at limit', () => {
    it('should return correct data when user is at unification limit', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'user-at-limit',
      })

      ;(getUserUsage as jest.Mock).mockResolvedValue({
        plan: 'free',
        currentUnifications: 1,
        maxUnifications: 1,
        remainingUnifications: 0,
        maxInputFiles: 3,
        maxFileSize: 1048576,
        maxTotalSize: 1048576,
        maxRows: 500,
        maxColumns: 3,
      })

      const request = createRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unifications.current).toBe(1)
      expect(data.unifications.remaining).toBe(0)
    })
  })
})
