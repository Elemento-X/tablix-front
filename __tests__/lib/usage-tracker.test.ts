import { NextRequest } from 'next/server'
import {
  checkUploadLimit,
  incrementUploadCount,
  checkFileSizeLimit,
  getUserUsage,
} from '@/lib/usage-tracker'
import { storage } from '@/lib/redis'
import * as fingerprint from '@/lib/fingerprint'
import * as limits from '@/lib/limits'

// Mock dependencies
jest.mock('@/lib/redis', () => ({
  storage: {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}))

jest.mock('@/lib/fingerprint', () => ({
  getUserFingerprint: jest.fn(),
  getUserPlan: jest.fn(),
  getCurrentMonthKey: jest.fn(),
  createUploadCountKey: jest.fn(),
}))

describe('usage-tracker.ts', () => {
  const mockStorage = storage as jest.Mocked<typeof storage>
  const mockGetUserFingerprint = fingerprint.getUserFingerprint as jest.MockedFunction<typeof fingerprint.getUserFingerprint>
  const mockGetUserPlan = fingerprint.getUserPlan as jest.MockedFunction<typeof fingerprint.getUserPlan>
  const mockGetCurrentMonthKey = fingerprint.getCurrentMonthKey as jest.MockedFunction<typeof fingerprint.getCurrentMonthKey>
  const mockCreateUploadCountKey = fingerprint.createUploadCountKey as jest.MockedFunction<typeof fingerprint.createUploadCountKey>

  const createMockRequest = (): NextRequest => {
    return new NextRequest('http://localhost:3000/test')
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetUserFingerprint.mockReturnValue({
      fingerprint: 'test-fingerprint-123',
      cookieId: 'cookie-123',
      ip: '192.168.1.1',
      isNew: false,
    })

    mockGetCurrentMonthKey.mockReturnValue('2024-01')
    mockCreateUploadCountKey.mockReturnValue('upload:test-fingerprint-123:2024-01')
  })

  describe('checkUploadLimit', () => {
    describe('Free plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('free')
      })

      it('should allow upload when under limit', async () => {
        mockStorage.get.mockResolvedValue(2) // 2 out of 3 uploads

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('free')
        expect(result.currentUploads).toBe(2)
        expect(result.maxUploads).toBe(3)
        expect(result.remainingUploads).toBe(1)
        expect(result.error).toBeUndefined()
        expect(result.errorCode).toBeUndefined()
      })

      it('should allow upload when at 0 uploads', async () => {
        mockStorage.get.mockResolvedValue(0)

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.currentUploads).toBe(0)
        expect(result.remainingUploads).toBe(3)
      })

      it('should allow upload when storage returns null (new user)', async () => {
        mockStorage.get.mockResolvedValue(null)

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.currentUploads).toBe(0)
        expect(result.remainingUploads).toBe(3)
      })

      it('should block upload when at limit', async () => {
        mockStorage.get.mockResolvedValue(3) // 3 out of 3 uploads

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.plan).toBe('free')
        expect(result.currentUploads).toBe(3)
        expect(result.maxUploads).toBe(3)
        expect(result.remainingUploads).toBe(0)
        expect(result.error).toContain('Upload limit exceeded')
        expect(result.error).toContain('Upgrade to Pro')
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })

      it('should block upload when over limit', async () => {
        mockStorage.get.mockResolvedValue(5) // Over limit

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.remainingUploads).toBe(0)
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })
    })

    describe('Pro plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('pro')
      })

      it('should allow upload when under limit', async () => {
        mockStorage.get.mockResolvedValue(15) // 15 out of 20 uploads

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('pro')
        expect(result.currentUploads).toBe(15)
        expect(result.maxUploads).toBe(20)
        expect(result.remainingUploads).toBe(5)
      })

      it('should block upload when at limit', async () => {
        mockStorage.get.mockResolvedValue(20)

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.error).toContain('Upload limit exceeded')
        expect(result.error).toContain('Contact support for enterprise plan')
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })
    })

    describe('Enterprise plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('enterprise')
      })

      it('should always allow uploads (unlimited)', async () => {
        mockStorage.get.mockResolvedValue(1000000)

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('enterprise')
        expect(result.maxUploads).toBe(Infinity)
        expect(result.remainingUploads).toBe(Infinity)
      })

      it('should allow uploads for new enterprise users', async () => {
        mockStorage.get.mockResolvedValue(null)

        const request = createMockRequest()
        const result = await checkUploadLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.currentUploads).toBe(0)
      })
    })

    it('should use correct fingerprint and month key', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(1)

      const request = createMockRequest()
      await checkUploadLimit(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
      expect(mockStorage.get).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })
  })

  describe('incrementUploadCount', () => {
    beforeEach(() => {
      mockStorage.incr.mockResolvedValue(3)
      mockStorage.expire.mockResolvedValue(undefined)

      // Mock Date to have consistent tests
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should increment upload counter', async () => {
      const request = createMockRequest()
      const newCount = await incrementUploadCount(request)

      expect(newCount).toBe(3)
      expect(mockStorage.incr).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })

    it('should set expiration to end of next month', async () => {
      const request = createMockRequest()
      await incrementUploadCount(request)

      expect(mockStorage.expire).toHaveBeenCalled()

      const expirySeconds = mockStorage.expire.mock.calls[0][1]

      // Should be positive and reasonable (between 1-2 months in seconds)
      expect(expirySeconds).toBeGreaterThan(0)
      expect(expirySeconds).toBeLessThan(60 * 24 * 60 * 60) // Less than 60 days
    })

    it('should calculate expiration correctly for end of January', async () => {
      jest.setSystemTime(new Date('2024-01-31T23:59:59Z'))

      const request = createMockRequest()
      await incrementUploadCount(request)

      const expirySeconds = mockStorage.expire.mock.calls[0][1]

      // End of February 2024 from Jan 31
      // Feb 2024 has 29 days (leap year)
      // From Jan 31 to end of Feb is about 29 days
      expect(expirySeconds).toBeGreaterThan(28 * 24 * 60 * 60) // More than 28 days
      expect(expirySeconds).toBeLessThan(30 * 24 * 60 * 60) // Less than 30 days
    })

    it('should calculate expiration correctly for end of December', async () => {
      jest.setSystemTime(new Date('2024-12-31T23:59:59Z'))

      const request = createMockRequest()
      await incrementUploadCount(request)

      const expirySeconds = mockStorage.expire.mock.calls[0][1]

      // End of January 2025 from Dec 31 2024
      // Should be about 31 days
      expect(expirySeconds).toBeGreaterThan(30 * 24 * 60 * 60)
      expect(expirySeconds).toBeLessThan(32 * 24 * 60 * 60)
    })

    it('should use correct fingerprint and month key', async () => {
      const request = createMockRequest()
      await incrementUploadCount(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
    })

    it('should return the new count after increment', async () => {
      mockStorage.incr.mockResolvedValue(5)

      const request = createMockRequest()
      const result = await incrementUploadCount(request)

      expect(result).toBe(5)
    })

    it('should work for first upload (count 1)', async () => {
      mockStorage.incr.mockResolvedValue(1)

      const request = createMockRequest()
      const result = await incrementUploadCount(request)

      expect(result).toBe(1)
    })
  })

  describe('checkFileSizeLimit', () => {
    describe('Free plan', () => {
      it('should allow files under 2MB', () => {
        const result = checkFileSizeLimit(1 * 1024 * 1024, 'free') // 1MB

        expect(result.allowed).toBe(true)
        expect(result.maxSize).toBe(2 * 1024 * 1024)
        expect(result.error).toBeUndefined()
        expect(result.errorCode).toBeUndefined()
      })

      it('should allow files exactly 2MB', () => {
        const result = checkFileSizeLimit(2 * 1024 * 1024, 'free') // 2MB

        expect(result.allowed).toBe(true)
      })

      it('should block files over 2MB', () => {
        const result = checkFileSizeLimit(3 * 1024 * 1024, 'free') // 3MB

        expect(result.allowed).toBe(false)
        expect(result.maxSize).toBe(2 * 1024 * 1024)
        expect(result.error).toContain('File too large')
        expect(result.error).toContain('Free')
        expect(result.error).toContain('2 MB')
        expect(result.errorCode).toBe('FILE_TOO_LARGE')
      })

      it('should allow zero-byte files', () => {
        const result = checkFileSizeLimit(0, 'free')

        expect(result.allowed).toBe(true)
      })
    })

    describe('Pro plan', () => {
      it('should allow files under 10MB', () => {
        const result = checkFileSizeLimit(5 * 1024 * 1024, 'pro') // 5MB

        expect(result.allowed).toBe(true)
        expect(result.maxSize).toBe(10 * 1024 * 1024)
      })

      it('should allow files exactly 10MB', () => {
        const result = checkFileSizeLimit(10 * 1024 * 1024, 'pro')

        expect(result.allowed).toBe(true)
      })

      it('should block files over 10MB', () => {
        const result = checkFileSizeLimit(11 * 1024 * 1024, 'pro') // 11MB

        expect(result.allowed).toBe(false)
        expect(result.error).toContain('Pro')
        expect(result.error).toContain('10 MB')
        expect(result.errorCode).toBe('FILE_TOO_LARGE')
      })
    })

    describe('Enterprise plan', () => {
      it('should allow files under 50MB', () => {
        const result = checkFileSizeLimit(30 * 1024 * 1024, 'enterprise') // 30MB

        expect(result.allowed).toBe(true)
        expect(result.maxSize).toBe(50 * 1024 * 1024)
      })

      it('should allow files exactly 50MB', () => {
        const result = checkFileSizeLimit(50 * 1024 * 1024, 'enterprise')

        expect(result.allowed).toBe(true)
      })

      it('should block files over 50MB', () => {
        const result = checkFileSizeLimit(51 * 1024 * 1024, 'enterprise') // 51MB

        expect(result.allowed).toBe(false)
        expect(result.error).toContain('Enterprise')
        expect(result.error).toContain('50 MB')
        expect(result.errorCode).toBe('FILE_TOO_LARGE')
      })
    })

    it('should format file sizes correctly in error messages', () => {
      // Free plan - 2MB
      const freeResult = checkFileSizeLimit(3 * 1024 * 1024, 'free')
      expect(freeResult.error).toContain('2 MB')

      // Pro plan - 10MB
      const proResult = checkFileSizeLimit(11 * 1024 * 1024, 'pro')
      expect(proResult.error).toContain('10 MB')

      // Enterprise - 50MB
      const enterpriseResult = checkFileSizeLimit(51 * 1024 * 1024, 'enterprise')
      expect(enterpriseResult.error).toContain('50 MB')
    })
  })

  describe('getUserUsage', () => {
    beforeEach(() => {
      jest.useRealTimers() // Use real timers for this test
    })

    it('should return usage statistics for free plan', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(2)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('free')
      expect(usage.currentUploads).toBe(2)
      expect(usage.maxUploads).toBe(3)
      expect(usage.remainingUploads).toBe(1)
      expect(usage.maxFileSize).toBe(2 * 1024 * 1024)
      expect(usage.maxRows).toBe(500)
      expect(usage.maxColumns).toBe(3)
    })

    it('should return usage statistics for pro plan', async () => {
      mockGetUserPlan.mockReturnValue('pro')
      mockStorage.get.mockResolvedValue(10)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('pro')
      expect(usage.currentUploads).toBe(10)
      expect(usage.maxUploads).toBe(20)
      expect(usage.remainingUploads).toBe(10)
      expect(usage.maxFileSize).toBe(10 * 1024 * 1024)
      expect(usage.maxRows).toBe(5000)
      expect(usage.maxColumns).toBe(10)
    })

    it('should return usage statistics for enterprise plan', async () => {
      mockGetUserPlan.mockReturnValue('enterprise')
      mockStorage.get.mockResolvedValue(1000)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('enterprise')
      expect(usage.currentUploads).toBe(1000)
      expect(usage.maxUploads).toBe(Infinity)
      expect(usage.remainingUploads).toBe(Infinity)
      expect(usage.maxFileSize).toBe(50 * 1024 * 1024)
      expect(usage.maxRows).toBe(Infinity)
      expect(usage.maxColumns).toBe(Infinity)
    })

    it('should handle new users with no uploads', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(null)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.currentUploads).toBe(0)
      expect(usage.remainingUploads).toBe(3)
    })

    it('should use correct fingerprint and month key', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(1)

      const request = createMockRequest()
      await getUserUsage(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
      expect(mockStorage.get).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })

    it('should include all required fields', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(1)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage).toHaveProperty('plan')
      expect(usage).toHaveProperty('currentUploads')
      expect(usage).toHaveProperty('maxUploads')
      expect(usage).toHaveProperty('remainingUploads')
      expect(usage).toHaveProperty('maxFileSize')
      expect(usage).toHaveProperty('maxRows')
      expect(usage).toHaveProperty('maxColumns')
    })
  })
})
