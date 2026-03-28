/**
 * @jest-environment jsdom
 */
import {
  mergeSpreadsheets,
  canProcessClientSide,
  downloadBlob,
  type MergeOptions,
} from '@/lib/spreadsheet-merge'
import * as XLSX from 'xlsx'

// Mock XLSX library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    book_new: jest.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
    sheet_to_json: jest.fn(),
  },
  write: jest.fn(() => new ArrayBuffer(100)),
}))

// Mock papaparse
jest.mock('papaparse', () => ({
  parse: jest.fn((text, options) => ({
    data: [
      { Name: 'John', Email: 'john@test.com' },
      { Name: 'Jane', Email: 'jane@test.com' },
    ],
    errors: [],
    meta: { fields: ['Name', 'Email'] },
  })),
}))

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

describe('spreadsheet-merge.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canProcessClientSide', () => {
    it('should return true for files under 10MB', () => {
      const smallFile = new File(['content'], 'small.csv', { type: 'text/csv' })
      Object.defineProperty(smallFile, 'size', { value: 5 * 1024 * 1024 }) // 5MB

      expect(canProcessClientSide([smallFile])).toBe(true)
    })

    it('should return true for multiple files all under 10MB', () => {
      const files = [
        new File(['content'], 'file1.csv', { type: 'text/csv' }),
        new File(['content'], 'file2.csv', { type: 'text/csv' }),
      ]
      files.forEach((f) => Object.defineProperty(f, 'size', { value: 1 * 1024 * 1024 }))

      expect(canProcessClientSide(files)).toBe(true)
    })

    it('should return false for files at or over 10MB', () => {
      const largeFile = new File(['content'], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }) // Exactly 10MB

      expect(canProcessClientSide([largeFile])).toBe(false)
    })

    it('should return false if any file is over 10MB', () => {
      const smallFile = new File(['content'], 'small.csv', { type: 'text/csv' })
      const largeFile = new File(['content'], 'large.csv', { type: 'text/csv' })
      Object.defineProperty(smallFile, 'size', { value: 1 * 1024 * 1024 })
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 })

      expect(canProcessClientSide([smallFile, largeFile])).toBe(false)
    })

    it('should return true for empty file array', () => {
      expect(canProcessClientSide([])).toBe(true)
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

        await expect(mergeSpreadsheets(options)).rejects.toThrow('No files to merge')
      })

      it('should throw error when no columns selected', async () => {
        const file = new File(['content'], 'test.csv', { type: 'text/csv' })
        const options: MergeOptions = {
          files: [file],
          selectedColumns: [],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow('No columns selected')
      })
    })

    describe('CSV file processing', () => {
      it('should parse CSV file and return merged result', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })
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
        expect(result.filename).toMatch(/^tablix-unificado-\d{4}-\d{2}-\d{2}\.xlsx$/)
      })

      it('should merge multiple CSV files', async () => {
        const file1 = new File(['Name,Email\nJohn,john@test.com'], 'test1.csv', { type: 'text/csv' })
        const file2 = new File(['Name,Email\nJane,jane@test.com'], 'test2.csv', { type: 'text/csv' })

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
      it('should parse Excel file and return merged result', async () => {
        // Mock XLSX.read for Excel files
        const mockWorkbook = {
          SheetNames: ['Sheet1'],
          Sheets: {
            Sheet1: {},
          },
        }
        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)
        ;(XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
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
      })

      it('should throw error when no sheets found in workbook', async () => {
        const mockWorkbook = {
          SheetNames: [],
          Sheets: {},
        }
        ;(XLSX.read as jest.Mock).mockReturnValue(mockWorkbook)

        const file = new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name'],
          addWatermark: false,
        }

        await expect(mergeSpreadsheets(options)).rejects.toThrow('No sheets found in workbook')
      })
    })

    describe('watermark functionality (Free plan)', () => {
      it('should add watermark column when addWatermark is true', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: true,
        }

        const result = await mergeSpreadsheets(options)

        // Verify book_append_sheet was called twice (data sheet + About sheet)
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2)

        // Verify the "Sobre" (About) sheet was added
        const calls = (XLSX.utils.book_append_sheet as jest.Mock).mock.calls
        expect(calls[1][2]).toBe('Sobre')
      })

      it('should not add watermark when addWatermark is false', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        await mergeSpreadsheets(options)

        // Verify book_append_sheet was called only once (data sheet only)
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(1)

        // Verify the sheet is named "Dados Unificados"
        const calls = (XLSX.utils.book_append_sheet as jest.Mock).mock.calls
        expect(calls[0][2]).toBe('Dados Unificados')
      })
    })

    describe('column filtering', () => {
      it('should only include selected columns in output', async () => {
        const file = new File(['Name,Email,Phone\nJohn,john@test.com,123'], 'test.csv', { type: 'text/csv' })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name'], // Only select Name column
          addWatermark: false,
        }

        await mergeSpreadsheets(options)

        // Verify json_to_sheet was called with correct header
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            header: ['Name'],
          })
        )
      })

      it('should handle columns that do not exist in some files', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

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
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        expect(result.blob.type).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      })

      it('should generate filename with current date', async () => {
        const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

        const options: MergeOptions = {
          files: [file],
          selectedColumns: ['Name', 'Email'],
          addWatermark: false,
        }

        const result = await mergeSpreadsheets(options)

        const today = new Date().toISOString().split('T')[0]
        expect(result.filename).toBe(`tablix-unificado-${today}.xlsx`)
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

      let capturedAnchor: any = null
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        capturedAnchor = {
          href: '',
          download: '',
          click: jest.fn(),
        }
        return capturedAnchor as unknown as HTMLAnchorElement
      })

      downloadBlob(blob, filename)

      expect(capturedAnchor.download).toBe(filename)
    })
  })

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Create a custom FileReader that fails
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

      const file = new File(['content'], 'test.csv', { type: 'text/csv' })
      const options: MergeOptions = {
        files: [file],
        selectedColumns: ['Name'],
        addWatermark: false,
      }

      await expect(mergeSpreadsheets(options)).rejects.toThrow('Failed to read file')

      // Restore original mock
      // @ts-ignore
      global.FileReader = MockFileReader
    })
  })
})
