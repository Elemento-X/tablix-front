/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileParser, type ParseResult } from '@/hooks/use-file-parser'

// Mock xlsx library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}))

// Mock papaparse library
jest.mock('papaparse', () => ({
  parse: jest.fn(),
}))

import * as XLSX from 'xlsx'
import Papa from 'papaparse'

describe('use-file-parser.ts', () => {
  const mockXLSX = XLSX as jest.Mocked<typeof XLSX>
  const mockPapa = Papa as jest.Mocked<typeof Papa>

  // Mock FileReader that returns immediately
  let mockFileReaderInstance: any

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()

    // Setup FileReader mock
    mockFileReaderInstance = {
      onload: null as any,
      onerror: null as any,
      result: new ArrayBuffer(8),
      readAsArrayBuffer: jest.fn(function(this: any) {
        // Execute onload synchronously for predictable testing
        Promise.resolve().then(() => {
          if (this.onload) {
            this.onload({ target: { result: this.result } })
          }
        })
      }),
    }

    global.FileReader = jest.fn(() => mockFileReaderInstance) as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob(['test'], { type })
    Object.defineProperty(blob, 'size', { value: size, writable: false })
    const file = new File([blob], name, { type })
    Object.defineProperty(file, 'size', { value: size, writable: false })
    return file
  }

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useFileParser())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.parseFile).toBe('function')
    })
  })

  describe('parseFile - CSV files', () => {
    it('should parse CSV file successfully', async () => {
      const mockFile = createMockFile('test.csv', 1024, 'text/csv')

      mockPapa.parse.mockReturnValue({
        data: [
          { name: 'John', age: '30' },
          { name: 'Jane', age: '25' },
        ],
        meta: { fields: ['name', 'age'] },
        errors: [],
      } as any)

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      await waitFor(() => {
        expect(parseResult).toBeDefined()
      })

      expect(parseResult?.columns).toEqual(['name', 'age'])
      expect(parseResult?.rowCount).toBe(2)
      expect(result.current.error).toBeNull()
    })

    it('should handle CSV parsing errors', async () => {
      const mockFile = createMockFile('test.csv', 1024, 'text/csv')

      mockPapa.parse.mockReturnValue({
        data: [],
        meta: { fields: [] },
        errors: [{ message: 'Invalid CSV format' }],
      } as any)

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Invalid CSV format',
        code: 'PARSE_ERROR',
      })
    })
  })

  describe('parseFile - Excel files', () => {
    it('should parse XLSX file successfully', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Name', 'Email', 'Age'], ['John', 'john@test.com', 30]])
        .mockReturnValueOnce([{ Name: 'John', Email: 'john@test.com', Age: 30 }])

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      await waitFor(() => {
        expect(parseResult).toBeDefined()
      })

      expect(parseResult?.columns).toEqual(['Name', 'Email', 'Age'])
      expect(parseResult?.rowCount).toBe(1)
    })

    it('should handle empty spreadsheet', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json.mockReturnValue([])

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Empty spreadsheet',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle spreadsheet with no columns', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json.mockReturnValue([[null, undefined, '']])

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'No columns found in first row',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle workbook with no sheets', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: [],
        Sheets: {},
      } as any)

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'No sheets found in workbook',
        code: 'PARSE_ERROR',
      })
    })

    it('should filter out null, undefined, and empty columns', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Name', null, 'Age', '', undefined, 'Email']])
        .mockReturnValueOnce([])

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      await waitFor(() => {
        expect(parseResult).toBeDefined()
      })

      expect(parseResult?.columns).toEqual(['Name', 'Age', 'Email'])
    })

    it('should trim column names', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['  Name  ', '  Age  ']])
        .mockReturnValueOnce([])

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      await waitFor(() => {
        expect(parseResult).toBeDefined()
      })

      expect(parseResult?.columns).toEqual(['Name', 'Age'])
    })
  })

  describe('parseFile - Server-side fallback for large files', () => {
    it('should use server-side parsing for files >= 10MB', async () => {
      const largeSize = 11 * 1024 * 1024 // 11MB
      const mockFile = createMockFile('large.xlsx', largeSize, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          columns: ['ServerCol1', 'ServerCol2'],
          rowCount: 1000,
        }),
      })

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/preview', expect.any(Object))
      expect(parseResult?.columns).toEqual(['ServerCol1', 'ServerCol2'])
      expect(parseResult?.rowCount).toBe(1000)
    })

    it('should handle server-side parsing errors', async () => {
      const largeSize = 11 * 1024 * 1024
      const mockFile = createMockFile('large.xlsx', largeSize, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Server error',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle default error message when server returns no error', async () => {
      const largeSize = 11 * 1024 * 1024
      const mockFile = createMockFile('large.xlsx', largeSize, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Failed to parse file on server',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle network errors', async () => {
      const largeSize = 11 * 1024 * 1024
      const mockFile = createMockFile('large.xlsx', largeSize, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Network error',
        code: 'PARSE_ERROR',
      })
    })
  })

  describe('error handling', () => {
    it('should reject with PARSE_ERROR code on failure', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockImplementation(() => {
        throw new Error('Custom error')
      })

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Custom error',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle non-Error exceptions with default message', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockImplementation(() => {
        throw 'String error'
      })

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Failed to parse file',
        code: 'PARSE_ERROR',
      })
    })
  })

  describe('file type detection', () => {
    it('should detect CSV by file extension', async () => {
      const mockFile = createMockFile('data.csv', 1024, 'text/csv')

      mockPapa.parse.mockReturnValue({
        data: [{ col: 'value' }],
        meta: { fields: ['col'] },
        errors: [],
      } as any)

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(mockFile)
      })

      expect(mockPapa.parse).toHaveBeenCalled()
      expect(mockXLSX.read).not.toHaveBeenCalled()
    })

    it('should detect XLSX by file extension', async () => {
      const mockFile = createMockFile('data.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Col']])
        .mockReturnValueOnce([])

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(mockFile)
      })

      expect(mockXLSX.read).toHaveBeenCalled()
      expect(mockPapa.parse).not.toHaveBeenCalled()
    })
  })

  describe('preview data', () => {
    it('should return preview data for CSV', async () => {
      const mockFile = createMockFile('test.csv', 1024, 'text/csv')

      const previewData = [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]

      mockPapa.parse.mockReturnValue({
        data: previewData,
        meta: { fields: ['name', 'age'] },
        errors: [],
      } as any)

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      expect(parseResult?.preview).toEqual(previewData)
    })

    it('should return preview data for Excel', async () => {
      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      const previewData = [{ Name: 'Row1' }, { Name: 'Row2' }]

      mockXLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockXLSX.utils.sheet_to_json
        .mockReturnValueOnce([['Name'], ['Row1'], ['Row2']])
        .mockReturnValueOnce(previewData)

      const { result } = renderHook(() => useFileParser())

      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(mockFile)
      })

      expect(parseResult?.preview).toEqual(previewData)
    })
  })

  describe('edge cases', () => {
    it('should handle FileReader errors', async () => {
      // Override mock to trigger error
      mockFileReaderInstance.readAsArrayBuffer = jest.fn(function(this: any) {
        Promise.resolve().then(() => {
          if (this.onerror) {
            this.onerror()
          }
        })
      })

      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Failed to read file',
        code: 'PARSE_ERROR',
      })
    })

    it('should handle null file data', async () => {
      // Override mock to return null result
      mockFileReaderInstance.result = null
      mockFileReaderInstance.readAsArrayBuffer = jest.fn(function(this: any) {
        Promise.resolve().then(() => {
          if (this.onload) {
            this.onload({ target: { result: null } })
          }
        })
      })

      const mockFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      const { result } = renderHook(() => useFileParser())

      await expect(
        act(async () => {
          await result.current.parseFile(mockFile)
        })
      ).rejects.toMatchObject({
        message: 'Failed to read file',
        code: 'PARSE_ERROR',
      })
    })
  })
})
