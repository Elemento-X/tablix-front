import {
  columnNameSchema,
  columnsArraySchema,
  fileMetadataSchema,
  processRequestSchema,
  previewRequestSchema,
  planLimitSchema,
  sanitizeString,
  sanitizeStringArray,
  validateColumnSelection,
  validateFileLimits,
} from '@/lib/security/validation-schemas'
import { z } from 'zod'

describe('validation-schemas.ts', () => {
  describe('columnNameSchema', () => {
    it('should accept valid column names', () => {
      expect(() => columnNameSchema.parse('Name')).not.toThrow()
      expect(() => columnNameSchema.parse('Column_1')).not.toThrow()
      expect(() => columnNameSchema.parse('Data-2024')).not.toThrow()
      expect(() => columnNameSchema.parse('Número')).not.toThrow()
      expect(() => columnNameSchema.parse('Column Name With Spaces')).not.toThrow()
    })

    it('should reject empty column names', () => {
      expect(() => columnNameSchema.parse('')).toThrow('Column name cannot be empty')
    })

    it('should reject column names over 255 characters', () => {
      const longName = 'a'.repeat(256)
      expect(() => columnNameSchema.parse(longName)).toThrow('Column name too long')
    })

    it('should accept column names exactly 255 characters', () => {
      const maxName = 'a'.repeat(255)
      expect(() => columnNameSchema.parse(maxName)).not.toThrow()
    })

    it('should reject column names with invalid characters', () => {
      expect(() => columnNameSchema.parse('Column<script>')).toThrow('Column name contains invalid characters')
      expect(() => columnNameSchema.parse('Column|Name')).toThrow('Column name contains invalid characters')
      expect(() => columnNameSchema.parse('Column:Name')).toThrow('Column name contains invalid characters')
      expect(() => columnNameSchema.parse('Column@Name')).toThrow('Column name contains invalid characters')
    })

    it('should accept accented characters', () => {
      expect(() => columnNameSchema.parse('Açúcar')).not.toThrow()
      expect(() => columnNameSchema.parse('José')).not.toThrow()
      expect(() => columnNameSchema.parse('München')).not.toThrow()
    })
  })

  describe('columnsArraySchema', () => {
    it('should accept array with valid columns', () => {
      expect(() => columnsArraySchema.parse(['Name', 'Age', 'Email'])).not.toThrow()
    })

    it('should reject empty array', () => {
      expect(() => columnsArraySchema.parse([])).toThrow('At least one column must be selected')
    })

    it('should accept exactly 1 column', () => {
      expect(() => columnsArraySchema.parse(['Name'])).not.toThrow()
    })

    it('should accept exactly 50 columns', () => {
      const columns = Array(50).fill('Column').map((name, i) => `${name}${i + 1}`)
      expect(() => columnsArraySchema.parse(columns)).not.toThrow()
    })

    it('should reject arrays with more than 50 columns', () => {
      const columns = Array(51).fill('Column').map((name, i) => `${name}${i + 1}`)
      expect(() => columnsArraySchema.parse(columns)).toThrow('Too many columns selected (max 50)')
    })

    it('should reject arrays with invalid column names', () => {
      expect(() => columnsArraySchema.parse(['Name', 'Age', ''])).toThrow('Column name cannot be empty')
      expect(() => columnsArraySchema.parse(['Name', 'Column<script>'])).toThrow('Column name contains invalid characters')
    })
  })

  describe('fileMetadataSchema', () => {
    it('should accept valid file metadata', () => {
      const validMetadata = {
        name: 'data.csv',
        size: 5 * 1024 * 1024, // 5MB
        type: 'text/csv' as const,
      }
      expect(() => fileMetadataSchema.parse(validMetadata)).not.toThrow()
    })

    it('should accept all allowed MIME types', () => {
      const csvMetadata = { name: 'data.csv', size: 1000, type: 'text/csv' as const }
      const xlsMetadata = { name: 'data.xls', size: 1000, type: 'application/vnd.ms-excel' as const }
      const xlsxMetadata = {
        name: 'data.xlsx',
        size: 1000,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const,
      }

      expect(() => fileMetadataSchema.parse(csvMetadata)).not.toThrow()
      expect(() => fileMetadataSchema.parse(xlsMetadata)).not.toThrow()
      expect(() => fileMetadataSchema.parse(xlsxMetadata)).not.toThrow()
    })

    it('should reject empty file name', () => {
      const metadata = { name: '', size: 1000, type: 'text/csv' as const }
      expect(() => fileMetadataSchema.parse(metadata)).toThrow('File name is required')
    })

    it('should reject file name over 255 characters', () => {
      const metadata = { name: 'a'.repeat(256) + '.csv', size: 1000, type: 'text/csv' as const }
      expect(() => fileMetadataSchema.parse(metadata)).toThrow('File name too long')
    })

    it('should reject file names with invalid characters', () => {
      const invalidNames = ['file<name>.csv', 'file>name.csv', 'file:name.csv', 'file|name.csv', 'file?name.csv', 'file*name.csv']

      invalidNames.forEach((name) => {
        const metadata = { name, size: 1000, type: 'text/csv' as const }
        expect(() => fileMetadataSchema.parse(metadata)).toThrow('File name contains invalid characters')
      })
    })

    it('should reject zero or negative file size', () => {
      const zeroMetadata = { name: 'data.csv', size: 0, type: 'text/csv' as const }
      const negativeMetadata = { name: 'data.csv', size: -100, type: 'text/csv' as const }

      expect(() => fileMetadataSchema.parse(zeroMetadata)).toThrow('File size must be positive')
      expect(() => fileMetadataSchema.parse(negativeMetadata)).toThrow('File size must be positive')
    })

    it('should reject files over 10MB', () => {
      const metadata = { name: 'data.csv', size: 11 * 1024 * 1024, type: 'text/csv' as const }
      expect(() => fileMetadataSchema.parse(metadata)).toThrow('File too large (max 10MB)')
    })

    it('should accept files exactly 10MB', () => {
      const metadata = { name: 'data.csv', size: 10 * 1024 * 1024, type: 'text/csv' as const }
      expect(() => fileMetadataSchema.parse(metadata)).not.toThrow()
    })

    it('should reject invalid MIME types', () => {
      const metadata = { name: 'data.pdf', size: 1000, type: 'application/pdf' }
      expect(() => fileMetadataSchema.parse(metadata)).toThrow()
    })
  })

  describe('processRequestSchema', () => {
    it('should accept valid process request', () => {
      const request = {
        selectedColumns: ['Name', 'Age', 'Email'],
        fileName: 'output.csv',
      }
      expect(() => processRequestSchema.parse(request)).not.toThrow()
    })

    it('should reject request without selectedColumns', () => {
      const request = { fileName: 'output.csv' }
      expect(() => processRequestSchema.parse(request)).toThrow()
    })

    it('should reject request without fileName', () => {
      const request = { selectedColumns: ['Name', 'Age'] }
      expect(() => processRequestSchema.parse(request)).toThrow()
    })

    it('should reject request with empty fileName', () => {
      const request = { selectedColumns: ['Name'], fileName: '' }
      expect(() => processRequestSchema.parse(request)).toThrow()
    })

    it('should reject request with fileName over 255 characters', () => {
      const request = { selectedColumns: ['Name'], fileName: 'a'.repeat(256) }
      expect(() => processRequestSchema.parse(request)).toThrow()
    })
  })

  describe('previewRequestSchema', () => {
    it('should accept valid preview request with fileName', () => {
      const request = { fileName: 'data.csv' }
      expect(() => previewRequestSchema.parse(request)).not.toThrow()
    })

    it('should accept preview request without fileName (optional)', () => {
      const request = {}
      expect(() => previewRequestSchema.parse(request)).not.toThrow()
    })

    it('should reject empty fileName if provided', () => {
      const request = { fileName: '' }
      expect(() => previewRequestSchema.parse(request)).toThrow()
    })

    it('should reject fileName over 255 characters', () => {
      const request = { fileName: 'a'.repeat(256) }
      expect(() => previewRequestSchema.parse(request)).toThrow()
    })
  })

  describe('planLimitSchema', () => {
    it('should accept valid plan limits', () => {
      const limits = {
        maxSheetsPerMonth: 10,
        maxRowsPerSheet: 1000,
        maxColumns: 50,
      }
      expect(() => planLimitSchema.parse(limits)).not.toThrow()
    })

    it('should reject negative values', () => {
      const limits = { maxSheetsPerMonth: -1, maxRowsPerSheet: 1000, maxColumns: 50 }
      expect(() => planLimitSchema.parse(limits)).toThrow()
    })

    it('should reject zero values', () => {
      const limits = { maxSheetsPerMonth: 0, maxRowsPerSheet: 1000, maxColumns: 50 }
      expect(() => planLimitSchema.parse(limits)).toThrow()
    })

    it('should reject non-integer values', () => {
      const limits = { maxSheetsPerMonth: 10.5, maxRowsPerSheet: 1000, maxColumns: 50 }
      expect(() => planLimitSchema.parse(limits)).toThrow()
    })

    it('should reject missing fields', () => {
      const limits = { maxSheetsPerMonth: 10, maxRowsPerSheet: 1000 }
      expect(() => planLimitSchema.parse(limits)).toThrow()
    })
  })

  describe('sanitizeString', () => {
    it('should remove < and > characters', () => {
      expect(sanitizeString('Hello<script>alert("xss")</script>World')).toBe('Helloscriptalert("xss")/scriptWorld')
      expect(sanitizeString('Test<div>content</div>')).toBe('Testdivcontent/div')
      expect(sanitizeString('Name<>Email')).toBe('NameEmail')
    })

    it('should remove non-printable characters', () => {
      expect(sanitizeString('Hello\x00World')).toBe('HelloWorld')
      expect(sanitizeString('Test\x01\x02\x03')).toBe('Test')
    })

    it('should preserve printable ASCII and accented characters', () => {
      expect(sanitizeString('Hello World 123')).toBe('Hello World 123')
      expect(sanitizeString('José Silva')).toBe('José Silva')
      expect(sanitizeString('München')).toBe('München')
      expect(sanitizeString('Açúcar')).toBe('Açúcar')
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  Hello  ')).toBe('Hello')
      expect(sanitizeString('\tWorld\n')).toBe('World')
    })

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('')
      expect(sanitizeString('   ')).toBe('')
    })

    it('should handle strings with only special characters', () => {
      expect(sanitizeString('<><>')).toBe('')
      expect(sanitizeString('\x00\x01\x02')).toBe('')
    })
  })

  describe('sanitizeStringArray', () => {
    it('should sanitize all strings in array', () => {
      const input = ['Hello<script>', 'World  ', '  Test  ']
      const expected = ['Helloscript', 'World', 'Test']
      expect(sanitizeStringArray(input)).toEqual(expected)
    })

    it('should filter out empty strings after sanitization', () => {
      const input = ['Valid', '<><>', '   ', 'Another']
      const expected = ['Valid', 'Another']
      expect(sanitizeStringArray(input)).toEqual(expected)
    })

    it('should handle empty array', () => {
      expect(sanitizeStringArray([])).toEqual([])
    })

    it('should handle array with only invalid strings', () => {
      const input = ['<><>', '   ', '\x00\x01']
      expect(sanitizeStringArray(input)).toEqual([])
    })

    it('should preserve accented characters in array', () => {
      const input = ['José', 'María', 'München']
      expect(sanitizeStringArray(input)).toEqual(['José', 'María', 'München'])
    })
  })

  describe('validateColumnSelection', () => {
    it('should validate and sanitize valid column selection', () => {
      const columns = ['Name', 'Age  ', '  Email']
      const result = validateColumnSelection(columns)

      expect(result.valid).toBe(true)
      expect(result.data).toEqual(['Name', 'Age', 'Email'])
      expect(result.error).toBeUndefined()
    })

    it('should reject empty column selection', () => {
      const result = validateColumnSelection([])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('At least one column must be selected')
      expect(result.data).toBeUndefined()
    })

    it('should reject columns with invalid names', () => {
      const columns = ['Valid', 'Column<script>']
      const result = validateColumnSelection(columns)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Column name contains invalid characters')
    })

    it('should reject too many columns', () => {
      const columns = Array(51).fill('Column').map((name, i) => `${name}${i + 1}`)
      const result = validateColumnSelection(columns)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Too many columns selected (max 50)')
    })

    it('should sanitize column names with extra whitespace', () => {
      const columns = ['  Name  ', '  Age  ', '  Email  ']
      const result = validateColumnSelection(columns)

      expect(result.valid).toBe(true)
      expect(result.data).toEqual(['Name', 'Age', 'Email'])
    })

    it('should handle non-array input', () => {
      const result = validateColumnSelection('not an array')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Expected array')
    })

    it('should handle null input', () => {
      const result = validateColumnSelection(null)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Expected array')
    })

    it('should handle undefined input', () => {
      const result = validateColumnSelection(undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Required')
    })

    it('should handle object input', () => {
      const result = validateColumnSelection({ invalid: 'object' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Expected array')
    })
  })

  describe('validateFileLimits', () => {
    const createMockFile = (name: string, size: number): File => {
      return new File(['x'.repeat(size)], name, { type: 'text/csv' })
    }

    it('should accept valid single file', () => {
      const files = [createMockFile('data.csv', 5 * 1024 * 1024)] // 5MB
      const result = validateFileLimits(files)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept file exactly at size limit', () => {
      const files = [createMockFile('data.csv', 10 * 1024 * 1024)] // 10MB
      const result = validateFileLimits(files)

      expect(result.valid).toBe(true)
    })

    it('should reject empty file array', () => {
      const result = validateFileLimits([])

      expect(result.valid).toBe(false)
      expect(result.error).toBe('No files provided')
    })

    it('should reject when exceeding max files', () => {
      const files = [createMockFile('file1.csv', 1000), createMockFile('file2.csv', 1000)]
      const result = validateFileLimits(files, 1) // Max 1 file

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Too many files. Maximum 1 file(s) allowed')
    })

    it('should accept multiple files when allowed', () => {
      const files = [
        createMockFile('file1.csv', 1000),
        createMockFile('file2.csv', 2000),
        createMockFile('file3.csv', 3000),
      ]
      const result = validateFileLimits(files, 5) // Max 5 files

      expect(result.valid).toBe(true)
    })

    it('should reject file exceeding size limit', () => {
      const files = [createMockFile('large.csv', 11 * 1024 * 1024)] // 11MB
      const result = validateFileLimits(files)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File "large.csv" exceeds maximum size of 10MB')
    })

    it('should reject file with custom size limit', () => {
      const files = [createMockFile('data.csv', 3 * 1024 * 1024)] // 3MB
      const result = validateFileLimits(files, 1, 2 * 1024 * 1024) // Max 2MB

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File "data.csv" exceeds maximum size of 2MB')
    })

    it('should reject empty file (0 bytes)', () => {
      const files = [createMockFile('empty.csv', 0)]
      const result = validateFileLimits(files)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File "empty.csv" is empty')
    })

    it('should identify first invalid file in array', () => {
      const files = [
        createMockFile('valid.csv', 1000),
        createMockFile('empty.csv', 0),
        createMockFile('large.csv', 20 * 1024 * 1024),
      ]
      const result = validateFileLimits(files, 5)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File "empty.csv" is empty')
    })

    it('should check size before emptiness in validation order', () => {
      const files = [createMockFile('overlimit.csv', 15 * 1024 * 1024)] // 15MB
      const result = validateFileLimits(files)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum size')
    })

    it('should use default maxFiles of 1', () => {
      const files = [createMockFile('file1.csv', 1000), createMockFile('file2.csv', 1000)]
      const result = validateFileLimits(files) // Uses default maxFiles = 1

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Too many files. Maximum 1 file(s) allowed')
    })

    it('should use default maxSize of 10MB', () => {
      const files = [createMockFile('large.csv', 11 * 1024 * 1024)]
      const result = validateFileLimits(files, 1) // Uses default maxSize = 10MB

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File "large.csv" exceeds maximum size of 10MB')
    })
  })
})
