/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/preview/route'

// Mock dependencies
jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    upload: {
      check: jest.fn(),
    },
  },
}))

jest.mock('@/lib/security/file-validator', () => ({
  sanitizeFileName: jest.fn((name) => name),
  validateFileContent: jest.fn().mockResolvedValue({ valid: true }),
}))

jest.mock('@/lib/security/validation-schemas', () => ({
  validateFileLimits: jest.fn(),
  validateContentType: jest.fn(() => ({ valid: true })),
  sanitizeString: jest.fn((str) => str),
}))

jest.mock('@/lib/usage-tracker', () => ({
  checkUnificationLimit: jest.fn(),
  checkFileSizeLimit: jest.fn(),
}))

jest.mock('@/lib/fingerprint', () => ({
  getUserFingerprint: jest.fn(),
  setFingerprintCookie: jest.fn(),
  getUserPlan: jest.fn(),
}))

jest.mock('@/lib/security/unification-token', () => ({
  generateUnificationToken: jest.fn(),
}))

import { rateLimiters } from '@/lib/security/rate-limit'
import { sanitizeFileName, validateFileContent } from '@/lib/security/file-validator'
import { checkUnificationLimit, checkFileSizeLimit } from '@/lib/usage-tracker'
import { getUserFingerprint, setFingerprintCookie, getUserPlan } from '@/lib/fingerprint'
import { generateUnificationToken } from '@/lib/security/unification-token'
import { validateContentType } from '@/lib/security/validation-schemas'

describe('POST /api/preview', () => {
  const createRequest = (files: File[] = []) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    return new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      body: formData,
    })
  }

  const createValidFile = (name = 'test.csv', type = 'text/csv', size = 1024) => {
    const file = new File(['content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mocks for successful request
    ;(rateLimiters.upload.check as jest.Mock).mockResolvedValue({
      success: true,
      remaining: 9,
    })
    ;(getUserFingerprint as jest.Mock).mockReturnValue({
      isNew: false,
      cookieId: 'test-user',
      fingerprint: 'test-fingerprint-hash',
    })
    ;(getUserPlan as jest.Mock).mockReturnValue('free')
    ;(checkUnificationLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      maxUnifications: 1,
      currentUnifications: 0,
      remainingUnifications: 1,
    })
    ;(checkFileSizeLimit as jest.Mock).mockReturnValue({
      allowed: true,
    })
    ;(validateContentType as jest.Mock).mockReturnValue({ valid: true })
    ;(sanitizeFileName as jest.Mock).mockImplementation((name) => name)
    ;(validateFileContent as jest.Mock).mockResolvedValue({ valid: true })
    ;(generateUnificationToken as jest.Mock).mockResolvedValue('mock-token-abc123')
  })

  describe('Content-Type validation', () => {
    it('should return 415 when Content-Type is invalid', async () => {
      ;(validateContentType as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Invalid Content-Type. Expected multipart/form-data.',
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(415)
      expect(data.error).toBe('Invalid Content-Type. Expected multipart/form-data.')
    })
  })

  describe('rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      ;(rateLimiters.upload.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Please try again later.')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('Retry-After')).toBe('60')
    })
  })

  describe('unification limit', () => {
    it('should return 403 when unification limit exceeded', async () => {
      ;(checkUnificationLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        error: 'Monthly unification limit reached',
        errorCode: 'LIMIT_EXCEEDED',
        currentUnifications: 1,
        maxUnifications: 1,
        remainingUnifications: 0,
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Monthly unification limit reached')
      expect(data.errorCode).toBe('LIMIT_EXCEEDED')
      expect(data.usage).toEqual({
        current: 1,
        max: 1,
        remaining: 0,
      })
    })

    it('should set cookie for new user even on limit exceeded', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-user',
        fingerprint: 'new-user-fingerprint',
      })
      ;(checkUnificationLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        error: 'Limit exceeded',
        errorCode: 'LIMIT_EXCEEDED',
        currentUnifications: 1,
        maxUnifications: 1,
        remainingUnifications: 0,
      })

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(setFingerprintCookie).toHaveBeenCalledWith(expect.any(Object), 'new-user')
    })
  })

  describe('file validation', () => {
    it('should return 400 when no file provided', async () => {
      const request = createRequest([])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should return 400 when more than 1 file provided', async () => {
      const files = [createValidFile('file1.csv'), createValidFile('file2.csv')]
      const request = createRequest(files)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Only 1 file allowed per upload')
    })

    it('should return 403 when file size exceeds plan limit', async () => {
      ;(checkFileSizeLimit as jest.Mock).mockReturnValue({
        allowed: false,
        error: 'File size exceeds limit',
        errorCode: 'FILE_TOO_LARGE',
        maxSize: 1048576,
      })

      const file = createValidFile('large.csv', 'text/csv', 2 * 1024 * 1024)
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('File size exceeds limit')
      expect(data.errorCode).toBe('FILE_TOO_LARGE')
      expect(data.maxSize).toBe(1048576)
    })

    it('should return 400 for invalid file type', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid file type. Only CSV and XLSX files are allowed.')
    })

    it('should return 400 when file content validation fails (magic numbers/zip bomb)', async () => {
      ;(validateFileContent as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'File content does not match expected format',
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File content does not match expected format')
      expect(validateFileContent).toHaveBeenCalledWith(file)
    })

    it('should return 400 for invalid file extension', async () => {
      // File with CSV MIME type but wrong extension
      const file = new File(['content'], 'test.txt', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(
        'Invalid file extension. Only .csv, .xls and .xlsx files are allowed.',
      )
    })
  })

  describe('file type validation', () => {
    it('should accept CSV files', async () => {
      const file = createValidFile('test.csv', 'text/csv')
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept XLSX files', async () => {
      const file = createValidFile(
        'test.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept XLS files', async () => {
      const file = createValidFile('test.xls', 'application/vnd.ms-excel')
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('successful preview', () => {
    it('should return columns and usage info', async () => {
      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('columns')
      expect(data).toHaveProperty('unificationToken')
      expect(data.unificationToken).toBe('mock-token-abc123')
      expect(data).toHaveProperty('usage')
      expect(data.usage).toEqual({
        current: 0,
        max: 1,
        remaining: 1,
      })
    })

    it('should include rate limit header', async () => {
      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    })

    it('should set cookie for new user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-user-cookie',
        fingerprint: 'new-user-cookie-fingerprint',
      })

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(setFingerprintCookie).toHaveBeenCalledWith(expect.any(Object), 'new-user-cookie')
    })
  })

  describe('file name sanitization', () => {
    it('should sanitize file names', async () => {
      const file = createValidFile('malicious<script>.csv')

      jest.spyOn(console, 'warn').mockImplementation(() => {})
      ;(sanitizeFileName as jest.Mock).mockReturnValue('malicious_script_.csv')

      const request = createRequest([file])
      await POST(request)

      expect(sanitizeFileName).toHaveBeenCalledWith('malicious<script>.csv')

      jest.restoreAllMocks()
    })

    it('should not log unsanitized file names', async () => {
      const file = createValidFile('bad<name>.csv')
      ;(sanitizeFileName as jest.Mock).mockReturnValue('bad_name_.csv')

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const request = createRequest([file])
      await POST(request)

      // Should NOT log any file names (log injection prevention)
      expect(consoleSpy).not.toHaveBeenCalled()

      jest.restoreAllMocks()
    })
  })

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      ;(rateLimiters.upload.check as jest.Mock).mockRejectedValue(new Error('Unexpected error'))

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error processing file')

      jest.restoreAllMocks()
    })
  })

  describe('plan-specific behavior', () => {
    it('should check file size against Free plan limits', async () => {
      ;(getUserPlan as jest.Mock).mockReturnValue('free')

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      // File size is passed to checkFileSizeLimit with the plan
      expect(checkFileSizeLimit).toHaveBeenCalledWith(expect.any(Number), 'free')
    })

    it('should pass plan from getUserPlan to checkFileSizeLimit', async () => {
      // Mock simulates future JWT-based plan detection
      ;(getUserPlan as jest.Mock).mockReturnValue('pro')

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(checkFileSizeLimit).toHaveBeenCalledWith(expect.any(Number), 'pro')
    })
  })
})
