/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/process/route'

import { rateLimiters } from '@/lib/security/rate-limit'
import {
  sanitizeFileName,
  validateFileContent,
} from '@/lib/security/file-validator'
import {
  validateFileLimits,
  validateColumnSelection,
  sanitizeString,
  validateContentType,
  validateBodySize,
} from '@/lib/security/validation-schemas'
import {
  getUserFingerprint,
  setFingerprintCookie,
  getUserPlan,
} from '@/lib/fingerprint'
import { getPlanLimits } from '@/lib/limits'
import { atomicIncrementUnification } from '@/lib/usage-tracker'
import { consumeUnificationToken } from '@/lib/security/unification-token'

// Mock dependencies
jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    process: {
      check: jest.fn(),
    },
  },
}))

jest.mock('@/lib/security/file-validator', () => ({
  sanitizeFileName: jest.fn((name) => name),
  validateFileContent: jest.fn().mockResolvedValue({ valid: true }),
  FILE_VALIDATOR: {
    ALLOWED_MIME_TYPES: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    ALLOWED_EXTENSIONS: ['.csv', '.xls', '.xlsx'],
  },
}))

jest.mock('@/lib/security/validation-schemas', () => ({
  validateFileLimits: jest.fn(),
  validateColumnSelection: jest.fn(),
  sanitizeString: jest.fn((str) => str),
  validateContentType: jest.fn(() => ({ valid: true })),
  validateBodySize: jest.fn(() => ({ valid: true })),
}))

jest.mock('@/lib/fingerprint', () => ({
  getUserFingerprint: jest.fn(() => ({
    isNew: false,
    cookieId: 'existing-user',
    fingerprint: 'test-fingerprint',
  })),
  setFingerprintCookie: jest.fn(),
  getUserPlan: jest.fn(() => 'free'),
}))

jest.mock('@/lib/limits', () => ({
  getPlanLimits: jest.fn(() => ({
    name: 'Free',
    maxInputFiles: 3,
    maxFileSize: 1 * 1024 * 1024,
    maxTotalSize: 1 * 1024 * 1024,
    maxColumns: 3,
    unificationsPerMonth: 1,
  })),
}))

jest.mock('@/lib/usage-tracker', () => ({
  atomicIncrementUnification: jest.fn(() => ({
    success: true,
    newCount: 1,
    maxUnifications: 1,
  })),
}))

jest.mock('@/lib/security/unification-token', () => ({
  consumeUnificationToken: jest.fn(() => true),
}))

describe('POST /api/process', () => {
  const createRequest = (
    files: File[] = [],
    columns: string[] = ['Name', 'Email'],
    token = 'valid-test-token',
  ) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('columns', JSON.stringify(columns))
    if (token) formData.append('token', token)

    return new NextRequest('http://localhost:3000/api/process', {
      method: 'POST',
      body: formData,
    })
  }

  const createValidFile = (
    name = 'test.csv',
    type = 'text/csv',
    size = 1024,
  ) => {
    const file = new File(['content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mocks for successful request
    ;(rateLimiters.process.check as jest.Mock).mockResolvedValue({
      success: true,
      remaining: 29,
    })
    ;(validateContentType as jest.Mock).mockReturnValue({ valid: true })
    ;(validateBodySize as jest.Mock).mockReturnValue({ valid: true })
    ;(validateFileLimits as jest.Mock).mockReturnValue({
      valid: true,
    })
    ;(validateColumnSelection as jest.Mock).mockReturnValue({
      valid: true,
      data: ['Name', 'Email'],
    })
    ;(sanitizeFileName as jest.Mock).mockImplementation((name) => name)
    ;(validateFileContent as jest.Mock).mockResolvedValue({ valid: true })
    ;(sanitizeString as jest.Mock).mockImplementation((str) => str)
    ;(getUserFingerprint as jest.Mock).mockReturnValue({
      isNew: false,
      cookieId: 'existing-user',
      fingerprint: 'test-fingerprint',
    })
    ;(getUserPlan as jest.Mock).mockReturnValue('free')
    ;(getPlanLimits as jest.Mock).mockReturnValue({
      name: 'Free',
      maxInputFiles: 3,
      maxFileSize: 1 * 1024 * 1024,
      maxTotalSize: 1 * 1024 * 1024,
      maxColumns: 3,
      unificationsPerMonth: 1,
    })
    ;(consumeUnificationToken as jest.Mock).mockResolvedValue(true)
    ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
      success: true,
      newCount: 1,
      maxUnifications: 1,
    })
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
      expect(data.error).toBe(
        'Invalid Content-Type. Expected multipart/form-data.',
      )
    })
  })

  describe('body size validation', () => {
    it('should return 413 when body is too large', async () => {
      ;(validateBodySize as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Request body too large (max 60MB)',
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('Request body too large (max 60MB)')
    })
  })

  describe('unification token and quota', () => {
    it('should return 400 when token is missing', async () => {
      const file = createValidFile()
      const request = createRequest([file], ['Name', 'Email'], '')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing unification token')
    })

    it('should return 403 when token is invalid or expired', async () => {
      ;(consumeUnificationToken as jest.Mock).mockResolvedValue(false)

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid or expired unification token')
    })

    it('should return 403 when unification limit reached', async () => {
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: false,
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unification limit reached for your plan.')
      expect(data.errorCode).toBe('LIMIT_EXCEEDED')
    })
  })

  describe('rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      ;(rateLimiters.process.check as jest.Mock).mockResolvedValue({
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

  describe('file validation', () => {
    it('should return 400 when file limit validation fails', async () => {
      ;(validateFileLimits as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Too many files uploaded',
      })

      const files = Array(10)
        .fill(null)
        .map((_, i) => createValidFile(`file${i}.csv`))
      const request = createRequest(files)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Too many files uploaded')
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

    it('should return 400 for invalid file type', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      Object.defineProperty(file, 'size', { value: 1024 })

      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(
        'Invalid file type. Only CSV and XLSX files are allowed.',
      )
    })
  })

  describe('column validation', () => {
    it('should return 400 for invalid columns JSON', async () => {
      const formData = new FormData()
      formData.append('files', createValidFile())
      formData.append('columns', 'invalid-json')
      formData.append('token', 'valid-test-token')

      const request = new NextRequest('http://localhost:3000/api/process', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid columns format')
    })

    it('should return 400 when column validation fails', async () => {
      ;(validateColumnSelection as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Invalid column selection',
      })

      const file = createValidFile()
      const request = createRequest([file], [])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid column selection')
    })

    it('should return 400 when too many columns selected', async () => {
      const manyColumns = Array(4)
        .fill(null)
        .map((_, i) => `Column${i}`)
      ;(validateColumnSelection as jest.Mock).mockReturnValue({
        valid: true,
        data: manyColumns,
      })

      const file = createValidFile()
      const request = createRequest([file], manyColumns)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Too many columns selected (max 3)')
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

    it('should accept multiple valid files', async () => {
      const files = [
        createValidFile('file1.csv', 'text/csv'),
        createValidFile(
          'file2.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ]
      const request = createRequest(files)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('successful processing', () => {
    it('should return file blob with correct headers', async () => {
      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      expect(response.headers.get('Content-Disposition')).toContain(
        'attachment',
      )
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('29')
    })

    it('should include filename in Content-Disposition', async () => {
      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.headers.get('Content-Disposition')).toContain(
        'tablix-output.xlsx',
      )
    })

    it('should sanitize output filename', async () => {
      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(sanitizeString).toHaveBeenCalledWith('tablix-output.xlsx')
    })
  })

  describe('file name sanitization', () => {
    it('should sanitize uploaded file names', async () => {
      const file = createValidFile('malicious<script>.csv')
      ;(sanitizeFileName as jest.Mock).mockReturnValue('malicious_script_.csv')

      jest.spyOn(console, 'warn').mockImplementation(() => {})

      const request = createRequest([file])
      await POST(request)

      expect(sanitizeFileName).toHaveBeenCalledWith('malicious<script>.csv')

      jest.restoreAllMocks()
    })

    it('should not log unsanitized file names', async () => {
      const file = createValidFile('bad<name>.csv')
      ;(sanitizeFileName as jest.Mock).mockReturnValue('bad_name_.csv')

      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const request = createRequest([file])
      await POST(request)

      // Should NOT log any file names (log injection prevention)
      expect(consoleSpy).not.toHaveBeenCalled()

      jest.restoreAllMocks()
    })
  })

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      ;(rateLimiters.process.check as jest.Mock).mockRejectedValue(
        new Error('Unexpected error'),
      )

      jest.spyOn(console, 'error').mockImplementation(() => {})

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error processing files')

      jest.restoreAllMocks()
    })

    it('should return 500 on non-Error thrown value (covers unknown error branch)', async () => {
      // Throw a non-Error value to exercise the `'Unknown error'` branch in catch
      ;(rateLimiters.process.check as jest.Mock).mockRejectedValue(
        'string-error',
      )

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error processing files')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Process API] Error:',
        'Unknown error',
      )

      jest.restoreAllMocks()
    })
  })

  describe('edge cases', () => {
    it('should handle exactly maxInputFiles files', async () => {
      const files = Array(3)
        .fill(null)
        .map((_, i) => createValidFile(`file${i}.csv`))
      ;(validateFileLimits as jest.Mock).mockReturnValue({ valid: true })

      const request = createRequest(files)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle exactly maxColumns columns', async () => {
      const columns = Array(3)
        .fill(null)
        .map((_, i) => `Column${i}`)
      ;(validateColumnSelection as jest.Mock).mockReturnValue({
        valid: true,
        data: columns,
      })

      const file = createValidFile()
      const request = createRequest([file], columns)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle file at exactly maxFileSize', async () => {
      const file = createValidFile('test.csv', 'text/csv', 1 * 1024 * 1024) // 1MB (Free plan limit)
      ;(validateFileLimits as jest.Mock).mockReturnValue({ valid: true })

      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should return 400 when total file size exceeds plan limit', async () => {
      // Use smaller plan limit so we don't need huge buffers in tests
      ;(getPlanLimits as jest.Mock).mockReturnValue({
        name: 'Free',
        maxInputFiles: 3,
        maxFileSize: 1 * 1024 * 1024,
        maxTotalSize: 10, // 10 bytes total limit
        maxColumns: 3,
        unificationsPerMonth: 1,
      })
      ;(validateFileLimits as jest.Mock).mockReturnValue({ valid: true })

      // Two files with real content exceeding 10 bytes total
      const file1 = new File(['abcdefgh'], 'file1.csv', { type: 'text/csv' }) // 8 bytes
      const file2 = new File(['abcdefgh'], 'file2.csv', { type: 'text/csv' }) // 8 bytes

      const request = createRequest([file1, file2])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Total file size exceeds limit')
    })

    it('should return 400 when file extension is invalid after sanitization', async () => {
      // File has valid MIME type but sanitization removes extension
      const file = createValidFile('test.csv', 'text/csv')
      ;(sanitizeFileName as jest.Mock).mockReturnValue(
        'malicious_file_no_extension',
      )

      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid file extension after sanitization')
    })

    it('should set fingerprint cookie on successful processing for new user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-user-cookie-id',
        fingerprint: 'new-user-fingerprint',
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(setFingerprintCookie).toHaveBeenCalledWith(
        response,
        'new-user-cookie-id',
      )
    })

    it('should set fingerprint cookie on quota exceeded for new user', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: true,
        cookieId: 'new-user-cookie-id',
        fingerprint: 'new-user-fingerprint',
      })
      ;(atomicIncrementUnification as jest.Mock).mockResolvedValue({
        success: false,
      })

      const file = createValidFile()
      const request = createRequest([file])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.errorCode).toBe('LIMIT_EXCEEDED')
      expect(setFingerprintCookie).toHaveBeenCalledWith(
        response,
        'new-user-cookie-id',
      )
    })
  })

  describe('order-of-operations: token and quota must not be consumed on validation failures', () => {
    it('should NOT consume token when content-type is invalid', async () => {
      ;(validateContentType as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Invalid Content-Type. Expected multipart/form-data.',
      })

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when rate limit is exceeded', async () => {
      ;(rateLimiters.process.check as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
      })

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when file limits validation fails', async () => {
      ;(validateFileLimits as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Too many files uploaded',
      })

      const files = Array(10)
        .fill(null)
        .map((_, i) => createValidFile(`file${i}.csv`))
      const request = createRequest(files)
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when total file size exceeds plan limit', async () => {
      ;(getPlanLimits as jest.Mock).mockReturnValue({
        name: 'Free',
        maxInputFiles: 3,
        maxFileSize: 1 * 1024 * 1024,
        maxTotalSize: 10,
        maxColumns: 3,
        unificationsPerMonth: 1,
      })
      ;(validateFileLimits as jest.Mock).mockReturnValue({ valid: true })

      const file1 = new File(['abcdefgh'], 'file1.csv', { type: 'text/csv' })
      const file2 = new File(['abcdefgh'], 'file2.csv', { type: 'text/csv' })
      const request = createRequest([file1, file2])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when column validation fails', async () => {
      ;(validateColumnSelection as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Invalid column selection',
      })

      const file = createValidFile()
      const request = createRequest([file], [])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when file type is invalid', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })
      Object.defineProperty(file, 'size', { value: 1024 })

      const request = createRequest([file])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT consume token when file content validation fails (zip bomb / magic numbers)', async () => {
      ;(validateFileContent as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'File content does not match expected format',
      })

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(consumeUnificationToken).not.toHaveBeenCalled()
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should NOT increment quota when token is invalid or expired', async () => {
      ;(consumeUnificationToken as jest.Mock).mockResolvedValue(false)

      const file = createValidFile()
      const request = createRequest([file])
      await POST(request)

      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })

    it('should consume token with correct (token, fingerprint) binding', async () => {
      ;(getUserFingerprint as jest.Mock).mockReturnValue({
        isNew: false,
        cookieId: 'existing-user',
        fingerprint: 'fp-abc123',
      })

      const file = createValidFile()
      const request = createRequest(
        [file],
        ['Name', 'Email'],
        'valid-test-token',
      )
      await POST(request)

      expect(consumeUnificationToken).toHaveBeenCalledWith(
        'valid-test-token',
        'fp-abc123',
      )
    })

    it('should return 403 for a token present but malformed (path traversal attempt)', async () => {
      // consumeUnificationToken internally rejects non-hex-64 tokens
      // Simulate what the real implementation does with a malformed token
      ;(consumeUnificationToken as jest.Mock).mockResolvedValue(false)

      const formData = new FormData()
      formData.append('files', createValidFile())
      formData.append('columns', JSON.stringify(['Name', 'Email']))
      formData.append('token', '../../../etc/passwd')

      const request = new NextRequest('http://localhost:3000/api/process', {
        method: 'POST',
        body: formData,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid or expired unification token')
      expect(atomicIncrementUnification).not.toHaveBeenCalled()
    })
  })
})
