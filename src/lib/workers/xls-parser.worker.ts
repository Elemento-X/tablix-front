/**
 * Web Worker for parsing legacy .xls (BIFF) files using SheetJS.
 *
 * SheetJS (xlsx@0.18.5) has CVE-2023-30533 (prototype pollution).
 * Running it inside a Web Worker isolates the prototype pollution from
 * the main thread — any injected properties stay confined to the Worker's
 * global scope and are destroyed when the Worker terminates.
 *
 * Protocol:
 *   Main → Worker: { buffer: ArrayBuffer }
 *   Worker → Main: { columns: string[], rows: Record<string, unknown>[], rowCount: number }
 *   Worker → Main (error): { error: string }
 */

import * as XLSX from 'xlsx'

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
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const { buffer } = event.data

    // Validate input structure
    if (!buffer || !(buffer instanceof ArrayBuffer)) {
      const errorMsg: WorkerError = {
        error: 'Invalid input: expected ArrayBuffer',
      }
      self.postMessage(errorMsg)
      return
    }

    const data = new Uint8Array(buffer)

    const workbook = XLSX.read(data, { type: 'array' })

    if (!workbook.SheetNames.length) {
      const errorMsg: WorkerError = { error: 'No sheets found in workbook' }
      self.postMessage(errorMsg)
      return
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

    // Extract headers from first row
    const arrayData = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
    }) as unknown[][]

    if (arrayData.length === 0) {
      const errorMsg: WorkerError = { error: 'Empty spreadsheet' }
      self.postMessage(errorMsg)
      return
    }

    const columns = (arrayData[0] as (string | number | boolean | null)[])
      .filter((col) => col !== null && col !== undefined && col !== '')
      .map((col) => String(col).trim())
      .filter((col) => col.length > 0)

    // Extract rows as objects
    const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[]

    const result: WorkerSuccess = {
      columns,
      rows,
      rowCount: rows.length,
    }

    self.postMessage(result)
  } catch (_err) {
    const errorMsg: WorkerError = {
      error: 'Failed to parse XLS file',
    }
    self.postMessage(errorMsg)
  }
}
