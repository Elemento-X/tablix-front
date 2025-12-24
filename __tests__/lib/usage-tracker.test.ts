import { NextRequest } from 'next/server'
import {
  checkUnificationLimit,
  incrementUnificationCount,
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

  describe('checkUnificationLimit', () => {
    describe('Free plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('free')
      })

      it('should allow unification when under limit', async () => {
        mockStorage.get.mockResolvedValue(0) // 0 out of 1 unifications

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('free')
        expect(result.currentUnifications).toBe(0)
        expect(result.maxUnifications).toBe(1)
        expect(result.remainingUnifications).toBe(1)
        expect(result.error).toBeUndefined()
        expect(result.errorCode).toBeUndefined()
      })

      it('should allow unification when storage returns null (new user)', async () => {
        mockStorage.get.mockResolvedValue(null)

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.currentUnifications).toBe(0)
        expect(result.remainingUnifications).toBe(1)
      })

      it('should block unification when at limit', async () => {
        mockStorage.get.mockResolvedValue(1) // 1 out of 1 unifications

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.plan).toBe('free')
        expect(result.currentUnifications).toBe(1)
        expect(result.maxUnifications).toBe(1)
        expect(result.remainingUnifications).toBe(0)
        expect(result.error).toContain('Unification limit exceeded')
        expect(result.error).toContain('Upgrade to Pro')
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })

      it('should block unification when over limit', async () => {
        mockStorage.get.mockResolvedValue(5) // Over limit

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.remainingUnifications).toBe(0)
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })
    })

    describe('Pro plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('pro')
      })

      it('should allow unification when under limit', async () => {
        mockStorage.get.mockResolvedValue(30) // 30 out of 40 unifications

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('pro')
        expect(result.currentUnifications).toBe(30)
        expect(result.maxUnifications).toBe(40)
        expect(result.remainingUnifications).toBe(10)
      })

      it('should block unification when at limit', async () => {
        mockStorage.get.mockResolvedValue(40)

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(false)
        expect(result.error).toContain('Unification limit exceeded')
        expect(result.error).toContain('Contact support for enterprise plan')
        expect(result.errorCode).toBe('LIMIT_EXCEEDED')
      })
    })

    describe('Enterprise plan', () => {
      beforeEach(() => {
        mockGetUserPlan.mockReturnValue('enterprise')
      })

      it('should always allow unifications (unlimited)', async () => {
        mockStorage.get.mockResolvedValue(1000000)

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.plan).toBe('enterprise')
        expect(result.maxUnifications).toBe(Infinity)
        expect(result.remainingUnifications).toBe(Infinity)
      })

      it('should allow unifications for new enterprise users', async () => {
        mockStorage.get.mockResolvedValue(null)

        const request = createMockRequest()
        const result = await checkUnificationLimit(request)

        expect(result.allowed).toBe(true)
        expect(result.currentUnifications).toBe(0)
      })
    })

    it('should use correct fingerprint and month key', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(0)

      const request = createMockRequest()
      await checkUnificationLimit(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
      expect(mockStorage.get).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })
  })

  describe('incrementUnificationCount', () => {
    beforeEach(() => {
      mockStorage.incr.mockResolvedValue(1)
      mockStorage.expire.mockResolvedValue(undefined)

      // Mock Date to have consistent tests
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should increment unification counter', async () => {
      const request = createMockRequest()
      const newCount = await incrementUnificationCount(request)

      expect(newCount).toBe(1)
      expect(mockStorage.incr).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })

    it('should set expiration to end of next month', async () => {
      const request = createMockRequest()
      await incrementUnificationCount(request)

      expect(mockStorage.expire).toHaveBeenCalled()

      const expirySeconds = mockStorage.expire.mock.calls[0][1]

      // Should be positive and reasonable (between 1-2 months in seconds)
      expect(expirySeconds).toBeGreaterThan(0)
      expect(expirySeconds).toBeLessThan(60 * 24 * 60 * 60) // Less than 60 days
    })

    it('should calculate expiration correctly for end of January', async () => {
      jest.setSystemTime(new Date('2024-01-31T23:59:59Z'))

      const request = createMockRequest()
      await incrementUnificationCount(request)

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
      await incrementUnificationCount(request)

      const expirySeconds = mockStorage.expire.mock.calls[0][1]

      // End of January 2025 from Dec 31 2024
      // Should be about 31 days
      expect(expirySeconds).toBeGreaterThan(30 * 24 * 60 * 60)
      expect(expirySeconds).toBeLessThan(32 * 24 * 60 * 60)
    })

    it('should use correct fingerprint and month key', async () => {
      const request = createMockRequest()
      await incrementUnificationCount(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
    })

    it('should return the new count after increment', async () => {
      mockStorage.incr.mockResolvedValue(5)

      const request = createMockRequest()
      const result = await incrementUnificationCount(request)

      expect(result).toBe(5)
    })

    it('should work for first unification (count 1)', async () => {
      mockStorage.incr.mockResolvedValue(1)

      const request = createMockRequest()
      const result = await incrementUnificationCount(request)

      expect(result).toBe(1)
    })
  })

  describe('checkFileSizeLimit', () => {
    describe('Free plan', () => {
      it('should allow files under 1MB', () => {
        const result = checkFileSizeLimit(512 * 1024, 'free') // 512KB

        expect(result.allowed).toBe(true)
        expect(result.maxSize).toBe(1 * 1024 * 1024)
        expect(result.error).toBeUndefined()
        expect(result.errorCode).toBeUndefined()
      })

      it('should allow files exactly 1MB', () => {
        const result = checkFileSizeLimit(1 * 1024 * 1024, 'free') // 1MB

        expect(result.allowed).toBe(true)
      })

      it('should block files over 1MB', () => {
        const result = checkFileSizeLimit(2 * 1024 * 1024, 'free') // 2MB

        expect(result.allowed).toBe(false)
        expect(result.maxSize).toBe(1 * 1024 * 1024)
        expect(result.error).toContain('File too large')
        expect(result.error).toContain('Free')
        expect(result.error).toContain('1 MB')
        expect(result.errorCode).toBe('FILE_TOO_LARGE')
      })

      it('should allow zero-byte files', () => {
        const result = checkFileSizeLimit(0, 'free')

        expect(result.allowed).toBe(true)
      })
    })

    describe('Pro plan', () => {
      it('should allow files under 2MB', () => {
        const result = checkFileSizeLimit(1 * 1024 * 1024, 'pro') // 1MB

        expect(result.allowed).toBe(true)
        expect(result.maxSize).toBe(2 * 1024 * 1024)
      })

      it('should allow files exactly 2MB', () => {
        const result = checkFileSizeLimit(2 * 1024 * 1024, 'pro')

        expect(result.allowed).toBe(true)
      })

      it('should block files over 2MB', () => {
        const result = checkFileSizeLimit(3 * 1024 * 1024, 'pro') // 3MB

        expect(result.allowed).toBe(false)
        expect(result.error).toContain('Pro')
        expect(result.error).toContain('2 MB')
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
      // Free plan - 1MB
      const freeResult = checkFileSizeLimit(2 * 1024 * 1024, 'free')
      expect(freeResult.error).toContain('1 MB')

      // Pro plan - 2MB
      const proResult = checkFileSizeLimit(3 * 1024 * 1024, 'pro')
      expect(proResult.error).toContain('2 MB')

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
      mockStorage.get.mockResolvedValue(0)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('free')
      expect(usage.currentUnifications).toBe(0)
      expect(usage.maxUnifications).toBe(1)
      expect(usage.remainingUnifications).toBe(1)
      expect(usage.maxInputFiles).toBe(3)
      expect(usage.maxFileSize).toBe(1 * 1024 * 1024)
      expect(usage.maxTotalSize).toBe(1 * 1024 * 1024)
      expect(usage.maxRows).toBe(500)
      expect(usage.maxColumns).toBe(3)
    })

    it('should return usage statistics for pro plan', async () => {
      mockGetUserPlan.mockReturnValue('pro')
      mockStorage.get.mockResolvedValue(20)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('pro')
      expect(usage.currentUnifications).toBe(20)
      expect(usage.maxUnifications).toBe(40)
      expect(usage.remainingUnifications).toBe(20)
      expect(usage.maxInputFiles).toBe(15)
      expect(usage.maxFileSize).toBe(2 * 1024 * 1024)
      expect(usage.maxTotalSize).toBe(30 * 1024 * 1024)
      expect(usage.maxRows).toBe(5000)
      expect(usage.maxColumns).toBe(10)
    })

    it('should return usage statistics for enterprise plan', async () => {
      mockGetUserPlan.mockReturnValue('enterprise')
      mockStorage.get.mockResolvedValue(1000)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.plan).toBe('enterprise')
      expect(usage.currentUnifications).toBe(1000)
      expect(usage.maxUnifications).toBe(Infinity)
      expect(usage.remainingUnifications).toBe(Infinity)
      expect(usage.maxInputFiles).toBe(Infinity)
      expect(usage.maxFileSize).toBe(50 * 1024 * 1024)
      expect(usage.maxTotalSize).toBe(Infinity)
      expect(usage.maxRows).toBe(Infinity)
      expect(usage.maxColumns).toBe(Infinity)
    })

    it('should handle new users with no unifications', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(null)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage.currentUnifications).toBe(0)
      expect(usage.remainingUnifications).toBe(1)
    })

    it('should use correct fingerprint and month key', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(0)

      const request = createMockRequest()
      await getUserUsage(request)

      expect(mockGetUserFingerprint).toHaveBeenCalledWith(request)
      expect(mockGetCurrentMonthKey).toHaveBeenCalled()
      expect(mockCreateUploadCountKey).toHaveBeenCalledWith('test-fingerprint-123', '2024-01')
      expect(mockStorage.get).toHaveBeenCalledWith('upload:test-fingerprint-123:2024-01')
    })

    it('should include all required fields', async () => {
      mockGetUserPlan.mockReturnValue('free')
      mockStorage.get.mockResolvedValue(0)

      const request = createMockRequest()
      const usage = await getUserUsage(request)

      expect(usage).toHaveProperty('plan')
      expect(usage).toHaveProperty('currentUnifications')
      expect(usage).toHaveProperty('maxUnifications')
      expect(usage).toHaveProperty('remainingUnifications')
      expect(usage).toHaveProperty('maxInputFiles')
      expect(usage).toHaveProperty('maxFileSize')
      expect(usage).toHaveProperty('maxTotalSize')
      expect(usage).toHaveProperty('maxRows')
      expect(usage).toHaveProperty('maxColumns')
    })
  })
})
