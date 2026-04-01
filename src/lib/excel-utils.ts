import type { Worksheet, Workbook } from 'exceljs'

type CellValue = string | number | boolean | null

export interface RowData {
  [key: string]: CellValue
}

/**
 * Lazy-load ExcelJS to keep it out of the initial bundle.
 * ExcelJS (~1MB) is only needed when the user uploads or downloads files.
 */
export async function getExcelJS(): Promise<typeof import('exceljs')> {
  return import('exceljs')
}

/**
 * Convert an ExcelJS worksheet to an array of objects (like XLSX.utils.sheet_to_json).
 * First row is treated as headers. Subsequent rows become objects keyed by header.
 */
export function worksheetToJson(worksheet: Worksheet): RowData[] {
  const rows: RowData[] = []
  const headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value != null ? String(cell.value) : ''
      })
      return
    }

    const obj: RowData = {}
    headers.forEach((header, index) => {
      if (!header) return
      const cell = row.getCell(index + 1)
      obj[header] = normalizeCellValue(cell.value)
    })
    rows.push(obj)
  })

  return rows
}

/**
 * Convert an ExcelJS worksheet to a 2D array (like XLSX.utils.sheet_to_json({ header: 1 })).
 * Each row is an array of raw cell values, including the header row.
 */
export function worksheetToArray(worksheet: Worksheet): CellValue[][] {
  const result: CellValue[][] = []

  worksheet.eachRow((row) => {
    const rowValues: CellValue[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (rowValues.length < colNumber - 1) {
        rowValues.push(null)
      }
      rowValues.push(normalizeCellValue(cell.value))
    })
    result.push(rowValues)
  })

  return result
}

/**
 * Convert an ExcelJS worksheet to objects using custom headers, starting from a given row.
 * Equivalent to XLSX.utils.sheet_to_json(sheet, { header: columns, range: startRow }).
 */
export function worksheetToJsonWithHeaders(
  worksheet: Worksheet,
  headers: string[],
  startRow: number = 2,
): RowData[] {
  const rows: RowData[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < startRow) return

    const obj: RowData = {}
    headers.forEach((header, index) => {
      if (!header) return
      const cell = row.getCell(index + 1)
      obj[header] = normalizeCellValue(cell.value)
    })
    rows.push(obj)
  })

  return rows
}

/**
 * Create a new ExcelJS workbook and populate a worksheet from JSON data.
 * Caller must provide the ExcelJS module (from getExcelJS()) to avoid sync require.
 */
export async function createWorkbookFromJson(
  sheetName: string,
  data: RowData[],
  headers: string[],
): Promise<Workbook> {
  const ExcelJS = await getExcelJS()
  const workbook = new ExcelJS.Workbook()
  addSheetFromJson(workbook, sheetName, data, headers)
  return workbook
}

/**
 * Add a worksheet to an existing workbook from JSON data.
 */
export function addSheetFromJson(
  workbook: Workbook,
  sheetName: string,
  data: RowData[],
  headers: string[],
): Worksheet {
  const worksheet = workbook.addWorksheet(sheetName)

  worksheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(h.length, 15),
  }))

  for (const row of data) {
    const rowValues: Record<string, CellValue> = {}
    for (const header of headers) {
      rowValues[header] = row[header] !== undefined ? row[header] : null
    }
    worksheet.addRow(rowValues)
  }

  return worksheet
}

/**
 * Normalize ExcelJS cell values to simple primitives.
 * ExcelJS can return complex objects (RichText, formulas, errors, dates).
 * We flatten everything to string | number | boolean | null.
 */
function normalizeCellValue(value: unknown): CellValue {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()

  // ExcelJS RichText: { richText: [{ text: '...' }, ...] }
  if (typeof value === 'object' && 'richText' in value) {
    const rt = value as { richText: Array<{ text: string }> }
    return rt.richText.map((segment) => segment.text).join('')
  }

  // ExcelJS formula result: { result: ..., formula: '...' }
  if (typeof value === 'object' && 'result' in value) {
    const formula = value as { result: unknown }
    return normalizeCellValue(formula.result)
  }

  // ExcelJS error: { error: { message: '...' } }
  if (typeof value === 'object' && 'error' in value) {
    return null
  }

  // Fallback: stringify
  return String(value)
}
