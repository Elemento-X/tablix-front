import {
  PLAN_LIMITS,
  getPlanLimits,
  formatFileSize,
  isFileSizeAllowed,
  isUploadAllowed,
  getRemainingUploads,
  type PlanType,
} from '@/lib/limits'

describe('limits.ts', () => {
  describe('PLAN_LIMITS constant', () => {
    it('should have correct free plan limits', () => {
      expect(PLAN_LIMITS.free).toEqual({
        name: 'Free',
        uploadsPerMonth: 3,
        maxFileSize: 2 * 1024 * 1024, // 2MB
        maxRows: 500,
        maxColumns: 3,
        priorityProcessing: false,
        noWatermark: false,
        fileHistory: false,
      })
    })

    it('should have correct pro plan limits', () => {
      expect(PLAN_LIMITS.pro).toEqual({
        name: 'Pro',
        uploadsPerMonth: 20,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxRows: 5000,
        maxColumns: 10,
        priorityProcessing: true,
        noWatermark: true,
        fileHistory: true,
        fileHistoryDays: 30,
      })
    })

    it('should have correct enterprise plan limits', () => {
      expect(PLAN_LIMITS.enterprise).toEqual({
        name: 'Enterprise',
        uploadsPerMonth: Infinity,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxRows: Infinity,
        maxColumns: Infinity,
        priorityProcessing: true,
        noWatermark: true,
        fileHistory: true,
        fileHistoryDays: 90,
      })
    })
  })

  describe('getPlanLimits', () => {
    it('should return free plan limits', () => {
      const limits = getPlanLimits('free')
      expect(limits).toBe(PLAN_LIMITS.free)
    })

    it('should return pro plan limits', () => {
      const limits = getPlanLimits('pro')
      expect(limits).toBe(PLAN_LIMITS.pro)
    })

    it('should return enterprise plan limits', () => {
      const limits = getPlanLimits('enterprise')
      expect(limits).toBe(PLAN_LIMITS.enterprise)
    })
  })

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(2097152)).toBe('2 MB')
      expect(formatFileSize(10485760)).toBe('10 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
      expect(formatFileSize(2147483648)).toBe('2 GB')
    })

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB')
    })
  })

  describe('isFileSizeAllowed', () => {
    describe('free plan', () => {
      it('should allow files under 2MB', () => {
        expect(isFileSizeAllowed(1024 * 1024, 'free')).toBe(true) // 1MB
        expect(isFileSizeAllowed(2 * 1024 * 1024 - 1, 'free')).toBe(true) // 2MB - 1 byte
      })

      it('should allow files exactly 2MB', () => {
        expect(isFileSizeAllowed(2 * 1024 * 1024, 'free')).toBe(true) // Exactly 2MB
      })

      it('should reject files over 2MB', () => {
        expect(isFileSizeAllowed(2 * 1024 * 1024 + 1, 'free')).toBe(false) // 2MB + 1 byte
        expect(isFileSizeAllowed(5 * 1024 * 1024, 'free')).toBe(false) // 5MB
      })
    })

    describe('pro plan', () => {
      it('should allow files under 10MB', () => {
        expect(isFileSizeAllowed(5 * 1024 * 1024, 'pro')).toBe(true) // 5MB
        expect(isFileSizeAllowed(10 * 1024 * 1024, 'pro')).toBe(true) // 10MB
      })

      it('should reject files over 10MB', () => {
        expect(isFileSizeAllowed(10 * 1024 * 1024 + 1, 'pro')).toBe(false) // 10MB + 1 byte
        expect(isFileSizeAllowed(20 * 1024 * 1024, 'pro')).toBe(false) // 20MB
      })
    })

    describe('enterprise plan', () => {
      it('should allow files up to 50MB', () => {
        expect(isFileSizeAllowed(50 * 1024 * 1024, 'enterprise')).toBe(true) // 50MB
      })

      it('should reject files over 50MB', () => {
        expect(isFileSizeAllowed(50 * 1024 * 1024 + 1, 'enterprise')).toBe(false)
        expect(isFileSizeAllowed(100 * 1024 * 1024, 'enterprise')).toBe(false)
      })
    })
  })

  describe('isUploadAllowed', () => {
    describe('free plan', () => {
      it('should allow uploads when under limit', () => {
        expect(isUploadAllowed(0, 'free')).toBe(true)
        expect(isUploadAllowed(1, 'free')).toBe(true)
        expect(isUploadAllowed(2, 'free')).toBe(true)
      })

      it('should reject uploads when at limit', () => {
        expect(isUploadAllowed(3, 'free')).toBe(false)
      })

      it('should reject uploads when over limit', () => {
        expect(isUploadAllowed(4, 'free')).toBe(false)
        expect(isUploadAllowed(10, 'free')).toBe(false)
      })
    })

    describe('pro plan', () => {
      it('should allow uploads when under limit', () => {
        expect(isUploadAllowed(0, 'pro')).toBe(true)
        expect(isUploadAllowed(10, 'pro')).toBe(true)
        expect(isUploadAllowed(19, 'pro')).toBe(true)
      })

      it('should reject uploads when at limit', () => {
        expect(isUploadAllowed(20, 'pro')).toBe(false)
      })

      it('should reject uploads when over limit', () => {
        expect(isUploadAllowed(21, 'pro')).toBe(false)
        expect(isUploadAllowed(100, 'pro')).toBe(false)
      })
    })

    describe('enterprise plan', () => {
      it('should always allow uploads (unlimited)', () => {
        expect(isUploadAllowed(0, 'enterprise')).toBe(true)
        expect(isUploadAllowed(100, 'enterprise')).toBe(true)
        expect(isUploadAllowed(1000000, 'enterprise')).toBe(true)
        expect(isUploadAllowed(Infinity, 'enterprise')).toBe(false) // Edge case: Infinity < Infinity is false
      })
    })
  })

  describe('getRemainingUploads', () => {
    describe('free plan', () => {
      it('should return remaining uploads', () => {
        expect(getRemainingUploads(0, 'free')).toBe(3)
        expect(getRemainingUploads(1, 'free')).toBe(2)
        expect(getRemainingUploads(2, 'free')).toBe(1)
      })

      it('should return 0 when at limit', () => {
        expect(getRemainingUploads(3, 'free')).toBe(0)
      })

      it('should return 0 when over limit (not negative)', () => {
        expect(getRemainingUploads(5, 'free')).toBe(0)
        expect(getRemainingUploads(10, 'free')).toBe(0)
      })
    })

    describe('pro plan', () => {
      it('should return remaining uploads', () => {
        expect(getRemainingUploads(0, 'pro')).toBe(20)
        expect(getRemainingUploads(10, 'pro')).toBe(10)
        expect(getRemainingUploads(19, 'pro')).toBe(1)
      })

      it('should return 0 when at or over limit', () => {
        expect(getRemainingUploads(20, 'pro')).toBe(0)
        expect(getRemainingUploads(25, 'pro')).toBe(0)
      })
    })

    describe('enterprise plan', () => {
      it('should return Infinity for unlimited plan', () => {
        expect(getRemainingUploads(0, 'enterprise')).toBe(Infinity)
        expect(getRemainingUploads(100, 'enterprise')).toBe(Infinity)
        expect(getRemainingUploads(10000, 'enterprise')).toBe(Infinity)
      })
    })
  })
})
