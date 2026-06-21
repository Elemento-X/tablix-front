/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useFileParser, type ParseResult } from '@/hooks/use-file-parser'
import { SpreadsheetParseError } from '@/lib/spreadsheet-errors'
import Papa from 'papaparse'

/**
 * SpreadsheetParseError is NOT mocked — must be the real class so that
 * `err instanceof SpreadsheetParseError` inside the hook works correctly.
 *
 * @/lib/excel-utils is NOT mocked — it is no longer imported by use-file-parser.
 * All Excel paths (.xls / .xlsx / .xlsm) now go through parseXls (worker).
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockParseXls = jest.fn()
jest.mock('@/lib/xls-parser', () => ({
  parseXls: (...args: unknown[]) => mockParseXls(...args),
}))

jest.mock('papaparse', () => ({
  parse: jest.fn(),
}))

global.fetch = jest.fn()

// ── arrayBuffer polyfill ──────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: sizeBytes })
  return file
}

const MAX_CLIENT_PARSE_SIZE = 10 * 1024 * 1024

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('useFileParser hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has isLoading=false, error=null and exposes parseFile', () => {
      const { result } = renderHook(() => useFileParser())
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.parseFile).toBe('function')
    })
  })

  // ── CSV — happy path ──────────────────────────────────────────────────────

  describe('CSV — happy path', () => {
    it('returns columns, rowCount and preview on success', async () => {
      const mockData = {
        data: [
          { Name: 'John', Email: 'john@test.com' },
          { Name: 'Jane', Email: 'jane@test.com' },
        ],
        errors: [],
        meta: { fields: ['Name', 'Email'] },
      }
      ;(Papa.parse as jest.Mock).mockReturnValue(mockData)

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('test.csv', 'text/csv'))
      })

      expect(parseResult!.columns).toEqual(['Name', 'Email'])
      expect(parseResult!.rowCount).toBe(2)
      expect(parseResult!.preview).toEqual(mockData.data)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('accepts files at exactly the free plan row limit (500)', async () => {
      const rows = Array.from({ length: 500 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('ok.csv', 'text/csv'), 'free')
      })

      expect(parseResult!.rowCount).toBe(500)
    })

    it('allows more rows with pro plan', async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('ok.csv', 'text/csv'), 'pro')
      })

      expect(parseResult!.rowCount).toBe(1000)
    })
  })

  // ── CSV — error paths ─────────────────────────────────────────────────────

  describe('CSV — error paths', () => {
    it('throws SpreadsheetParseError(CORRUPT_FILE) on PapaParse errors', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [{ message: 'Invalid CSV format' }],
        meta: { fields: [] },
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('test.csv', 'text/csv'))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('CORRUPT_FILE')
      expect((caughtErr as SpreadsheetParseError).message).toBe('Invalid CSV format')
      expect(result.current.error).toEqual({ message: 'Invalid CSV format', code: 'CORRUPT_FILE' })
    })

    it('throws SpreadsheetParseError(NO_COLUMNS) when CSV fields are empty after sanitization', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [],
        meta: { fields: [] },
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('empty.csv', 'text/csv'))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('NO_COLUMNS')
    })

    it('throws SpreadsheetParseError(ROW_LIMIT) with params for CSV exceeding free plan limit (501 rows)', async () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('big.csv', 'text/csv'), 'free')
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('ROW_LIMIT')
      expect((caughtErr as SpreadsheetParseError).params).toEqual({
        total: '501',
        max: '500',
        plan: 'free',
      })
      expect(result.current.error).toMatchObject({ code: 'ROW_LIMIT' })
    })
  })

  // ── Excel (.xls / .xlsx / .xlsm) via parseXls ────────────────────────────

  describe('Excel files — all extensions routed through parseXls', () => {
    it('parses .xlsx via parseXls and returns columns/rowCount/preview', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name', 'Email'],
        rows: [
          { Name: 'John', Email: 'john@test.com' },
          { Name: 'Jane', Email: 'jane@test.com' },
        ],
        rowCount: 2,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile(
            'test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ),
        )
      })

      expect(parseResult!.columns).toEqual(['Name', 'Email'])
      expect(parseResult!.rowCount).toBe(2)
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('parses .xls via parseXls', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name'],
        rows: [{ Name: 'John' }],
        rowCount: 1,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('test.xls', 'application/vnd.ms-excel'),
        )
      })

      expect(parseResult!.columns).toEqual(['Name'])
      expect(parseResult!.rowCount).toBe(1)
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('parses .xlsm via parseXls', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['ID', 'Value'],
        rows: [{ ID: '1', Value: 'x' }],
        rowCount: 1,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('test.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12'),
        )
      })

      expect(parseResult!.columns).toEqual(['ID', 'Value'])
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('throws SpreadsheetParseError(NO_COLUMNS) when parseXls returns empty columns array', async () => {
      mockParseXls.mockResolvedValue({ columns: [], rows: [], rowCount: 0 })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(
            makeFile(
              'empty-cols.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          )
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('NO_COLUMNS')
    })

    it('throws SpreadsheetParseError(ROW_LIMIT) with params for xlsx exceeding free plan limit', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name'],
        rows: Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` })),
        rowCount: 501,
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(
            makeFile(
              'big.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
            'free',
          )
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('ROW_LIMIT')
      expect((caughtErr as SpreadsheetParseError).params).toEqual({
        total: '501',
        max: '500',
        plan: 'free',
      })
    })

    it('re-throws SpreadsheetParseError from parseXls unchanged — same reference (CORRUPT_FILE)', async () => {
      const originalErr = new SpreadsheetParseError('CORRUPT_FILE', 'Bad file data')
      mockParseXls.mockRejectedValue(originalErr)

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(
            makeFile(
              'corrupt.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          )
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBe(originalErr)
      expect((caughtErr as SpreadsheetParseError).code).toBe('CORRUPT_FILE')
      expect(result.current.error).toEqual({ message: 'Bad file data', code: 'CORRUPT_FILE' })
    })

    it('re-throws SpreadsheetParseError(NO_SHEETS) from parseXls unchanged', async () => {
      mockParseXls.mockRejectedValue(new SpreadsheetParseError('NO_SHEETS', 'No sheets found'))

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(
            makeFile(
              'empty.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          )
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('NO_SHEETS')
    })

    it('wraps unexpected Error from parseXls as SpreadsheetParseError(UNKNOWN)', async () => {
      mockParseXls.mockRejectedValue(new Error('Worker crashed unexpectedly'))

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(
            makeFile(
              'crash.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          )
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNKNOWN')
      expect((caughtErr as SpreadsheetParseError).message).toBe('Worker crashed unexpectedly')
      expect(result.current.error).toEqual({
        message: 'Worker crashed unexpectedly',
        code: 'UNKNOWN',
      })
    })
  })

  // ── Unsupported format ────────────────────────────────────────────────────

  describe('unsupported format', () => {
    it('throws SpreadsheetParseError(UNSUPPORTED_FORMAT) for .pdf', async () => {
      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('document.pdf', 'application/pdf'))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNSUPPORTED_FORMAT')
    })

    it('throws SpreadsheetParseError(UNSUPPORTED_FORMAT) for .doc', async () => {
      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('document.doc', 'application/msword'))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNSUPPORTED_FORMAT')
    })
  })

  // ── UNKNOWN wrap — non-Error throws ──────────────────────────────────────

  describe('UNKNOWN wrap for non-Error thrown values', () => {
    it('wraps thrown string as SpreadsheetParseError(UNKNOWN) with generic message', async () => {
      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error'
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('test.csv', 'text/csv'))
        } catch {
          // expected
        }
      })

      expect(result.current.error?.code).toBe('UNKNOWN')
      expect(result.current.error?.message).toBe('Unknown parsing error')
    })
  })

  // ── arrayBuffer failure ───────────────────────────────────────────────────

  describe('file read failure', () => {
    it('wraps arrayBuffer rejection as SpreadsheetParseError(UNKNOWN)', async () => {
      const file = makeFile('test.csv', 'text/csv')
      file.arrayBuffer = () => Promise.reject(new Error('Read failed'))

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNKNOWN')
      expect((caughtErr as SpreadsheetParseError).message).toBe('Read failed')
    })
  })

  // ── Server-side parsing (large files >= 10MB) ─────────────────────────────

  describe('server-side parsing (files >= 10MB)', () => {
    it('calls /api/preview for large files and returns result', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: ['Name', 'Email'], rowCount: 10000 }),
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('large.csv', 'text/csv', 15 * 1024 * 1024),
        )
      })

      expect(parseResult!.columns).toEqual(['Name', 'Email'])
      expect(parseResult!.rowCount).toBe(10000)
      expect(global.fetch).toHaveBeenCalledWith('/api/preview', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    it('wraps server HTTP error as SpreadsheetParseError(UNKNOWN)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server processing failed' }),
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('large.csv', 'text/csv', 15 * 1024 * 1024))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNKNOWN')
      expect((caughtErr as SpreadsheetParseError).message).toBe('Server processing failed')
    })

    it('wraps server error without body message as SpreadsheetParseError(UNKNOWN)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('large.csv', 'text/csv', 15 * 1024 * 1024))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNKNOWN')
    })

    it('wraps network failure as SpreadsheetParseError(UNKNOWN)', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useFileParser())
      let caughtErr: unknown

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('large.csv', 'text/csv', 15 * 1024 * 1024))
        } catch (e) {
          caughtErr = e
        }
      })

      expect(caughtErr).toBeInstanceOf(SpreadsheetParseError)
      expect((caughtErr as SpreadsheetParseError).code).toBe('UNKNOWN')
      expect((caughtErr as SpreadsheetParseError).message).toBe('Network error')
    })

    it('handles missing columns/rowCount in server response (defaults to empty)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('large.csv', 'text/csv', 15 * 1024 * 1024),
        )
      })

      expect(parseResult!.columns).toEqual([])
      expect(parseResult!.rowCount).toBe(0)
    })
  })

  // ── Smart parsing threshold ───────────────────────────────────────────────

  describe('smart parsing threshold (10MB)', () => {
    it('uses client-side for files just under 10MB (no fetch call)', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'John' }],
        errors: [],
        meta: { fields: ['Name'] },
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(makeFile('test.csv', 'text/csv', MAX_CLIENT_PARSE_SIZE - 1))
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('uses server-side for files at exactly 10MB (fetch is called)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: ['Name'], rowCount: 1 }),
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(makeFile('test.csv', 'text/csv', MAX_CLIENT_PARSE_SIZE))
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  // ── Loading state ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('resets isLoading to false after successful parse', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'John' }],
        errors: [],
        meta: { fields: ['Name'] },
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        await result.current.parseFile(makeFile('test.csv', 'text/csv'))
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('resets isLoading to false after an error', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [{ message: 'Parse error' }],
        meta: { fields: [] },
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('test.csv', 'text/csv'))
        } catch {
          // expected
        }
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  // ── Error state ───────────────────────────────────────────────────────────

  describe('error state', () => {
    it('clears error on a subsequent successful parse', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [],
        errors: [{ message: 'First error' }],
        meta: { fields: [] },
      })

      const file = makeFile('test.csv', 'text/csv')
      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // expected
        }
      })

      expect(result.current.error).not.toBeNull()
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

    it('error.code reflects the specific ParseErrorCode (not a generic PARSE_ERROR)', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [{ message: 'bad csv' }],
        meta: { fields: [] },
      })

      const { result } = renderHook(() => useFileParser())

      await act(async () => {
        try {
          await result.current.parseFile(makeFile('test.csv', 'text/csv'))
        } catch {
          // expected
        }
      })

      expect(result.current.error?.code).toBe('CORRUPT_FILE')
    })
  })

  // ── Column name sanitization ──────────────────────────────────────────────

  describe('column name sanitization', () => {
    it('strips XSS tags from CSV column names', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ '<script>alert(1)</script>': 'val' }],
        errors: [],
        meta: { fields: ['<script>alert(1)</script>'] },
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('xss.csv', 'text/csv'))
      })

      expect(parseResult!.columns[0]).not.toContain('<')
      expect(parseResult!.columns[0]).not.toContain('>')
    })

    it('strips XSS tags from XLSX column names returned by parseXls', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['<script>xss</script>', 'Safe'],
        rows: [],
        rowCount: 0,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('xss.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        )
      })

      expect(parseResult!.columns[0]).not.toContain('<')
      expect(parseResult!.columns[0]).not.toContain('>')
    })
  })

  // ── Preview row sanitization ──────────────────────────────────────────────

  describe('sanitizePreviewRows — cell value sanitization', () => {
    it('strips XSS tags from CSV preview cell values', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: '<script>alert(1)</script>', Email: 'safe@test.com' }],
        errors: [],
        meta: { fields: ['Name', 'Email'] },
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('xss.csv', 'text/csv'))
      })

      expect(parseResult!.preview![0].Name).not.toContain('<')
      expect(parseResult!.preview![0].Name).not.toContain('>')
    })

    it('strips XSS tags from xlsx preview cell values (via parseXls mock)', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name', 'Value'],
        rows: [{ Name: '<img onerror=alert(1)>', Value: 'safe' }],
        rowCount: 1,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('xss.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        )
      })

      expect(parseResult!.preview![0].Name).not.toContain('<')
      expect(parseResult!.preview![0].Name).not.toContain('>')
    })

    it('strips XSS tags from xls preview cell values', async () => {
      mockParseXls.mockResolvedValue({
        columns: ['Name'],
        rows: [{ Name: '<script>xss</script>' }, { Name: 'clean' }],
        rowCount: 2,
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(
          makeFile('xss.xls', 'application/vnd.ms-excel'),
        )
      })

      expect(parseResult!.preview![0].Name).not.toContain('<')
      expect(parseResult!.preview![0].Name).not.toContain('>')
    })

    it('preserves non-string values (number, boolean, null) in preview rows', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Count: 42, Active: true, Note: null }],
        errors: [],
        meta: { fields: ['Count', 'Active', 'Note'] },
      })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('types.csv', 'text/csv'))
      })

      expect(parseResult!.preview![0].Count).toBe(42)
      expect(parseResult!.preview![0].Active).toBe(true)
      expect(parseResult!.preview![0].Note).toBeNull()
    })

    it('limits preview to at most 5 rows', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValue({ data, errors: [], meta: { fields: ['Name'] } })

      const { result } = renderHook(() => useFileParser())
      let parseResult: ParseResult | undefined

      await act(async () => {
        parseResult = await result.current.parseFile(makeFile('big.csv', 'text/csv'))
      })

      expect(parseResult!.preview!.length).toBeLessThanOrEqual(5)
    })
  })
})
