import {
  worksheetToJson,
  worksheetToArray,
  worksheetToJsonWithHeaders,
  createWorkbookFromJson,
  addSheetFromJson,
  getExcelJS,
  type RowData,
} from '@/lib/excel-utils'

// Mock exceljs
const mockAddWorksheet = jest.fn()
const mockWorkbook = {
  addWorksheet: mockAddWorksheet,
}

jest.mock('exceljs', () => ({
  Workbook: jest.fn(() => mockWorkbook),
}))

/**
 * Helper to create a mock ExcelJS worksheet.
 * Simulates eachRow and getCell behavior.
 */
function createMockWorksheet(
  rows: (string | number | boolean | null)[][],
): import('exceljs').Worksheet {
  const worksheet = {
    eachRow: jest.fn(
      (
        optionsOrCallback:
          | { includeEmpty?: boolean }
          | ((row: unknown, rowNumber: number) => void),
        maybeCallback?: (row: unknown, rowNumber: number) => void,
      ) => {
        const callback =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : maybeCallback!
        rows.forEach((rowData, index) => {
          const rowNumber = index + 1
          const mockRow = {
            eachCell: jest.fn(
              (
                cellOptOrCb:
                  | { includeEmpty?: boolean }
                  | ((cell: unknown, colNumber: number) => void),
                maybeCellCb?: (cell: unknown, colNumber: number) => void,
              ) => {
                const cellCb =
                  typeof cellOptOrCb === 'function' ? cellOptOrCb : maybeCellCb!
                rowData.forEach((value, colIndex) => {
                  cellCb({ value }, colIndex + 1)
                })
              },
            ),
            getCell: jest.fn((colNumber: number) => ({
              value: rowData[colNumber - 1] ?? null,
            })),
          }
          callback(mockRow, rowNumber)
        })
      },
    ),
  } as unknown as import('exceljs').Worksheet
  return worksheet
}

describe('excel-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getExcelJS', () => {
    it('should lazy-load the exceljs module', async () => {
      const ExcelJS = await getExcelJS()
      expect(ExcelJS).toBeDefined()
      expect(ExcelJS.Workbook).toBeDefined()
    })
  })

  describe('worksheetToJson', () => {
    it('should convert worksheet to array of objects using first row as headers', () => {
      const ws = createMockWorksheet([
        ['Name', 'Email', 'Age'],
        ['John', 'john@test.com', 30],
        ['Jane', 'jane@test.com', 25],
      ])

      const result = worksheetToJson(ws)

      expect(result).toEqual([
        { Name: 'John', Email: 'john@test.com', Age: 30 },
        { Name: 'Jane', Email: 'jane@test.com', Age: 25 },
      ])
    })

    it('should return empty array for worksheet with only headers', () => {
      const ws = createMockWorksheet([['Name', 'Email']])

      const result = worksheetToJson(ws)

      expect(result).toEqual([])
    })

    it('should return empty array for empty worksheet', () => {
      const ws = createMockWorksheet([])

      const result = worksheetToJson(ws)

      expect(result).toEqual([])
    })

    it('should skip columns with empty header names', () => {
      const ws = createMockWorksheet([
        ['Name', '', 'Email'],
        ['John', 'ignored', 'john@test.com'],
      ])

      const result = worksheetToJson(ws)

      expect(result).toEqual([{ Name: 'John', Email: 'john@test.com' }])
    })

    it('should handle null cell values in headers', () => {
      const ws = createMockWorksheet([
        ['Name', null, 'Email'],
        ['John', null, 'john@test.com'],
      ])

      const result = worksheetToJson(ws)

      // null header becomes empty string '' which is skipped
      expect(result).toEqual([{ Name: 'John', Email: 'john@test.com' }])
    })

    it('should handle boolean and numeric values', () => {
      const ws = createMockWorksheet([
        ['Active', 'Score'],
        [true, 99],
        [false, 0],
      ])

      const result = worksheetToJson(ws)

      expect(result).toEqual([
        { Active: true, Score: 99 },
        { Active: false, Score: 0 },
      ])
    })
  })

  describe('worksheetToArray', () => {
    it('should convert worksheet to 2D array including headers', () => {
      const ws = createMockWorksheet([
        ['Name', 'Email'],
        ['John', 'john@test.com'],
      ])

      const result = worksheetToArray(ws)

      expect(result).toEqual([
        ['Name', 'Email'],
        ['John', 'john@test.com'],
      ])
    })

    it('should return empty array for empty worksheet', () => {
      const ws = createMockWorksheet([])

      const result = worksheetToArray(ws)

      expect(result).toEqual([])
    })

    it('should handle null values', () => {
      const ws = createMockWorksheet([
        ['A', null, 'C'],
        [1, null, 3],
      ])

      const result = worksheetToArray(ws)

      expect(result).toEqual([
        ['A', null, 'C'],
        [1, null, 3],
      ])
    })

    it('should handle single row worksheet', () => {
      const ws = createMockWorksheet([['Only', 'Headers']])

      const result = worksheetToArray(ws)

      expect(result).toEqual([['Only', 'Headers']])
    })

    it('should pad null for non-contiguous columns (sparse rows)', () => {
      // ExcelJS with includeEmpty=true can skip column indices, leaving gaps.
      // When colNumber jumps from 1 to 3, the while loop inserts null for column 2.
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            callback(
              {
                eachCell: jest.fn(
                  (
                    _opts: unknown,
                    cb: (cell: unknown, colNumber: number) => void,
                  ) => {
                    cb({ value: 'A' }, 1) // column 1
                    // column 2 is skipped (sparse)
                    cb({ value: 'C' }, 3) // column 3 — triggers while loop
                  },
                ),
              },
              1,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToArray(worksheet)

      // Column 2 should be null (padded by the while loop)
      expect(result).toEqual([['A', null, 'C']])
    })
  })

  describe('worksheetToJsonWithHeaders', () => {
    it('should convert worksheet using custom headers starting from given row', () => {
      const ws = createMockWorksheet([
        ['OriginalHeader1', 'OriginalHeader2'],
        ['John', 'john@test.com'],
        ['Jane', 'jane@test.com'],
      ])

      const result = worksheetToJsonWithHeaders(ws, ['Name', 'Email'], 2)

      expect(result).toEqual([
        { Name: 'John', Email: 'john@test.com' },
        { Name: 'Jane', Email: 'jane@test.com' },
      ])
    })

    it('should default to startRow 2', () => {
      const ws = createMockWorksheet([['Header'], ['Row1'], ['Row2']])

      const result = worksheetToJsonWithHeaders(ws, ['Col'])

      expect(result).toEqual([{ Col: 'Row1' }, { Col: 'Row2' }])
    })

    it('should skip rows before startRow', () => {
      const ws = createMockWorksheet([['Header'], ['Skip'], ['Include']])

      const result = worksheetToJsonWithHeaders(ws, ['Col'], 3)

      expect(result).toEqual([{ Col: 'Include' }])
    })

    it('should skip empty header names', () => {
      const ws = createMockWorksheet([
        ['H1', 'H2', 'H3'],
        ['a', 'b', 'c'],
      ])

      const result = worksheetToJsonWithHeaders(ws, ['Keep', '', 'Also'], 2)

      expect(result).toEqual([{ Keep: 'a', Also: 'c' }])
    })

    it('should return empty array when startRow exceeds row count', () => {
      const ws = createMockWorksheet([['Header']])

      const result = worksheetToJsonWithHeaders(ws, ['Col'], 5)

      expect(result).toEqual([])
    })
  })

  describe('createWorkbookFromJson', () => {
    it('should create a workbook with a populated worksheet', async () => {
      const mockSheet = {
        columns: null as unknown,
        addRow: jest.fn(),
      }
      mockAddWorksheet.mockReturnValue(mockSheet)

      const data: RowData[] = [
        { Name: 'John', Age: 30 },
        { Name: 'Jane', Age: 25 },
      ]

      const result = await createWorkbookFromJson('TestSheet', data, [
        'Name',
        'Age',
      ])

      expect(result).toBe(mockWorkbook)
      expect(mockAddWorksheet).toHaveBeenCalledWith('TestSheet')
      expect(mockSheet.addRow).toHaveBeenCalledTimes(2)
      expect(mockSheet.addRow).toHaveBeenCalledWith({
        Name: 'John',
        Age: 30,
      })
      expect(mockSheet.addRow).toHaveBeenCalledWith({
        Name: 'Jane',
        Age: 25,
      })
    })

    it('should set column widths based on header length', async () => {
      const mockSheet = {
        columns: null as unknown,
        addRow: jest.fn(),
      }
      mockAddWorksheet.mockReturnValue(mockSheet)

      await createWorkbookFromJson(
        'Sheet',
        [],
        ['ShortName', 'VeryLongHeaderName'],
      )

      expect(mockSheet.columns).toEqual([
        { header: 'ShortName', key: 'ShortName', width: 15 },
        { header: 'VeryLongHeaderName', key: 'VeryLongHeaderName', width: 18 },
      ])
    })

    it('should handle empty data array', async () => {
      const mockSheet = {
        columns: null as unknown,
        addRow: jest.fn(),
      }
      mockAddWorksheet.mockReturnValue(mockSheet)

      await createWorkbookFromJson('Empty', [], ['Col'])

      expect(mockSheet.addRow).not.toHaveBeenCalled()
    })

    it('should use null for undefined values in row data', async () => {
      const mockSheet = {
        columns: null as unknown,
        addRow: jest.fn(),
      }
      mockAddWorksheet.mockReturnValue(mockSheet)

      const data: RowData[] = [{ Name: 'John' }] // Age is missing

      await createWorkbookFromJson('Sheet', data, ['Name', 'Age'])

      expect(mockSheet.addRow).toHaveBeenCalledWith({
        Name: 'John',
        Age: null,
      })
    })
  })

  describe('addSheetFromJson', () => {
    it('should add a worksheet to an existing workbook', () => {
      const mockSheet = {
        columns: null as unknown,
        addRow: jest.fn(),
      }
      const wb = {
        addWorksheet: jest.fn(() => mockSheet),
      } as unknown as import('exceljs').Workbook

      const data: RowData[] = [{ Info: 'Test', Valor: 'Value' }]

      const result = addSheetFromJson(wb, 'About', data, ['Info', 'Valor'])

      expect(wb.addWorksheet).toHaveBeenCalledWith('About')
      expect(mockSheet.addRow).toHaveBeenCalledWith({
        Info: 'Test',
        Valor: 'Value',
      })
      expect(result).toBe(mockSheet)
    })
  })

  describe('normalizeCellValue (via worksheetToJson)', () => {
    it('should return string values as-is', () => {
      const ws = createMockWorksheet([['Col'], ['hello']])
      const result = worksheetToJson(ws)
      expect(result[0].Col).toBe('hello')
    })

    it('should return number values as-is', () => {
      const ws = createMockWorksheet([['Col'], [42]])
      const result = worksheetToJson(ws)
      expect(result[0].Col).toBe(42)
    })

    it('should return boolean values as-is', () => {
      const ws = createMockWorksheet([['Col'], [true]])
      const result = worksheetToJson(ws)
      expect(result[0].Col).toBe(true)
    })

    it('should return null for null values', () => {
      const ws = createMockWorksheet([['Col'], [null]])
      const result = worksheetToJson(ws)
      expect(result[0].Col).toBeNull()
    })

    it('should convert Date to ISO string', () => {
      // Create a worksheet where the cell value is a Date object
      const date = new Date('2026-01-15T12:00:00.000Z')
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            // Row 1: header
            callback(
              {
                eachCell: jest.fn(
                  (cb: (cell: unknown, colNumber: number) => void) => {
                    cb({ value: 'DateCol' }, 1)
                  },
                ),
                getCell: jest.fn(() => ({ value: 'DateCol' })),
              },
              1,
            )
            // Row 2: data with Date value
            callback(
              {
                eachCell: jest.fn(),
                getCell: jest.fn(() => ({ value: date })),
              },
              2,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToJson(worksheet)
      expect(result[0].DateCol).toBe('2026-01-15T12:00:00.000Z')
    })

    it('should flatten RichText objects to plain string', () => {
      const richTextValue = {
        richText: [{ text: 'Hello ' }, { text: 'World' }],
      }
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            callback(
              {
                eachCell: jest.fn(
                  (cb: (cell: unknown, colNumber: number) => void) => {
                    cb({ value: 'Col' }, 1)
                  },
                ),
                getCell: jest.fn(() => ({ value: 'Col' })),
              },
              1,
            )
            callback(
              {
                eachCell: jest.fn(),
                getCell: jest.fn(() => ({ value: richTextValue })),
              },
              2,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToJson(worksheet)
      expect(result[0].Col).toBe('Hello World')
    })

    it('should extract result from formula objects', () => {
      const formulaValue = { result: 42, formula: 'SUM(A1:A10)' }
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            callback(
              {
                eachCell: jest.fn(
                  (cb: (cell: unknown, colNumber: number) => void) => {
                    cb({ value: 'Col' }, 1)
                  },
                ),
                getCell: jest.fn(() => ({ value: 'Col' })),
              },
              1,
            )
            callback(
              {
                eachCell: jest.fn(),
                getCell: jest.fn(() => ({ value: formulaValue })),
              },
              2,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToJson(worksheet)
      expect(result[0].Col).toBe(42)
    })

    it('should return null for error objects', () => {
      const errorValue = { error: { message: '#REF!' } }
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            callback(
              {
                eachCell: jest.fn(
                  (cb: (cell: unknown, colNumber: number) => void) => {
                    cb({ value: 'Col' }, 1)
                  },
                ),
                getCell: jest.fn(() => ({ value: 'Col' })),
              },
              1,
            )
            callback(
              {
                eachCell: jest.fn(),
                getCell: jest.fn(() => ({ value: errorValue })),
              },
              2,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToJson(worksheet)
      expect(result[0].Col).toBeNull()
    })

    it('should stringify unknown object types as fallback', () => {
      const unknownValue = { foo: 'bar' }
      const worksheet = {
        eachRow: jest.fn(
          (callback: (row: unknown, rowNumber: number) => void) => {
            callback(
              {
                eachCell: jest.fn(
                  (cb: (cell: unknown, colNumber: number) => void) => {
                    cb({ value: 'Col' }, 1)
                  },
                ),
                getCell: jest.fn(() => ({ value: 'Col' })),
              },
              1,
            )
            callback(
              {
                eachCell: jest.fn(),
                getCell: jest.fn(() => ({ value: unknownValue })),
              },
              2,
            )
          },
        ),
      } as unknown as import('exceljs').Worksheet

      const result = worksheetToJson(worksheet)
      expect(result[0].Col).toBe('[object Object]')
    })
  })
})
