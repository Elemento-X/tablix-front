/**
 * Web Worker for parsing spreadsheet files (.xls, .xlsx, .xlsm) using SheetJS.
 *
 * SheetJS reads the whole family and is far more tolerant than ExcelJS, which
 * throws on valid files whose internal [Content_Types].xml differs from Excel's
 * own output. ExcelJS is kept for writing only.
 *
 * SheetJS (xlsx@0.18.5) has CVE-2023-30533 (prototype pollution). Running it
 * inside a Web Worker isolates the prototype pollution from the main thread —
 * any injected properties stay confined to the Worker's global scope and are
 * destroyed when the Worker terminates.
 *
 * Protocol:
 *   Main → Worker: { buffer: ArrayBuffer }
 *   Worker → Main: { columns: string[], rows: Record<string, unknown>[], rowCount: number }
 *   Worker → Main (error): { error: string, code: ParseErrorCode }
 */

import * as XLSX from 'xlsx'

/** Machine-readable error codes — consumers map these to localized messages. */
type ParseErrorCode = 'INVALID_INPUT' | 'CORRUPT_FILE' | 'NO_SHEETS' | 'EMPTY_SHEET' | 'NO_COLUMNS'

interface WorkerRequest {
  buffer: ArrayBuffer
}

interface WorkerSuccess {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

interface WorkerError {
  error: string
  code: ParseErrorCode
}

/** Post a typed error back to the main thread. */
function postError(error: string, code: ParseErrorCode): void {
  self.postMessage({ error, code } satisfies WorkerError)
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { buffer } = event.data

  // Validate input structure
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    postError('Invalid input: expected ArrayBuffer', 'INVALID_INPUT')
    return
  }

  // Reading the workbook is the operation that fails on corrupt / unreadable
  // files — isolate it so we can report CORRUPT_FILE precisely.
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  } catch {
    postError('Could not read the spreadsheet file', 'CORRUPT_FILE')
    return
  }

  if (!workbook.SheetNames.length) {
    postError('No sheets found in workbook', 'NO_SHEETS')
    return
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

  // Extract headers from first row
  const arrayData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]

  if (arrayData.length === 0) {
    postError('Empty spreadsheet', 'EMPTY_SHEET')
    return
  }

  const columns = (arrayData[0] as (string | number | boolean | null)[])
    .filter((col) => col !== null && col !== undefined && col !== '')
    .map((col) => String(col).trim())
    .filter((col) => col.length > 0)

  if (columns.length === 0) {
    postError('No columns found in first row', 'NO_COLUMNS')
    return
  }

  // Extract rows as objects
  const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[]

  const result: WorkerSuccess = {
    columns,
    rows,
    rowCount: rows.length,
  }

  self.postMessage(result)
}
