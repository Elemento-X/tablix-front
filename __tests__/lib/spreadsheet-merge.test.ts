/**
 * @jest-environment jsdom
 */
import {
  mergeSpreadsheets,
  canProcessClientSide,
  downloadBlob,
  type MergeOptions,
} from '@/lib/spreadsheet-merge'

// Mock excel-utils module
const mockWorksheetToJson = jest.fn()
const mockWriteBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)))
const mockAddWorksheet = jest.fn(() => ({
  columns: null,
  addRow: jest.fn(),
}))
const mockWorkbook = {
  addWorksheet: mockAddWorksheet,
  worksheets: [{ name: 'Sheet1' }],
  xlsx: {
    load: jest.fn(),
    writeBuffer: mockWriteBuffer,
  },
}
const mockExcelJS = {
  Workbook: jest.fn(() => mockWorkbook),
}

jest.mock('@/lib/excel-utils', () => ({
  getExcelJS: jest.fn(() => Promise.resolve(mockExcelJS)),
  worksheetToJson: (...args: unknown[]) => mockWorksheetToJson(...args),
  createWorkbookFromJson: jest.fn(() => Promise.resolve(mockWorkbook)),
  addSheetFromJson: jest.fn(() => ({
    columns: null,
    addRow: jest.fn(),
  })),
}))

// Mock xls-parser (Web Worker not available in jsdom)
jest.mock('@/lib/xls-parser', () => ({
  parseXls: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const excelUtils = require('@/lib/excel-utils')

// Mock papaparse
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

/**
 * Polyfill arrayBuffer for jsdom's File/Blob (not available in older jsdom).
 * Must set on both prototypes to ensure File instances inherit it.
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

describe('spreadsheet-merge.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mock for worksheetToJson
    mockWorksheetToJson.mockReturnValue([
      { Name: 'John', Email: 'john@test.com' },
      { Name: 'Jane', Email: 'jane@test.com' },
    ])
    mockWorkbook.worksheets = [{ name: 'Sheet1' }]
    mockWriteBuffer.mockResolvedValue(new ArrayBuffer(100))
  })

  describe('canProcessClientSide', () => {
    it('should always return true for free plan (size capped by plan limits)', () => {
      const file = new File(['content'], 'small.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 900 * 1024 }) // 900KB (within 1MB free limit)

      expect(canProcessClientSide([file], 'free')).toBe(true)
    })

    it('should default to free plan when no plan specified', () => {
      const file = new File(['content'], 'small.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      expect(canProcessClientSide([file])).toBe(true)
    })

    it('should return true for pro plan when total size is under 10MB', () => {
      const files = [
        new File(['content'], 'file1.csv', { type: 'text/csv' }),
        new File(['content'], 'file2.csv', { type: 'text/csv' }),
      ]
      files.forEach((f) =>
        Object.defineProperty(f, 'size', { value: 2 * 1024 * 1024 }),
      ) // 2MB each = 4MB total

      expect(canProcessClientSide(files, 'pro')).toBe(true)
    })

    it('should return false for pro plan when total size exceeds 10MB', () => {
      const files = [
        new File(['content'], 'file1.csv', { type: 'text/csv' }),
        new File(['content'], 'file2.csv', { type: 'text/csv' }),
        new File(['content'], 'file3.csv', { type: 'text/csv' }),
      ]
      files.forEach((f) =>
        Object.defineProperty(f, 'size', { value: 4 * 1024 * 1024 }),
      ) // 4MB each = 12MB total

      expect(canProcessClientSide(files, 'pro')).toBe(false)
    })

    it('should return true for pro plan at exactly 10MB total', () => {
      const file = new File(['content'], 'big.xlsx', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 })

      expect(canProcessClientSide([file], 'pro')).toBe(true)
    })

    it('should return true for empty file array', () => {
      expect(canProcessClientSide([], 'pro')).toBe(true)
    })
  })

  describe('mergeSpreadsheets', () => {
    describe('validation', () => {
      it('should throw error when no files provided', async () => {
        const options: MergeOptions = {
          files: [],
          selectedColumns: ['Name'],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow(
          'No files to merge',
        )
      })

      it('should throw error when no columns selected', async () => {
        const file = new File(['content'], 'test.csv', { type: 'text/csv' })
        const options: MergeOptions = {
          files: [file],
          selectedColumns: [],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow(
          'No columns selected',
        )
      })
    })

    describe('CSV file processing', () => {
      it('should parse CSV file and return merged result', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })
        Object.defineProperty(file, 'size', { value: 100 })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result).toHaveProperty('blob')
        expect(result).toHaveProperty('filename')
        expect(result).toHaveProperty('rowCount')
        expect(result.filename).toMatch(
          /^tablix-unificado-\d{4}-\d{2}-\d{2}\.xlsx$/,
        )
      })

      it('should merge multiple CSV files', async () => {
        const file1 = new File(
          ['Name,Email\nJohn,john@test.com'],
          'test1.csv',
          {
            type: 'text/csv',
          },
        )
        const file2 = new File(
          ['Name,Email\nJane,jane@test.com'],
          'test2.csv',
          {
            type: 'text/csv',
          },
        )

        const options: MergeOptions = {
          files: [file1, file2],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result).toHaveProperty('blob')
        expect(result.rowCount).toBe(4) // 2 rows per file from mock
      })
    })

    describe('Excel file processing', () => {
      it('should parse Excel file via ExcelJS and return merged result', async () => {
        mockWorksheetToJson.mockReturnValue([
          { Name: 'John', Email: 'john@test.com' },
          { Name: 'Jane', Email: 'jane@test.com' },
        ])

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result).toHaveProperty('blob')
        expect(result).toHaveProperty('filename')
        expect(excelUtils.getExcelJS).toHaveBeenCalled()
        expect(mockWorksheetToJson).toHaveBeenCalled()
      })

      it('should throw error when no sheets found in workbook', async () => {
        // Empty worksheets array
        mockWorkbook.worksheets = []

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name'],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow(
          'No sheets found in workbook',
        )
      })
    })

    describe('XLS file processing (legacy)', () => {
      it('should parse XLS file via parseXls worker and merge rows', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const xlsParser = require('@/lib/xls-parser')
        ;(xlsParser.parseXls as jest.Mock).mockResolvedValueOnce({
          columns: ['Name', 'Email'],
          rows: [
            { Name: 'Alice', Email: 'alice@test.com' },
            { Name: 'Bob', Email: 'bob@test.com' },
          ],
          rowCount: 2,
        })

        const file = new File([''], 'legacy.xls', {
          type: 'application/vnd.ms-excel',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result).toHaveProperty('blob')
        expect(result.rowCount).toBe(2)
        expect(xlsParser.parseXls).toHaveBeenCalled()
      })
    })

    describe('CSV parse error in parseFileData', () => {
      it('should propagate CSV parse errors from PapaParse', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Papa = require('papaparse')
        ;(Papa.parse as jest.Mock).mockReturnValueOnce({
          data: [],
          errors: [{ message: 'Malformed CSV: unexpected EOF' }],
          meta: { fields: [] },
        })

        const file = new File(['bad,csv'], 'broken.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name'],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow(
          'Malformed CSV: unexpected EOF',
        )
      })
    })

    describe('watermark functionality (Free plan)', () => {
      it('should add watermark column and About sheet when addWatermark is true', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: true,
        }

        await mergeSpreadsheets(options)

        // Verify createWorkbookFromJson was called with watermark column
        expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
          'Dados Unificados',
          expect.any(Array),
          ['Name', 'Email', 'Gerado por Tablix'],
        )

        // Verify addSheetFromJson was called for the "Sobre" sheet
        expect(excelUtils.addSheetFromJson).toHaveBeenCalledWith(
          mockWorkbook,
          'Sobre',
          expect.any(Array),
          ['Info', 'Valor'],
        )
      })

      it('should not add watermark when addWatermark is false', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        await mergeSpreadsheets(options)

        // Verify createWorkbookFromJson called without watermark column
        expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
          'Dados Unificados',
          expect.any(Array),
          ['Name', 'Email'],
        )

        // Verify addSheetFromJson was NOT called
        expect(excelUtils.addSheetFromJson).not.toHaveBeenCalled()
      })
    })

    describe('column filtering', () => {
      it('should only include selected columns in output', async () => {
        const file = new File(
          ['Name,Email,Phone\nJohn,john@test.com,123'],
          'test.csv',
          {
            type: 'text/csv',
          },
        )

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name'], // Only select Name column
          addWatermark: false,
        }

        await mergeSpreadsheets(options)

        // Verify createWorkbookFromJson was called with only Name header
        expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
          'Dados Unificados',
          expect.any(Array),
          ['Name'],
        )
      })

      it('should handle columns that do not exist in some files', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'NonExistentColumn'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        // Should still complete successfully
        expect(result).toHaveProperty('blob')
      })
    })

    describe('output format', () => {
      it('should generate XLSX format output', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result.blob.type).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
      })

      it('should generate filename with current date', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        const today = new Date().toISOString().split('T')[0]
        expect(result.filename).toBe(`tablix-unificado-${today}.xlsx`)
      })

      it('should use ExcelJS writeBuffer for output generation', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
          type: 'text/csv',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        await mergeSpreadsheets(options)

        expect(mockWriteBuffer).toHaveBeenCalled()
      })
    })
  })

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

      // Mock window.URL
      global.URL.createObjectURL = createObjectURLMock
      global.URL.revokeObjectURL = revokeObjectURLMock

      // Mock document.body
      document.body.appendChild = appendChildMock
      document.body.removeChild = removeChildMock
    })

    it('should create download link and trigger click', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const filename = 'test-file.txt'

      const clickMock = jest.fn()
      jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickMock,
      } as unknown as HTMLAnchorElement)

      downloadBlob(blob, filename)

      expect(createObjectURLMock).toHaveBeenCalledWith(blob)
      expect(appendChildMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
      expect(removeChildMock).toHaveBeenCalled()
    })

    it('should set correct download filename', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const filename = 'my-custom-file.xlsx'

      let capturedAnchor: {
        href: string
        download: string
        click: jest.Mock
      } | null = null
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        capturedAnchor = {
          href: '',
          download: '',
          click: jest.fn(),
        }
        return capturedAnchor as unknown as HTMLAnchorElement
      })

      downloadBlob(blob, filename)

      expect(capturedAnchor!.download).toBe(filename)
    })
  })

  describe('error handling', () => {
    it('should handle arrayBuffer failure gracefully', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })
      // Override arrayBuffer to simulate failure
      file.arrayBuffer = () => Promise.reject(new Error('Read failed'))

      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
      }

      await expect(mergeSpreadsheets(options)).rejects.toThrow('Read failed')
    })
  })

  describe('formula injection protection', () => {
    it('should prefix cell values starting with = with single quote', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Name: '=SUM(A1:A10)', Email: 'normal@test.com' }],
        errors: [],
        meta: { fields: ['Name', 'Email'] },
      })

      const file = new File(['content'], 'formula.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name', 'Email'],
        addWatermark: false,
      }

      await mergeSpreadsheets(options)

      // Check that createWorkbookFromJson was called with sanitized data
      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([
          expect.objectContaining({
            Name: "'=SUM(A1:A10)",
            Email: 'normal@test.com',
          }),
        ]),
        expect.anything(),
      )
    })

    it('should prefix cell values starting with +, -, @, tab, CR, LF', async () => {
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

      const file = new File(['content'], 'evil.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Col'],
        addWatermark: false,
      }

      await mergeSpreadsheets(options)

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

    it('should not sanitize non-string values (numbers, booleans, null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Num: 42, Bool: true, Empty: null }],
        errors: [],
        meta: { fields: ['Num', 'Bool', 'Empty'] },
      })

      const file = new File(['content'], 'types.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Num', 'Bool', 'Empty'],
        addWatermark: false,
      }

      await mergeSpreadsheets(options)

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([
          expect.objectContaining({ Num: 42, Bool: true, Empty: null }),
        ]),
        expect.anything(),
      )
    })

    it('should not sanitize strings without dangerous prefixes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: [{ Name: 'Normal text', Calc: 'A=B+C' }],
        errors: [],
        meta: { fields: ['Name', 'Calc'] },
      })

      const file = new File(['content'], 'safe.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name', 'Calc'],
        addWatermark: false,
      }

      await mergeSpreadsheets(options)

      expect(excelUtils.createWorkbookFromJson).toHaveBeenCalledWith(
        'Dados Unificados',
        expect.arrayContaining([
          expect.objectContaining({ Name: 'Normal text', Calc: 'A=B+C' }),
        ]),
        expect.anything(),
      )
    })
  })

  describe('row limit enforcement', () => {
    it('should reject merge exceeding free plan row limit (500)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 501 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File(['content'], 'big.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'free',
      }

      await expect(mergeSpreadsheets(options)).rejects.toThrow(
        'Row limit exceeded: max 500 rows for Free plan',
      )
    })

    it('should accept merge within free plan row limit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 500 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File(['content'], 'ok.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'free',
      }

      const result = await mergeSpreadsheets(options)
      expect(result.rowCount).toBe(500)
    })

    it('should allow more rows with pro plan', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Papa = require('papaparse')
      const rows = Array.from({ length: 1000 }, (_, i) => ({ Name: `Row${i}` }))
      ;(Papa.parse as jest.Mock).mockReturnValueOnce({
        data: rows,
        errors: [],
        meta: { fields: ['Name'] },
      })

      const file = new File(['content'], 'pro.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
        plan: 'pro',
      }

      const result = await mergeSpreadsheets(options)
      expect(result.rowCount).toBe(1000)
    })
  })
})
