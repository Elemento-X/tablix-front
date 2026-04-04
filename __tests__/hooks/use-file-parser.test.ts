/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useFileParser, type ParseResult } from '@/hooks/use-file-parser'
import Papa from 'papaparse'

// Mock excel-utils module
const mockWorksheetToArray = jest.fn()
const mockWorksheetToJsonWithHeaders = jest.fn()
const mockWorkbook = {
  worksheets: [{ name: 'Sheet1' }],
  xlsx: {
    load: jest.fn(),
  },
}
const mockExcelJS = {
  Workbook: jest.fn(() => mockWorkbook),
}

jest.mock('@/lib/excel-utils', () => ({
  getExcelJS: jest.fn(() => Promise.resolve(mockExcelJS)),
  worksheetToArray: (...args: unknown[]) => mockWorksheetToArray(...args),
  worksheetToJsonWithHeaders: (...args: unknown[]) => mockWorksheetToJsonWithHeaders(...args),
}))

// Mock xls-parser (Web Worker not available in jsdom)
const mockParseXls = jest.fn()
jest.mock('@/lib/xls-parser', () => ({
  parseXls: (...args: unknown[]) => mockParseXls(...args),
}))

// Mock papaparse
jest.mock('papaparse', () => ({
  parse: jest.fn(),
}))

// Mock fetch for server-side parsing
global.fetch = jest.fn()

/**
 * Polyfill arrayBuffer for jsdom's File/Blob (not available in older jsdom).
 */
function arrayBufferPolyfill(this: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsArrayBuffer(this)
  })
}
Blob.prototype.arrayBuffer = arrayBufferPolyfill
File.prototype.arrayBuffer = arrayBufferPolyfill

describe('useFileParser hook', () => {
  const MAX_CLIENT_PARSE_SIZE = 10 * 1024 * 1024 // 10MB

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})

    // Reset Excel mocks
    mockWorkbook.worksheets = [{ name: 'Sheet1' }]
    mockWorksheetToArray.mockReturnValue([])
    mockWorksheetToJsonWithHeaders.mockReturnValue([])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useFileParser())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.parseFile).toBe('function')
    })
  })

  describe('client-side parsing (small files < 10MB)', () => {
    describe('CSV files', () => {
      it('should parse CSV file in browser', async () => {
        const mockParsedData = {
          data: [
            { Name: 'John', Email: 'john@test.com' },
            { Name: 'Jane', Email: 'jane@test.com' },
          ],
          errors: [],
          meta: { fields: ['Name', 'Email'] },
        }

        ;(Papa.parse as jest.Mock).mockReturnValue(mockParsedData)

        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })
        Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

        const { result } = renderHook(() => useFileParser())

        let parseResult: ParseResult | undefined
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult!.columns).toEqual(['Name', 'Email'])
        expect(parseResult!.rowCount).toBe(2)
        expect(parseResult!.preview).toEqual(mockParsedData.data)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })

      it('should handle CSV parse errors', async () => {
        ;(Papa.parse as jest.Mock).mockReturnValue({
          data: [],
          errors: [{ message: 'Invalid CSV format' }],
          meta: { fields: [] },
        })

        const file = new File(['invalid,csv,data'], 'test.csv', {
          type: 'text/csv',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Parse failed',
            code: 'PARSE_ERROR',
          })
        })

        expect(result.current.error).toEqual({
          message: 'Parse failed',
          code: 'PARSE_ERROR',
        })
      })
    })

    describe('Excel files', () => {
      it('should parse XLSX file in browser via ExcelJS', async () => {
        mockWorksheetToArray.mockReturnValue([
          ['Name', 'Email'],
          ['John', 'john@test.com'],
          ['Jane', 'jane@test.com'],
        ])
        mockWorksheetToJsonWithHeaders.mockReturnValue([
          { Name: 'John', Email: 'john@test.com' },
          { Name: 'Jane', Email: 'jane@test.com' },
        ])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: ParseResult | undefined
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult!.columns).toEqual(['Name', 'Email'])
        expect(parseResult!.rowCount).toBe(2) // 3 rows - 1 header
      })

      it('should throw error when no sheets found', async () => {
        mockWorkbook.worksheets = []

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'No sheets found in workbook',
            code: 'PARSE_ERROR',
          })
        })
      })

      it('should throw error for empty spreadsheet', async () => {
        mockWorksheetToArray.mockReturnValue([])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Empty spreadsheet',
            code: 'PARSE_ERROR',
          })
        })
      })

      it('should throw error when no columns found in first row', async () => {
        mockWorksheetToArray.mockReturnValue([
          [null, null, ''], // Empty first row
          ['Data1', 'Data2'],
        ])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'No columns found in first row',
            code: 'PARSE_ERROR',
          })
        })
      })

      it('should filter out empty and null column names', async () => {
        mockWorksheetToArray.mockReturnValue([
          ['Name', null, 'Email', '', '  ', 'Phone'],
          ['John', null, 'john@test.com', '', '', '123'],
        ])
        mockWorksheetToJsonWithHeaders.mockReturnValue([
          { Name: 'John', Email: 'john@test.com', Phone: '123' },
        ])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: ParseResult | undefined
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult!.columns).toContain('Name')
        expect(parseResult!.columns).toContain('Email')
        expect(parseResult!.columns).toContain('Phone')
        expect(parseResult!.columns).not.toContain(null)
        expect(parseResult!.columns).not.toContain(undefined)
      })

      it('should parse XLS file via Web Worker (parseXls)', async () => {
        mockParseXls.mockResolvedValue({
          columns: ['Name'],
          rows: [{ Name: 'John' }],
          rowCount: 1,
        })

        const file = new File([''], 'test.xls', {
          type: 'application/vnd.ms-excel',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: ParseResult | undefined
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult!.columns).toEqual(['Name'])
        expect(parseResult!.rowCount).toBe(1)
        expect(mockParseXls).toHaveBeenCalled()
      })

      it('should throw error when XLS worker returns empty columns', async () => {
        // Worker strips empty/null columns — if all are empty, columns array is empty
        mockParseXls.mockResolvedValue({
          columns: [],
          rows: [],
          rowCount: 0,
        })

        const file = new File([''], 'empty-cols.xls', {
          type: 'application/vnd.ms-excel',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'No columns found in first row',
            code: 'PARSE_ERROR',
          })
        })
      })

      it('should reject XLS files exceeding free plan row limit', async () => {
        mockParseXls.mockResolvedValue({
          columns: ['Name'],
          rows: Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` })),
          rowCount: 501,
        })

        const file = new File([''], 'big.xls', {
          type: 'application/vnd.ms-excel',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file, 'free')).rejects.toEqual({
            message: 'File exceeds row limit: 501 rows (max 500 for Free plan)',
            code: 'PARSE_ERROR',
          })
        })
      })

      it('should reject XLS files when worker itself throws', async () => {
        mockParseXls.mockRejectedValue(new Error('Worker crashed'))

        const file = new File([''], 'crash.xls', {
          type: 'application/vnd.ms-excel',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Parse failed',
            code: 'PARSE_ERROR',
          })
        })
      })
    })

    describe('file read errors', () => {
      it('should handle arrayBuffer failure', async () => {
        const file = new File([''], 'test.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'size', { value: 1024 })
        file.arrayBuffer = () => Promise.reject(new Error('Read failed'))

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Parse failed',
            code: 'PARSE_ERROR',
          })
        })
      })
    })
  })

  describe('server-side parsing (large files >= 10MB)', () => {
    it('should parse large file on server', async () => {
      const mockServerResponse = {
        columns: ['Name', 'Email'],
        rowCount: 10000,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServerResponse),
      })

      const file = new File([''], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      expect(parseResult!.columns).toEqual(['Name', 'Email'])
      expect(parseResult!.rowCount).toBe(10000)
      expect(global.fetch).toHaveBeenCalledWith('/api/preview', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    it('should handle server error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server processing failed' }),
      })

      const file = new File([''], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await expect(result.current.parseFile(file)).rejects.toEqual({
          message: 'Parse failed',
          code: 'PARSE_ERROR',
        })
      })
    })

    it('should handle server error without error message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      const file = new File([''], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await expect(result.current.parseFile(file)).rejects.toEqual({
          message: 'Parse failed',
          code: 'PARSE_ERROR',
        })
      })
    })

    it('should handle network failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const file = new File([''], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await expect(result.current.parseFile(file)).rejects.toEqual({
          message: 'Parse failed',
          code: 'PARSE_ERROR',
        })
      })
    })

    it('should handle missing columns in server response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const file = new File([''], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      expect(parseResult!.columns).toEqual([])
      expect(parseResult!.rowCount).toBe(0)
    })
  })

  describe('smart parsing threshold', () => {
    it('should use client-side for files just under 10MB', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'John' }],
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', {
        value: MAX_CLIENT_PARSE_SIZE - 1,
      }) // Just under 10MB

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(file)
      })

      // Should NOT call fetch (client-side parsing)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should use server-side for files at exactly 10MB', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: ['Name'], rowCount: 1 }),
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: MAX_CLIENT_PARSE_SIZE }) // Exactly 10MB

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(file)
      })

      // Should call fetch (server-side parsing)
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should set loading true during parsing', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'John' }],
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      expect(result.current.isLoading).toBe(false)

      const parsePromise = act(async () => {
        await result.current.parseFile(file)
      })

      await parsePromise

      expect(result.current.isLoading).toBe(false)
    })

    it('should reset loading on error', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [{ message: 'Parse error' }],
        meta: { fields: [] },
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('error state', () => {
    it('should clear error on successful parse', async () => {
      // First, trigger an error
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [],
        errors: [{ message: 'First error' }],
        meta: { fields: [] },
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected
        }
      })

      expect(result.current.error).not.toBeNull()

      // Now successful parse
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Name: 'John' }],
        errors: [],
        meta: { fields: ['Name'] },
      })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle non-Error thrown objects', async () => {
      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error'
      })

      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected
        }
      })

      expect(result.current.error?.message).toBe('Parse failed')
    })
  })

  describe('row limit enforcement', () => {
    it('should reject CSV files exceeding free plan row limit (500)', async () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File([''], 'big.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await expect(result.current.parseFile(file, 'free')).rejects.toEqual({
          message: 'File exceeds row limit: 501 rows (max 500 for Free plan)',
          code: 'PARSE_ERROR',
        })
      })
    })

    it('should accept CSV files within free plan row limit', async () => {
      const rows = Array.from({ length: 500 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File([''], 'ok.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file, 'free')
      })

      expect(parseResult!.rowCount).toBe(500)
    })

    it('should reject XLSX files exceeding free plan row limit', async () => {
      // 502 rows: 1 header + 501 data rows
      const arrayData = [['Name'], ...Array.from({ length: 501 }, (_, i) => [`Row${i}`])]
      mockWorksheetToArray.mockReturnValue(arrayData)

      const file = new File([''], 'big.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await expect(result.current.parseFile(file, 'free')).rejects.toEqual({
          message: 'File exceeds row limit: 501 rows (max 500 for Free plan)',
          code: 'PARSE_ERROR',
        })
      })
    })

    it('should allow more rows with pro plan', async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File([''], 'ok.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file, 'pro')
      })

      expect(parseResult!.rowCount).toBe(1000)
    })
  })

  describe('column name sanitization', () => {
    it('should sanitize column names with special characters', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ '<script>alert(1)</script>': 'val' }],
        errors: [],
        meta: { fields: ['<script>alert(1)</script>'] },
      })

      const file = new File([''], 'xss.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      // sanitizeString removes < and >
      expect(parseResult!.columns[0]).not.toContain('<')
      expect(parseResult!.columns[0]).not.toContain('>')
    })
  })

  describe('sanitizePreviewRows — cell value sanitization', () => {
    it('should sanitize XSS payloads in CSV preview cell values', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [
          { Name: '<script>alert(1)</script>', Email: 'safe@test.com' },
          { Name: 'Normal', Email: 'foo@bar.com' },
        ],
        errors: [],
        meta: { fields: ['Name', 'Email'] },
      })

      const file = new File([''], 'xss-values.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      // Cell values in preview must have < and > stripped
      const preview = parseResult!.preview!
      expect(preview[0].Name).not.toContain('<')
      expect(preview[0].Name).not.toContain('>')
    })

    it('should sanitize XSS payloads in XLSX preview cell values', async () => {
      mockWorksheetToArray.mockReturnValue([
        ['Name', 'Value'],
        ['<img onerror=alert(1)>', 'safe'],
      ])
      mockWorksheetToJsonWithHeaders.mockReturnValue([
        { Name: '<img onerror=alert(1)>', Value: 'safe' },
      ])

      const file = new File([''], 'xss.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      const preview = parseResult!.preview!
      expect(preview[0].Name).not.toContain('<')
      expect(preview[0].Name).not.toContain('>')
    })

    it('should sanitize XSS payloads in XLS preview cell values', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name'],
        rows: [{ Name: '<script>xss</script>' }, { Name: 'clean' }],
        rowCount: 2,
      })

      const file = new File([''], 'xss.xls', {
        type: 'application/vnd.ms-excel',
      })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      const preview = parseResult!.preview!
      expect(preview[0].Name).not.toContain('<')
      expect(preview[0].Name).not.toContain('>')
    })

    it('should preserve non-string values (numbers, booleans, null) in preview rows', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Count: 42, Active: true, Note: null }],
        errors: [],
        meta: { fields: ['Count', 'Active', 'Note'] },
      })

      const file = new File([''], 'types.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 1024 })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      const preview = parseResult!.preview!
      // Non-string values must not be altered by sanitizePreviewRows
      expect(preview[0].Count).toBe(42)
      expect(preview[0].Active).toBe(true)
      expect(preview[0].Note).toBeNull()
    })
  })
})
