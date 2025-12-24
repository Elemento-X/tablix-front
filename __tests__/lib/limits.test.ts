import {
  PLAN_LIMITS,
  getPlanLimits,
  formatFileSize,
  isFileSizeAllowed,
  isUnificationAllowed,
  getRemainingUnifications,
  isInputFilesAllowed,
  isTotalSizeAllowed,
  type PlanType,
} from '@/lib/limits'

describe('limits.ts', () => {
  describe('PLAN_LIMITS constant', () => {
    it('should have correct free plan limits', () => {
      expect(PLAN_LIMITS.free).toEqual({
        name: 'Free',
        unificationsPerMonth: 1,
        maxInputFiles: 3,
        maxFileSize: 1 * 1024 * 1024, // 1MB total
        maxTotalSize: 1 * 1024 * 1024, // 1MB total
        maxRows: 500, // total across all input files
        maxColumns: 3,
        priorityProcessing: false,
        noWatermark: false,
        fileHistory: false,
      })
    })

    it('should have correct pro plan limits', () => {
      expect(PLAN_LIMITS.pro).toEqual({
        name: 'Pro',
        unificationsPerMonth: 40,
        maxInputFiles: 15,
        maxFileSize: 2 * 1024 * 1024, // 2MB per file
        maxTotalSize: 30 * 1024 * 1024, // 30MB total
        maxRows: 5000, // per file
        maxColumns: 10,
        priorityProcessing: true,
        noWatermark: true,
        fileHistory: false,
        fileHistoryDays: undefined,
      })
    })

    it('should have correct enterprise plan limits', () => {
      expect(PLAN_LIMITS.enterprise).toEqual({
        name: 'Enterprise',
        unificationsPerMonth: Infinity,
        maxInputFiles: Infinity,
        maxFileSize: 50 * 1024 * 1024, // 50MB per file
        maxTotalSize: Infinity,
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
      it('should allow files under 1MB', () => {
        expect(isFileSizeAllowed(512 * 1024, 'free')).toBe(true) // 512KB
        expect(isFileSizeAllowed(1 * 1024 * 1024 - 1, 'free')).toBe(true) // 1MB - 1 byte
      })

      it('should allow files exactly 1MB', () => {
        expect(isFileSizeAllowed(1 * 1024 * 1024, 'free')).toBe(true) // Exactly 1MB
      })

      it('should reject files over 1MB', () => {
        expect(isFileSizeAllowed(1 * 1024 * 1024 + 1, 'free')).toBe(false) // 1MB + 1 byte
        expect(isFileSizeAllowed(2 * 1024 * 1024, 'free')).toBe(false) // 2MB
      })
    })

    describe('pro plan', () => {
      it('should allow files under 2MB', () => {
        expect(isFileSizeAllowed(1 * 1024 * 1024, 'pro')).toBe(true) // 1MB
        expect(isFileSizeAllowed(2 * 1024 * 1024, 'pro')).toBe(true) // 2MB
      })

      it('should reject files over 2MB', () => {
        expect(isFileSizeAllowed(2 * 1024 * 1024 + 1, 'pro')).toBe(false) // 2MB + 1 byte
        expect(isFileSizeAllowed(5 * 1024 * 1024, 'pro')).toBe(false) // 5MB
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

  describe('isUnificationAllowed', () => {
    describe('free plan', () => {
      it('should allow unifications when under limit', () => {
        expect(isUnificationAllowed(0, 'free')).toBe(true)
      })

      it('should reject unifications when at limit', () => {
        expect(isUnificationAllowed(1, 'free')).toBe(false)
      })

      it('should reject unifications when over limit', () => {
        expect(isUnificationAllowed(2, 'free')).toBe(false)
        expect(isUnificationAllowed(10, 'free')).toBe(false)
      })
    })

    describe('pro plan', () => {
      it('should allow unifications when under limit', () => {
        expect(isUnificationAllowed(0, 'pro')).toBe(true)
        expect(isUnificationAllowed(20, 'pro')).toBe(true)
        expect(isUnificationAllowed(39, 'pro')).toBe(true)
      })

      it('should reject unifications when at limit', () => {
        expect(isUnificationAllowed(40, 'pro')).toBe(false)
      })

      it('should reject unifications when over limit', () => {
        expect(isUnificationAllowed(41, 'pro')).toBe(false)
        expect(isUnificationAllowed(100, 'pro')).toBe(false)
      })
    })

    describe('enterprise plan', () => {
      it('should always allow unifications (unlimited)', () => {
        expect(isUnificationAllowed(0, 'enterprise')).toBe(true)
        expect(isUnificationAllowed(100, 'enterprise')).toBe(true)
        expect(isUnificationAllowed(1000000, 'enterprise')).toBe(true)
        expect(isUnificationAllowed(Infinity, 'enterprise')).toBe(false) // Edge case: Infinity < Infinity is false
      })
    })
  })

  describe('getRemainingUnifications', () => {
    describe('free plan', () => {
      it('should return remaining unifications', () => {
        expect(getRemainingUnifications(0, 'free')).toBe(1)
      })

      it('should return 0 when at limit', () => {
        expect(getRemainingUnifications(1, 'free')).toBe(0)
      })

      it('should return 0 when over limit (not negative)', () => {
        expect(getRemainingUnifications(2, 'free')).toBe(0)
        expect(getRemainingUnifications(10, 'free')).toBe(0)
      })
    })

    describe('pro plan', () => {
      it('should return remaining unifications', () => {
        expect(getRemainingUnifications(0, 'pro')).toBe(40)
        expect(getRemainingUnifications(20, 'pro')).toBe(20)
        expect(getRemainingUnifications(39, 'pro')).toBe(1)
      })

      it('should return 0 when at or over limit', () => {
        expect(getRemainingUnifications(40, 'pro')).toBe(0)
        expect(getRemainingUnifications(50, 'pro')).toBe(0)
      })
    })

    describe('enterprise plan', () => {
      it('should return Infinity for unlimited plan', () => {
        expect(getRemainingUnifications(0, 'enterprise')).toBe(Infinity)
        expect(getRemainingUnifications(100, 'enterprise')).toBe(Infinity)
        expect(getRemainingUnifications(10000, 'enterprise')).toBe(Infinity)
      })
    })
  })

  describe('isInputFilesAllowed', () => {
    describe('free plan', () => {
      it('should allow up to 3 input files', () => {
        expect(isInputFilesAllowed(1, 'free')).toBe(true)
        expect(isInputFilesAllowed(2, 'free')).toBe(true)
        expect(isInputFilesAllowed(3, 'free')).toBe(true)
      })

      it('should reject more than 3 input files', () => {
        expect(isInputFilesAllowed(4, 'free')).toBe(false)
        expect(isInputFilesAllowed(10, 'free')).toBe(false)
      })
    })

    describe('pro plan', () => {
      it('should allow up to 15 input files', () => {
        expect(isInputFilesAllowed(1, 'pro')).toBe(true)
        expect(isInputFilesAllowed(10, 'pro')).toBe(true)
        expect(isInputFilesAllowed(15, 'pro')).toBe(true)
      })

      it('should reject more than 15 input files', () => {
        expect(isInputFilesAllowed(16, 'pro')).toBe(false)
        expect(isInputFilesAllowed(20, 'pro')).toBe(false)
      })
    })

    describe('enterprise plan', () => {
      it('should allow unlimited input files', () => {
        expect(isInputFilesAllowed(100, 'enterprise')).toBe(true)
        expect(isInputFilesAllowed(1000, 'enterprise')).toBe(true)
      })
    })
  })

  describe('isTotalSizeAllowed', () => {
    describe('free plan', () => {
      it('should allow total size up to 1MB', () => {
        expect(isTotalSizeAllowed(512 * 1024, 'free')).toBe(true)
        expect(isTotalSizeAllowed(1 * 1024 * 1024, 'free')).toBe(true)
      })

      it('should reject total size over 1MB', () => {
        expect(isTotalSizeAllowed(1 * 1024 * 1024 + 1, 'free')).toBe(false)
        expect(isTotalSizeAllowed(2 * 1024 * 1024, 'free')).toBe(false)
      })
    })

    describe('pro plan', () => {
      it('should allow total size up to 30MB', () => {
        expect(isTotalSizeAllowed(15 * 1024 * 1024, 'pro')).toBe(true)
        expect(isTotalSizeAllowed(30 * 1024 * 1024, 'pro')).toBe(true)
      })

      it('should reject total size over 30MB', () => {
        expect(isTotalSizeAllowed(30 * 1024 * 1024 + 1, 'pro')).toBe(false)
        expect(isTotalSizeAllowed(50 * 1024 * 1024, 'pro')).toBe(false)
      })
    })

    describe('enterprise plan', () => {
      it('should allow unlimited total size', () => {
        expect(isTotalSizeAllowed(100 * 1024 * 1024, 'enterprise')).toBe(true)
        expect(isTotalSizeAllowed(1000 * 1024 * 1024, 'enterprise')).toBe(true)
      })
    })
  })
})
