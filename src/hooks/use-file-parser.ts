import { useState } from 'react'
import Papa from 'papaparse'
import { PLAN_LIMITS, type PlanType } from '@/lib/limits'
import { sanitizeString } from '@/lib/security/validation-schemas'
import {
  getExcelJS,
  worksheetToArray,
  worksheetToJsonWithHeaders,
} from '@/lib/excel-utils'
import { parseXls } from '@/lib/xls-parser'

export interface ParseResult {
  columns: string[]
  rowCount: number
  preview?: Record<string, string | number | boolean | null>[]
}

export interface ParseError {
  message: string
  code?: string
}

type PreviewRow = Record<string, string | number | boolean | null>

/** Sanitize all string values in preview rows to prevent XSS */
function sanitizePreviewRows(rows: PreviewRow[]): PreviewRow[] {
  return rows.map((row) => {
    const sanitized: PreviewRow = {}
    for (const [key, value] of Object.entries(row)) {
      sanitized[key] = typeof value === 'string' ? sanitizeString(value) : value
    }
    return sanitized
  })
}

const MAX_CLIENT_PARSE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Hook for parsing spreadsheet files (XLSX, CSV) in the browser
 * Automatically falls back to server-side parsing for files > 10MB
 */
export function useFileParser() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ParseError | null>(null)

  /**
   * Parse file in browser (client-side)
   * Supports .xlsx, .csv (and .xls via Web Worker in Phase 2.5)
   * Enforces row limits based on plan and sanitizes column names
   */
  const parseFileInBrowser = async (
    file: File,
    plan: PlanType = 'free',
  ): Promise<ParseResult> => {
    const limits = PLAN_LIMITS[plan]
    const buffer = await file.arrayBuffer()

    // CSV files
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(buffer)

      // First pass: count total rows to validate against limit
      const fullParse = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      })

      if (fullParse.errors.length > 0) {
        throw new Error(fullParse.errors[0].message)
      }

      const totalRows = fullParse.data.length
      if (totalRows > limits.maxRows) {
        throw new Error(
          `File exceeds row limit: ${totalRows} rows (max ${limits.maxRows} for ${limits.name} plan)`,
        )
      }

      // Sanitize column names to prevent XSS
      const rawColumns = fullParse.meta.fields || []
      const columns = rawColumns
        .map((col) => sanitizeString(col))
        .filter((col) => col.length > 0)

      return {
        columns,
        rowCount: totalRows,
        preview: sanitizePreviewRows(
          (fullParse.data as PreviewRow[]).slice(0, 5),
        ),
      }
    }

    const name = file.name.toLowerCase()

    // Legacy Excel (.xls) — SheetJS in Web Worker (CVE isolated)
    if (name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      const result = await parseXls(buffer)

      const columns = result.columns
        .map((col) => sanitizeString(col))
        .filter((col) => col.length > 0)

      if (columns.length === 0) {
        throw new Error('No columns found in first row')
      }

      if (result.rowCount > limits.maxRows) {
        throw new Error(
          `File exceeds row limit: ${result.rowCount} rows (max ${limits.maxRows} for ${limits.name} plan)`,
        )
      }

      const preview = sanitizePreviewRows(
        result.rows.slice(0, 5) as PreviewRow[],
      )

      return {
        columns,
        rowCount: result.rowCount,
        preview,
      }
    }

    // Modern Excel (.xlsx, .xlsm) — ExcelJS
    const ExcelJS = await getExcelJS()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]

    if (!worksheet) {
      throw new Error('No sheets found in workbook')
    }

    // Convert to 2D array to extract columns (first row = headers)
    const arrayData = worksheetToArray(worksheet)

    if (arrayData.length === 0) {
      throw new Error('Empty spreadsheet')
    }

    // First row = column names — sanitize to prevent XSS
    const columns = (arrayData[0] as (string | number | boolean | null)[])
      .filter((col) => col !== null && col !== undefined && col !== '')
      .map((col) => sanitizeString(String(col).trim()))
      .filter((col) => col.length > 0)

    if (columns.length === 0) {
      throw new Error('No columns found in first row')
    }

    // Get row count (excluding header) and enforce limit
    const rowCount = arrayData.length - 1
    if (rowCount > limits.maxRows) {
      throw new Error(
        `File exceeds row limit: ${rowCount} rows (max ${limits.maxRows} for ${limits.name} plan)`,
      )
    }

    // Get preview (first 5 rows) using custom headers starting from row 2
    const preview = sanitizePreviewRows(
      worksheetToJsonWithHeaders(worksheet, columns, 2).slice(
        0,
        5,
      ) as PreviewRow[],
    )

    return {
      columns,
      rowCount,
      preview,
    }
  }

  /**
   * Parse file on server (fallback for large files)
   */
  const parseFileInServer = async (file: File): Promise<ParseResult> => {
    const formData = new FormData()
    formData.append('files', file)

    const response = await fetch('/api/preview', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to parse file on server')
    }

    const data = await response.json()
    return {
      columns: data.columns || [],
      rowCount: data.rowCount || 0,
    }
  }

  /**
   * Smart parsing: client-side for small files, server-side for large files
   */
  const parseFile = async (
    file: File,
    plan: PlanType = 'free',
  ): Promise<ParseResult> => {
    setIsLoading(true)
    setError(null)

    try {
      let result: ParseResult

      if (file.size < MAX_CLIENT_PARSE_SIZE) {
        // Small file: parse in browser (instant, no server load)
        result = await parseFileInBrowser(file, plan)
      } else {
        // Large file: parse on server (avoid browser freeze)
        result = await parseFileInServer(file)
      }

      setIsLoading(false)
      return result
    } catch (err) {
      const parseError: ParseError = {
        message: err instanceof Error ? err.message : 'Unknown parsing error',
        code: 'PARSE_ERROR',
      }
      setError(parseError)
      setIsLoading(false)
      throw parseError
    }
  }

  return {
    parseFile,
    isLoading,
    error,
  }
}
