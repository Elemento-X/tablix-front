import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface MergeOptions {
  files: File[]
  selectedColumns: string[]
  addWatermark: boolean // For Free plan
}

export interface MergeResult {
  blob: Blob
  filename: string
  rowCount: number
}

interface RowData {
  [key: string]: string | number | boolean | null
}

/**
 * Parse a single file and extract data
 */
async function parseFileData(file: File): Promise<RowData[]> {
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
          })

          if (parsed.errors.length > 0) {
            throw new Error(parsed.errors[0].message)
          }

          resolve(parsed.data as RowData[])
          return
        }

        // Excel files
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

        if (!firstSheet) {
          throw new Error('No sheets found in workbook')
        }

        const jsonData = XLSX.utils.sheet_to_json<RowData>(firstSheet)
        resolve(jsonData)
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
 * Merge multiple spreadsheet files into one
 * - Extracts only selected columns
 * - Concatenates all rows
 * - Optionally adds watermark for Free plan
 */
export async function mergeSpreadsheets(options: MergeOptions): Promise<MergeResult> {
  const { files, selectedColumns, addWatermark } = options

  if (files.length === 0) {
    throw new Error('No files to merge')
  }

  if (selectedColumns.length === 0) {
    throw new Error('No columns selected')
  }

  // Parse all files and collect data
  const allRows: RowData[] = []

  for (const file of files) {
    const fileData = await parseFileData(file)

    // Filter to only selected columns and add to merged data
    for (const row of fileData) {
      const filteredRow: RowData = {}

      for (const col of selectedColumns) {
        // Handle column with value or empty
        filteredRow[col] = row[col] !== undefined ? row[col] : null
      }

      // Add watermark column for Free plan
      if (addWatermark) {
        filteredRow['Gerado por Tablix'] = 'tablix.com.br'
      }

      allRows.push(filteredRow)
    }
  }

  // Create workbook with merged data
  const workbook = XLSX.utils.book_new()

  // Create main data sheet
  const columnsWithWatermark = addWatermark
    ? [...selectedColumns, 'Gerado por Tablix']
    : selectedColumns

  const worksheet = XLSX.utils.json_to_sheet(allRows, {
    header: columnsWithWatermark,
  })

  // Set column widths
  const colWidths = columnsWithWatermark.map((col) => ({
    wch: Math.max(col.length, 15),
  }))
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Unificados')

  // Add "About" sheet for Free plan
  if (addWatermark) {
    const aboutData = [
      { Info: 'Arquivo gerado por', Valor: 'Tablix' },
      { Info: 'Website', Valor: 'https://tablix.com.br' },
      { Info: 'Plano', Valor: 'Free' },
      { Info: 'Data de geração', Valor: new Date().toLocaleDateString('pt-BR') },
      { Info: 'Total de linhas', Valor: allRows.length.toString() },
      { Info: 'Arquivos unificados', Valor: files.length.toString() },
      { Info: '', Valor: '' },
      { Info: 'Upgrade para Pro', Valor: 'Remova marca d\'água e aumente os limites!' },
    ]

    const aboutSheet = XLSX.utils.json_to_sheet(aboutData)
    aboutSheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(workbook, aboutSheet, 'Sobre')
  }

  // Generate file
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `tablix-unificado-${timestamp}.xlsx`

  return {
    blob,
    filename,
    rowCount: allRows.length,
  }
}

/**
 * Check if all files can be processed client-side (< 10MB each)
 */
export function canProcessClientSide(files: File[]): boolean {
  const MAX_CLIENT_SIZE = 10 * 1024 * 1024 // 10MB
  return files.every((file) => file.size < MAX_CLIENT_SIZE)
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
