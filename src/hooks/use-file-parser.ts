import { useState } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParseResult {
  columns: string[]
  rowCount: number
  preview?: any[] // First 5 rows for preview
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
   */
  const parseFileInBrowser = async (file: File): Promise<ParseResult> => {
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
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              preview: 5, // Only parse first 5 rows for preview
            })

            if (parsed.errors.length > 0) {
              throw new Error(parsed.errors[0].message)
            }

            const columns = parsed.meta.fields || []
            const rowCount = parsed.data.length

            resolve({
              columns,
              rowCount,
              preview: parsed.data,
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

          // First row = column names
          const columns = (jsonData[0] as any[])
            .filter(col => col !== null && col !== undefined && col !== '')
            .map(col => String(col).trim())

          if (columns.length === 0) {
            throw new Error('No columns found in first row')
          }

          // Get row count (excluding header)
          const rowCount = jsonData.length - 1

          // Get preview (first 5 rows)
          const preview = XLSX.utils.sheet_to_json(firstSheet, {
            header: columns,
            range: 1, // Skip header row
          }).slice(0, 5)

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
  const parseFile = async (file: File): Promise<ParseResult> => {
    setIsLoading(true)
    setError(null)

    try {
      let result: ParseResult

      if (file.size < MAX_CLIENT_PARSE_SIZE) {
        // Small file: parse in browser (instant, no server load)
        console.log(`[Parser] Client-side parsing (${(file.size / 1024).toFixed(0)}KB)`)
        result = await parseFileInBrowser(file)
      } else {
        // Large file: parse on server (avoid browser freeze)
        console.log(`[Parser] Server-side parsing (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
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
