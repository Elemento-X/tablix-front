import {
  validateFile,
  sanitizeFileName,
  validateFileContent,
  FILE_VALIDATOR,
} from '@/lib/security/file-validator'

describe('file-validator.ts', () => {
  describe('FILE_VALIDATOR constants', () => {
    it('should have correct max file size', () => {
      expect(FILE_VALIDATOR.MAX_FILE_SIZE).toBe(10 * 1024 * 1024) // 10MB
    })

    it('should have correct allowed MIME types', () => {
      expect(FILE_VALIDATOR.ALLOWED_MIME_TYPES).toEqual([
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ])
    })

    it('should have correct allowed extensions', () => {
      expect(FILE_VALIDATOR.ALLOWED_EXTENSIONS).toEqual(['.csv', '.xls', '.xlsx'])
    })
  })

  describe('validateFile', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['test content'], name, { type })
      Object.defineProperty(file, 'size', { value: size, writable: false })
      return file
    }

    describe('file size validation', () => {
      it('should reject empty files', () => {
        const file = createMockFile('test.csv', 0, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('File is empty')
      })

      it('should accept files under 10MB', () => {
        const file = createMockFile('test.csv', 5 * 1024 * 1024, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should reject files over 10MB', () => {
        const file = createMockFile('test.csv', 11 * 1024 * 1024, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('File size exceeds maximum')
      })
    })

    describe('file extension validation', () => {
      it('should accept .csv files', () => {
        const file = createMockFile('data.csv', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should accept .xlsx files', () => {
        const file = createMockFile(
          'data.xlsx',
          1000,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should accept .xls files', () => {
        const file = createMockFile('data.xls', 1000, 'application/vnd.ms-excel')
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should reject files with invalid extensions', () => {
        const file = createMockFile('test.txt', 1000, 'text/plain')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid file type')
      })

      it('should be case-insensitive for extensions', () => {
        const file = createMockFile('DATA.CSV', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })
    })

    describe('MIME type validation', () => {
      it('should accept text/csv', () => {
        const file = createMockFile('test.csv', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should accept Excel MIME types', () => {
        const file = createMockFile(
          'test.xlsx',
          1000,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })

      it('should reject invalid MIME types', () => {
        const file = createMockFile('test.csv', 1000, 'application/pdf')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid MIME type')
      })
    })

    describe('suspicious filename patterns', () => {
      it('should reject files with path traversal', () => {
        const file = createMockFile('../etc/passwd.csv', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('File name contains suspicious patterns')
      })

      it('should reject files with special characters', () => {
        const file = createMockFile('test<script>.csv', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('File name contains suspicious patterns')
      })

      it('should reject files with null bytes', () => {
        const file = createMockFile('file\0name.csv', 1000, 'text/csv')
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('File name contains suspicious patterns')
      })

      it('should reject Windows reserved names', () => {
        const reservedNames = ['CON.csv', 'PRN.csv', 'AUX.csv', 'NUL.csv', 'COM1.csv', 'LPT1.csv']

        reservedNames.forEach((filename) => {
          const file = createMockFile(filename, 1000, 'text/csv')
          const result = validateFile(file)
          expect(result.valid).toBe(false)
          expect(result.error).toBe('File name contains suspicious patterns')
        })
      })

      it('should accept valid filenames', () => {
        const validNames = ['data.csv', 'my-file_123.xlsx', 'Report 2024.csv', 'sales_data.xlsx']

        validNames.forEach((filename) => {
          const file = createMockFile(filename, 1000, 'text/csv')
          const result = validateFile(file)
          expect(result.valid).toBe(true)
        })
      })
    })
  })

  describe('sanitizeFileName', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('___etc_passwd')
    })

    it('should replace special characters with underscores', () => {
      expect(sanitizeFileName('my<file>.csv')).toBe('my_file_.csv')
      expect(sanitizeFileName('file:name|test.csv')).toBe('file_name_test.csv')
    })

    it('should prevent hidden files', () => {
      expect(sanitizeFileName('.hidden')).toBe('_.hidden')
    })

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.csv'
      const result = sanitizeFileName(longName)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result.endsWith('.csv')).toBe(true)
    })

    it('should preserve valid filenames', () => {
      expect(sanitizeFileName('valid_file-123.csv')).toBe('valid_file-123.csv')
    })

    it('should handle multiple path traversal attempts', () => {
      expect(sanitizeFileName('../../folder/../file.csv')).toBe('__folder__file.csv')
    })
  })

  describe('validateFileContent', () => {
    const createFileWithBytes = (bytes: number[], name: string = 'test.csv'): File => {
      const buffer = new Uint8Array(bytes)
      const blob = new Blob([buffer])
      const file = new File([blob], name)

      // Mock slice and arrayBuffer methods
      file.slice = jest.fn((start?: number, end?: number) => {
        const slicedBytes = bytes.slice(start, end)
        const slicedBuffer = new Uint8Array(slicedBytes)
        const slicedBlob = new Blob([slicedBuffer])

        // Mock arrayBuffer on the returned blob
        slicedBlob.arrayBuffer = jest.fn(async () => {
          return slicedBuffer.buffer as ArrayBuffer
        })

        return slicedBlob as any
      })

      return file
    }

    it('should validate ZIP signature for XLSX files', async () => {
      // ZIP signature: 0x50 0x4B 0x03 0x04
      const file = createFileWithBytes([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0], 'test.xlsx')
      Object.defineProperty(file, 'size', { value: 1000 })

      const result = await validateFileContent(file)
      expect(result.valid).toBe(true)
    })

    it('should reject XLSX files with invalid signature', async () => {
      const file = createFileWithBytes([0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0], 'test.xlsx')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalid format')
    })

    it('should validate text content for CSV files', async () => {
      const textBytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f] // "Hello Wo" in ASCII
      const file = createFileWithBytes(textBytes, 'test.csv')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(true)
    })

    it('should accept .xls files with valid CDF magic bytes', async () => {
      // Microsoft Compound Document Format signature
      const cdfBytes = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
      const file = createFileWithBytes(cdfBytes, 'data.xls')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(true)
    })

    it('should reject .xls files with invalid magic bytes', async () => {
      const fakeBytes = [0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]
      const file = createFileWithBytes(fakeBytes, 'fake.xls')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File claims to be XLS but has invalid format')
    })

    it('should reject CSV files with binary content', async () => {
      // CSV expects text, but 0xff and 0xfe are allowed (BOM markers)
      // To make it fail, we need mostly high bytes
      const binaryBytes = [0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7, 0xf6]
      const file = createFileWithBytes(binaryBytes, 'test.csv')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalid format')
    })

    it('should handle errors gracefully', async () => {
      const mockFile = {
        name: 'test.csv',
        slice: jest.fn(() => {
          throw new Error('Slice error')
        }),
      } as unknown as File

      const result = await validateFileContent(mockFile)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Failed to validate file content')
    })

    it('should accept valid ZIP file (XLSX) regardless of size (zip bomb handled by row limits)', async () => {
      // Zip bomb protection now relies on MAX_FILE_SIZE (10MB) and row limits,
      // not on a separate size check in validateFileContent
      const file = createFileWithBytes([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0], 'large.xlsx')

      const result = await validateFileContent(file)
      expect(result.valid).toBe(true)
    })

    it('should validate ZIP with alternate signature byte (0x05 at position 2)', async () => {
      // XLSX ZIP can have 0x50 0x4B 0x05 signature
      const file = createFileWithBytes([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0], 'test.xlsx')
      Object.defineProperty(file, 'size', { value: 1000 })

      const result = await validateFileContent(file)
      expect(result.valid).toBe(true)
    })
  })
})
