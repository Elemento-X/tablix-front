/**
 * @jest-environment jsdom
 */
import {
  mergeSpreadsheets,
  canProcessClientSide,
  downloadBlob,
  type MergeOptions,
} from '@/lib/spreadsheet-merge'
import { SpreadsheetParseError } from '@/lib/spreadsheet-errors'

/**
 * Reading path change (post-refactor):
 *   .csv  → PapaParse (unchanged)
 *   .xls / .xlsx / .xlsm → parseXls (SheetJS Web Worker) — no longer ExcelJS
 *
 * Writing path is unchanged: createWorkbookFromJson / addSheetFromJson (ExcelJS).
 */

// ── Write-path mock (ExcelJS via excel-utils) ─────────────────────────────────

const mockWriteBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)))
const mockAddWorksheet = jest.fn(() => ({ columns: null, addRow: jest.fn() }))
const mockWorkbook = {
  addWorksheet: mockAddWorksheet,
  xlsx: {
    writeBuffer: mockWriteBuffer,
  },
}

jest.mock('@/lib/excel-utils', () => ({
  // Write-path helpers — still used by mergeSpreadsheets for output generation
  createWorkbookFromJson: jest.fn(() => Promise.resolve(mockWorkbook)),
  addSheetFromJson: jest.fn(() => ({ columns: null, addRow: jest.fn() })),
  // Reading helpers (getExcelJS / worksheetToJson) are intentionally absent:
  // spreadsheet-merge no longer imports them.
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const excelUtils = require('@/lib/excel-utils')

// ── Read-path mock (parseXls / SheetJS Web Worker) ───────────────────────────

const mockParseXls = jest.fn()
jest.mock('@/lib/xls-parser', () => ({
  parseXls: (...args: unknown[]) => mockParseXls(...args),
}))

// ── CSV mock ──────────────────────────────────────────────────────────────────

jest.mock('papaparse', () => ({
  parse: jest.fn(() => ({
    data: [
      { Name: 'John', Email: 'john@test.com' },
      { Name: 'Jane', Email: 'jane@test.com' },
    ],
    errors: [],
    meta: { fields: ['Name', 'Email'] },
  })),
}))

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

function makeFile(name: string, type: string): File {
  return new File([''], name, { type })
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('spreadsheet-merge.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWriteBuffer.mockResolvedValue(new ArrayBuffer(100))
  })

  // ── canProcessClientSide ──────────────────────────────────────────────────

  describe('canProcessClientSide', () => {
    it('always returns true for free plan', () => {
      const file = new File(['content'], 'small.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 900 * 1024 })
      expect(canProcessClientSide([file], 'free')).toBe(true)
    })

    it('defaults to free plan when plan is omitted', () => {
      const file = new File(['content'], 'small.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })
      expect(canProcessClientSide([file])).toBe(true)
    })

    it('returns true for pro plan when total size is under 10MB', () => {
      const files = [
        new File(['content'], 'file1.csv', { type: 'text/csv' }),
        new File(['content'], 'file2.csv', { type: 'text/csv' }),
      ]
      files.forEach((f) => Object.defineProperty(f, 'size', { value: 2 * 1024 * 1024 }))
      expect(canProcessClientSide(files, 'pro')).toBe(true)
    })

    it('returns false for pro plan when total size exceeds 10MB', () => {
      const files = [
        new File(['content'], 'file1.csv', { type: 'text/csv' }),
        new File(['content'], 'file2.csv', { type: 'text/csv' }),
        new File(['content'], 'file3.csv', { type: 'text/csv' }),
      ]
      files.forEach((f) => Object.defineProperty(f, 'size', { value: 4 * 1024 * 1024 }))
      expect(canProcessClientSide(files, 'pro')).toBe(false)
    })

    it('returns true for pro plan at exactly 10MB total', () => {
      const file = new File(['content'], 'big.xlsx', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 })
      expect(canProcessClientSide([file], 'pro')).toBe(true)
    })

    it('returns true for empty file array', () => {
      expect(canProcessClientSide([], 'pro')).toBe(true)
    })
  })

  // ── mergeSpreadsheets — input validation ──────────────────────────────────

  describe('mergeSpreadsheets — validation', () => {
    it('throws when no files provided', async () => {
      await expect(
        mergeSpreadsheets({ files: [], selectedColumns: ['Name'], addWatermark: false }),
      ).rejects.toThrow('No files to merge')
    })

    it('throws when no columns selected', async () => {
      await expect(
        mergeSpreadsheets({
          files: [makeFile('test.csv', 'text/csv')],
          selectedColumns: [],
          addWatermark: false,
        }),
      ).rejects.toThrow('No columns selected')
    })
  })

  // ── CSV file processing ───────────────────────────────────────────────────

  describe('CSV file processing', () => {
    it('parses a CSV file and returns blob/filename/rowCount', async () => {
      const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 100 })

      const result = await mergeSpreadsheets({
        files: [file],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(result).toHaveProperty('blob')
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('rowCount')
      expect(result.filename).toMatch(/^tablix-unificado-\d{4}-\d{2}-\d{2}\.xlsx$/)
    })

    it('merges multiple CSV files and sums row counts', async () => {
      const file1 = new File(['Name,Email\nJohn,john@test.com'], 'test1.csv', { type: 'text/csv' })
      const file2 = new File(['Name,Email\nJane,jane@test.com'], 'test2.csv', { type: 'text/csv' })

      const result = await mergeSpreadsheets({
        files: [file1, file2],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(result.rowCount).toBe(4) // 2 rows per file from the default Papa mock
    })

    it('propagates CSV parse errors from PapaParse', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [],
        errors: [{ message: 'Malformed CSV: unexpected EOF' }],
        meta: { fields: [] },
      })

      await expect(
        mergeSpreadsheets({
          files: [makeFile('broken.csv', 'text/csv')],
          selectedColumns: ['Name'],
          addWatermark: false,
        }),
      ).rejects.toThrow('Malformed CSV: unexpected EOF')
    })
  })

  // ── Excel file processing (parseXls — SheetJS Web Worker) ────────────────

  describe('Excel file processing via parseXls', () => {
    it('parses .xlsx via parseXls and returns merged result', async () => {
      mockParseXls.mockResolvedValueOnce({
        columns: ['Name', 'Email'],
        rows: [
          { Name: 'John', Email: 'john@test.com' },
          { Name: 'Jane', Email: 'jane@test.com' },
        ],
        rowCount: 2,
      })

      const result = await mergeSpreadsheets({
        files: [
          makeFile(
            'test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ),
        ],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(result).toHaveProperty('blob')
      expect(result).toHaveProperty('filename')
      expect(result.rowCount).toBe(2)
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('parses .xls via parseXls and merges rows', async () => {
      mockParseXls.mockResolvedValueOnce({
        columns: ['Name', 'Email'],
        rows: [
          { Name: 'Alice', Email: 'alice@test.com' },
          { Name: 'Bob', Email: 'bob@test.com' },
        ],
        rowCount: 2,
      })

      const result = await mergeSpreadsheets({
        files: [makeFile('legacy.xls', 'application/vnd.ms-excel')],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(result.rowCount).toBe(2)
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('parses .xlsm via parseXls', async () => {
      mockParseXls.mockResolvedValueOnce({
        columns: ['ID'],
        rows: [{ ID: '1' }],
        rowCount: 1,
      })

      const result = await mergeSpreadsheets({
        files: [makeFile('macro.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12')],
        selectedColumns: ['ID'],
        addWatermark: false,
      })

      expect(result.rowCount).toBe(1)
      expect(mockParseXls).toHaveBeenCalledTimes(1)
    })

    it('propagates SpreadsheetParseError(NO_SHEETS) from parseXls', async () => {
      mockParseXls.mockRejectedValueOnce(
        new SpreadsheetParseError('NO_SHEETS', 'No sheets found in workbook'),
      )

      await expect(
        mergeSpreadsheets({
          files: [
            makeFile(
              'test.xlsx',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ),
          ],
          selectedColumns: ['Name'],
          addWatermark: false,
        }),
      ).rejects.toThrow('No sheets found in workbook')
    })

    it('propagates SpreadsheetParseError(CORRUPT_FILE) from parseXls', async () => {
      mockParseXls.mockRejectedValueOnce(
        new SpreadsheetParseError('CORRUPT_FILE', 'Could not read spreadsheet'),
      )

      const err = await mergeSpreadsheets({
        files: [
          makeFile(
            'test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ),
        ],
        selectedColumns: ['Name'],
        addWatermark: false,
      }).catch((e) => e)

      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('CORRUPT_FILE')
    })

    it('throws for unsupported file format (.pdf)', async () => {
      await expect(
        mergeSpreadsheets({
          files: [makeFile('document.pdf', 'application/pdf')],
          selectedColumns: ['Name'],
          addWatermark: false,
        }),
      ).rejects.toThrow('Unsupported file format')
    })
  })

  // ── Watermark functionality (Free plan) ───────────────────────────────────

  describe('watermark functionality', () => {
    it('passes watermark column to createWorkbookFromJson when addWatermark=true', async () => {
      const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      await mergeSpreadsheets({
        files: [file],
        selectedColumns: ['Name', 'Email'],
        addWatermark: true,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.any(Array),
        ['Name', 'Email', 'Gerado por Tablix'],
      )
    })

    it('calls addSheetFromJson for the "Sobre" sheet when addWatermark=true', async () => {
      const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      await mergeSpreadsheets({
        files: [file],
        selectedColumns: ['Name', 'Email'],
        addWatermark: true,
      })

      expect(excelUtils.addSheetFromJson).toHaveBeenCalledWith(
        mockWorkbook,
        'Sobre',
        expect.any(Array),
        ['Info', 'Valor'],
      )
    })

    it('does not add watermark column when addWatermark=false', async () => {
      const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      await mergeSpreadsheets({
        files: [file],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.any(Array),
        ['Name', 'Email'],
      )
      expect(excelUtils.addSheetFromJson).not.toHaveBeenCalled()
    })
  })

  // ── Column filtering ──────────────────────────────────────────────────────

  describe('column filtering', () => {
    it('passes only selected columns to createWorkbookFromJson', async () => {
      const file = new File(['Name,Email,Phone\nJohn,john@test.com,123'], 'test.csv', {
        type: 'text/csv',
      })

      await mergeSpreadsheets({
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.any(Array),
        ['Name'],
      )
    })

    it('handles columns that do not exist in some files (null-fills missing)', async () => {
      const result = await mergeSpreadsheets({
        files: [makeFile('test.csv', 'text/csv')],
        selectedColumns: ['Name', 'NonExistentColumn'],
        addWatermark: false,
      })

      expect(result).toHaveProperty('blob')
    })
  })

  // ── Output format ─────────────────────────────────────────────────────────

  describe('output format', () => {
    it('produces application/vnd.openxmlformats-officedocument.spreadsheetml.sheet MIME type', async () => {
      const result = await mergeSpreadsheets({
        files: [makeFile('test.csv', 'text/csv')],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(result.blob.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    })

    it('generates filename with current date', async () => {
      const result = await mergeSpreadsheets({
        files: [makeFile('test.csv', 'text/csv')],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      const today = new Date().toISOString().split('T')[0]
      expect(result.filename).toBe(`tablix-unificado-${today}.xlsx`)
    })

    it('calls writeBuffer for XLSX output generation', async () => {
      await mergeSpreadsheets({
        files: [makeFile('test.csv', 'text/csv')],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(mockWriteBuffer).toHaveBeenCalled()
    })
  })

  // ── Row limit enforcement ─────────────────────────────────────────────────

  describe('row limit enforcement', () => {
    it('rejects merge exceeding free plan row limit (501 > 500) with a typed ROW_LIMIT error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const err = await mergeSpreadsheets({
        files: [makeFile('big.csv', 'text/csv')],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'free',
      }).catch((e) => e)

      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('ROW_LIMIT')
      expect(err.params).toEqual({ total: '501', max: '500', plan: 'free' })
      expect(err.message).toContain('501 rows (max 500 for Free plan)')
    })

    it('accepts merge at exactly the free plan row limit (500)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 500 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const result = await mergeSpreadsheets({
        files: [makeFile('ok.csv', 'text/csv')],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'free',
      })

      expect(result.rowCount).toBe(500)
    })

    it('allows more rows with pro plan', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 1000 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const result = await mergeSpreadsheets({
        files: [makeFile('pro.csv', 'text/csv')],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'pro',
      })

      expect(result.rowCount).toBe(1000)
    })
  })

  // ── Formula injection protection ──────────────────────────────────────────

  describe('formula injection protection (sanitizeCellValue)', () => {
    it('prefixes cell values starting with = with a single quote', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Name: '=SUM(A1:A10)', Email: 'normal@test.com' }],
        errors: [],
        meta: { fields: ['Name', 'Email'] },
      })

      await mergeSpreadsheets({
        files: [makeFile('formula.csv', 'text/csv')],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([
          expect.objectContaining({ Name: "'=SUM(A1:A10)", Email: 'normal@test.com' }),
        ]),
        expect.anything(),
      )
    })

    it('prefixes all dangerous prefixes (+, -, @, tab, CR, LF)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [
          { Col: '+cmd|/C calc' },
          { Col: '-1+1' },
          { Col: '@SUM(A1)' },
          { Col: '\tcmd' },
          { Col: '\rcmd' },
          { Col: '\ncmd' },
        ],
        errors: [],
        meta: { fields: ['Col'] },
      })

      await mergeSpreadsheets({
        files: [makeFile('evil.csv', 'text/csv')],
        selectedColumns: ['Col'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([
          expect.objectContaining({ Col: "'+cmd|/C calc" }),
          expect.objectContaining({ Col: "'-1+1" }),
          expect.objectContaining({ Col: "'@SUM(A1)" }),
          expect.objectContaining({ Col: "'\tcmd" }),
          expect.objectContaining({ Col: "'\rcmd" }),
          expect.objectContaining({ Col: "'\ncmd" }),
        ]),
        expect.anything(),
      )
    })

    it('does not sanitize non-string values (number, boolean, null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Num: 42, Bool: true, Empty: null }],
        errors: [],
        meta: { fields: ['Num', 'Bool', 'Empty'] },
      })

      await mergeSpreadsheets({
        files: [makeFile('types.csv', 'text/csv')],
        selectedColumns: ['Num', 'Bool', 'Empty'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([expect.objectContaining({ Num: 42, Bool: true, Empty: null })]),
        expect.anything(),
      )
    })

    it('does not prefix strings without dangerous prefixes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Name: 'Normal text', Calc: 'A=B+C' }],
        errors: [],
        meta: { fields: ['Name', 'Calc'] },
      })

      await mergeSpreadsheets({
        files: [makeFile('safe.csv', 'text/csv')],
        selectedColumns: ['Name', 'Calc'],
        addWatermark: false,
      })

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([expect.objectContaining({ Name: 'Normal text', Calc: 'A=B+C' })]),
        expect.anything(),
      )
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('propagates arrayBuffer failure', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })
      file.arrayBuffer = () => Promise.reject(new Error('Read failed'))

      await expect(
        mergeSpreadsheets({
          files: [file],
          selectedColumns: ['Name'],
          addWatermark: false,
        }),
      ).rejects.toThrow('Read failed')
    })
  })

  // ── downloadBlob ──────────────────────────────────────────────────────────

  describe('downloadBlob', () => {
    let createObjectURLMock: jest.Mock
    let revokeObjectURLMock: jest.Mock
    let appendChildMock: jest.Mock
    let removeChildMock: jest.Mock

    beforeEach(() => {
      createObjectURLMock = jest.fn(() => 'blob:mock-url')
      revokeObjectURLMock = jest.fn()
      appendChildMock = jest.fn()
      removeChildMock = jest.fn()

      global.URL.createObjectURL = createObjectURLMock
      global.URL.revokeObjectURL = revokeObjectURLMock
      document.body.appendChild = appendChildMock
      document.body.removeChild = removeChildMock
    })

    it('creates a download link, triggers click, and revokes the URL', () => {
      const clickMock = jest.fn()
      jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickMock,
      } as unknown as HTMLAnchorElement)

      downloadBlob(new Blob(['test'], { type: 'text/plain' }), 'test-file.txt')

      expect(createObjectURLMock).toHaveBeenCalled()
      expect(appendChildMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
      expect(removeChildMock).toHaveBeenCalled()
    })

    it('sets the download attribute to the provided filename', () => {
      let capturedAnchor: { href: string; download: string; click: jest.Mock } | null = null
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        capturedAnchor = { href: '', download: '', click: jest.fn() }
        return capturedAnchor as unknown as HTMLAnchorElement
      })

      downloadBlob(new Blob(['test']), 'my-custom-file.xlsx')

      expect(capturedAnchor!.download).toBe('my-custom-file.xlsx')
    })
  })
})
