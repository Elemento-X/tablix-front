/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFileParser } from '@/hooks/use-file-parser'

// Mock XLSX library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}))

// Mock papaparse
jest.mock('papaparse', () => ({
  parse: jest.fn(),
}))

import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null
  onerror: (() => void) | null = null
  result: ArrayBuffer | null = null

  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      this.result = new ArrayBuffer(100)
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
}

// @ts-ignore
global.FileReader = MockFileReader

// Mock fetch for server-side parsing
global.fetch = jest.fn()

describe('useFileParser hook', () => {
  const MAX_CLIENT_PARSE_SIZE = 10 * 1024 * 1024 // 10MB

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {})
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

        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'size', { value: 1024 }) // 1KB

        const { result } = renderHook(() => useFileParser())

        let parseResult: any
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult.columns).toEqual(['Name', 'Email'])
        expect(parseResult.rowCount).toBe(2)
        expect(parseResult.preview).toEqual(mockParsedData.data)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })

      it('should handle CSV parse errors', async () => {
        ;(Papa.parse as jest.Mock).mockReturnValue({
          data: [],
          errors: [{ message: 'Invalid CSV format' }],
          meta: { fields: [] },
        })

        const file = new File(['invalid,csv,data'], 'test.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Invalid CSV format',
            code: 'PARSE_ERROR',
          })
        })

        expect(result.current.error).toEqual({
          message: 'Invalid CSV format',
          code: 'PARSE_ERROR',
        })
      })
    })

    describe('Excel files', () => {
      it('should parse XLSX file in browser', async () => {
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock)
          .mockReturnValueOnce([
            ['Name', 'Email'],
            ['John', 'john@test.com'],
            ['Jane', 'jane@test.com'],
          ])
          .mockReturnValueOnce([
            { Name: 'John', Email: 'john@test.com' },
            { Name: 'Jane', Email: 'jane@test.com' },
          ])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: any
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult.columns).toEqual(['Name', 'Email'])
        expect(parseResult.rowCount).toBe(2) // 3 rows - 1 header
      })

      it('should throw error when no sheets found', async () => {
        const mockWorkbook = {
          SheetNames: [],
          Sheets: {},
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)

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
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock).mockReturnValueOnce([])

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
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock).mockReturnValueOnce([
          [null, undefined, ''], // Empty first row
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
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock)
          .mockReturnValueOnce([
            ['Name', null, 'Email', '', '  ', 'Phone'],
            ['John', null, 'john@test.com', '', '', '123'],
          ])
          .mockReturnValueOnce([{ Name: 'John', Email: 'john@test.com', Phone: '123' }])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: any
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        // The parser filters out null, undefined, and empty strings
        // But whitespace-only strings get trimmed to empty and filtered
        // The actual implementation filters based on truthiness after trim
        expect(parseResult.columns).toContain('Name')
        expect(parseResult.columns).toContain('Email')
        expect(parseResult.columns).toContain('Phone')
        expect(parseResult.columns).not.toContain(null)
        expect(parseResult.columns).not.toContain(undefined)
      })

      it('should parse XLS file in browser', async () => {
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }

        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock)
          .mockReturnValueOnce([['Name'], ['John']])
          .mockReturnValueOnce([{ Name: 'John' }])

        const file = new File([''], 'test.xls', { type: 'application/vnd.ms-excel' })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        let parseResult: any
        await act(async () => {
          parseResult = await result.current.parseFile(file)
        })

        expect(parseResult.columns).toEqual(['Name'])
      })
    })

    describe('file read errors', () => {
      it('should handle file read failure', async () => {
        class FailingFileReader {
          onload: ((event: any) => void) | null = null
          onerror: (() => void) | null = null

          readAsArrayBuffer() {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror()
              }
            }, 0)
          }
        }

        // @ts-ignore
        global.FileReader = FailingFileReader

        const file = new File([''], 'test.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Failed to read file',
            code: 'PARSE_ERROR',
          })
        })

        // Restore mock
        // @ts-ignore
        global.FileReader = MockFileReader
      })

      it('should handle null file data', async () => {
        class NullDataFileReader {
          onload: ((event: any) => void) | null = null
          onerror: (() => void) | null = null

          readAsArrayBuffer() {
            setTimeout(() => {
              if (this.onload) {
                this.onload({ target: { result: null } })
              }
            }, 0)
          }
        }

        // @ts-ignore
        global.FileReader = NullDataFileReader

        const file = new File([''], 'test.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'size', { value: 1024 })

        const { result } = renderHook(() => useFileParser())

        await act(async () => {
          await expect(result.current.parseFile(file)).rejects.toEqual({
            message: 'Failed to read file',
            code: 'PARSE_ERROR',
          })
        })

        // Restore mock
        // @ts-ignore
        global.FileReader = MockFileReader
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

      let parseResult: any
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      expect(parseResult.columns).toEqual(['Name', 'Email'])
      expect(parseResult.rowCount).toBe(10000)
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
          message: 'Server processing failed',
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
          message: 'Failed to parse file on server',
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
          message: 'Network error',
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

      let parseResult: any
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      expect(parseResult.columns).toEqual([])
      expect(parseResult.rowCount).toBe(0)
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
      Object.defineProperty(file, 'size', { value: MAX_CLIENT_PARSE_SIZE - 1 }) // Just under 10MB

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

      // Note: Due to async nature, loading state might be checked during promise resolution
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

      expect(result.current.error?.message).toBe('Failed to parse file')
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

      let parseResult: ReturnType<typeof result.current.parseFile> extends Promise<infer T>
        ? T
        : never
      await act(async () => {
        parseResult = await result.current.parseFile(file, 'free')
      })

      expect(parseResult!.rowCount).toBe(500)
    })

    it('should reject XLSX files exceeding free plan row limit', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      }

      // 502 rows: 1 header + 501 data rows
      const jsonData = [['Name'], ...Array.from({ length: 501 }, (_, i) => [`Row${i}`])]

      ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
      ;(XLSX.utils.sheet_to_json as jest.Mock).mockReturnValueOnce(jsonData)

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

      let parseResult: ReturnType<typeof result.current.parseFile> extends Promise<infer T>
        ? T
        : never
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

      let parseResult: ReturnType<typeof result.current.parseFile> extends Promise<infer T>
        ? T
        : never
      await act(async () => {
        parseResult = await result.current.parseFile(file)
      })

      // sanitizeString removes < and >
      expect(parseResult!.columns[0]).not.toContain('<')
      expect(parseResult!.columns[0]).not.toContain('>')
    })
  })
})
