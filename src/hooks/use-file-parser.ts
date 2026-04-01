import { useState } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { PLAN_LIMITS, type PlanType } from '@/lib/limits'
import { sanitizeString } from '@/lib/security/validation-schemas'

export interface ParseResult {
  columns: string[]
  rowCount: number
  preview?: Record<string, string | number | boolean | null>[]
}

export interface ParseError {
  message: string
  code?: string
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
   * Supports .xlsx, .xls, .csv
   * Enforces row limits based on plan and sanitizes column names
   */
  const parseFileInBrowser = async (
    file: File,
    plan: PlanType = 'free',
  ): Promise<ParseResult> => {
    const limits = PLAN_LIMITS[plan]

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result

          if (!data) {
            throw new Error('Failed to read file')
          }

          // CSV files
          if (file.name.endsWith('.csv')) {
            const text = new TextDecoder().decode(data as ArrayBuffer)

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

            resolve({
              columns,
              rowCount: totalRows,
              preview: (
                fullParse.data as Record<
                  string,
                  string | number | boolean | null
                >[]
              ).slice(0, 5),
            })
            return
          }

          // Excel files (.xlsx, .xls)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

          if (!firstSheet) {
            throw new Error('No sheets found in workbook')
          }

          // Convert to JSON to extract columns
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

          if (jsonData.length === 0) {
            throw new Error('Empty spreadsheet')
          }

          // First row = column names — sanitize to prevent XSS
          const columns = (jsonData[0] as (string | number | boolean | null)[])
            .filter((col) => col !== null && col !== undefined && col !== '')
            .map((col) => sanitizeString(String(col).trim()))
            .filter((col) => col.length > 0)

          if (columns.length === 0) {
            throw new Error('No columns found in first row')
          }

          // Get row count (excluding header) and enforce limit
          const rowCount = jsonData.length - 1
          if (rowCount > limits.maxRows) {
            throw new Error(
              `File exceeds row limit: ${rowCount} rows (max ${limits.maxRows} for ${limits.name} plan)`,
            )
          }

          // Get preview (first 5 rows)
          const preview = XLSX.utils
            .sheet_to_json<Record<string, string | number | boolean | null>>(
              firstSheet,
              {
                header: columns,
                range: 1, // Skip header row
              },
            )
            .slice(0, 5)

          resolve({
            columns,
            rowCount,
            preview,
          })
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to parse file'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsArrayBuffer(file)
    })
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
