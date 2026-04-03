import Papa from 'papaparse'
import { PLAN_LIMITS, type PlanType } from '@/lib/limits'
import {
  getExcelJS,
  worksheetToJson,
  createWorkbookFromJson,
  addSheetFromJson,
  type RowData,
} from '@/lib/excel-utils'
import { parseXls } from '@/lib/xls-parser'

/** Labels for the exported spreadsheet (i18n-friendly) */
export interface MergeLabels {
  sheetName: string
  watermarkColumn: string
  watermarkValue: string
  aboutSheetName: string
  aboutHeaderInfo: string
  aboutHeaderValue: string
  aboutGeneratedBy: string
  aboutWebsite: string
  aboutPlan: string
  aboutGeneratedAt: string
  aboutTotalRows: string
  aboutFilesUnified: string
  aboutUpgradeToPro: string
  aboutUpgradeMessage: string
}

const DEFAULT_LABELS: MergeLabels = {
  sheetName: 'Dados Unificados',
  watermarkColumn: 'Gerado por Tablix',
  watermarkValue: 'tablix.me',
  aboutSheetName: 'Sobre',
  aboutHeaderInfo: 'Info',
  aboutHeaderValue: 'Valor',
  aboutGeneratedBy: 'Arquivo gerado por',
  aboutWebsite: 'Website',
  aboutPlan: 'Plano',
  aboutGeneratedAt: 'Data de geração',
  aboutTotalRows: 'Total de linhas',
  aboutFilesUnified: 'Arquivos unificados',
  aboutUpgradeToPro: 'Upgrade para Pro',
  aboutUpgradeMessage: "Remova marca d'água e aumente os limites!",
}

export interface MergeOptions {
  files: File[]
  selectedColumns: string[]
  addWatermark: boolean // For Free plan
  plan?: PlanType
  labels?: Partial<MergeLabels>
}

export interface MergeResult {
  blob: Blob
  filename: string
  rowCount: number
}

/**
 * Sanitize cell value to prevent formula injection in spreadsheets.
 * Cells starting with =, +, -, @, tab, or carriage return can trigger
 * formula execution when opened in Excel/Google Sheets (CSV injection / DDE attacks).
 */
function sanitizeCellValue(
  value: string | number | boolean | null,
): string | number | boolean | null {
  if (typeof value !== 'string') return value

  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r', '\n']
  if (dangerousPrefixes.some((prefix) => value.startsWith(prefix))) {
    return `'${value}`
  }

  return value
}

/**
 * Parse a single file and extract data.
 * CSV: PapaParse (sync, string-based).
 * XLSX: ExcelJS (async, buffer-based).
 * XLS (legacy BIFF): SheetJS in Web Worker (CVE-2023-30533 isolated).
 */
async function parseFileData(file: File): Promise<RowData[]> {
  const buffer = await file.arrayBuffer()
  const name = file.name.toLowerCase()

  // CSV files
  if (name.endsWith('.csv')) {
    const text = new TextDecoder().decode(buffer)
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0].message)
    }

    return parsed.data as RowData[]
  }

  // Legacy Excel (.xls) — SheetJS in Web Worker
  if (name.endsWith('.xls') && !name.endsWith('.xlsx')) {
    const result = await parseXls(buffer)
    return result.rows as RowData[]
  }

  // Modern Excel (.xlsx, .xlsm, .xlsb) — ExcelJS
  const ExcelJS = await getExcelJS()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    throw new Error('No sheets found in workbook')
  }

  return worksheetToJson(worksheet)
}

/**
 * Merge multiple spreadsheet files into one
 * - Extracts only selected columns
 * - Concatenates all rows
 * - Optionally adds watermark for Free plan
 */
export async function mergeSpreadsheets(
  options: MergeOptions,
): Promise<MergeResult> {
  const { files, selectedColumns, addWatermark, plan = 'free' } = options
  const l = { ...DEFAULT_LABELS, ...options.labels }
  const limits = PLAN_LIMITS[plan]

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

    // Filter to only selected columns, sanitize values, and add to merged data
    for (const row of fileData) {
      // Enforce row limit based on plan
      if (allRows.length >= limits.maxRows) {
        throw new Error(
          `Row limit exceeded: max ${limits.maxRows} rows for ${limits.name} plan`,
        )
      }

      const filteredRow: RowData = {}

      for (const col of selectedColumns) {
        // Sanitize cell value to prevent formula injection (CSV injection / DDE)
        const rawValue = row[col] !== undefined ? row[col] : null
        filteredRow[col] = sanitizeCellValue(rawValue)
      }

      // Add watermark column for Free plan
      if (addWatermark) {
        filteredRow[l.watermarkColumn] = l.watermarkValue
      }

      allRows.push(filteredRow)
    }
  }

  // Create workbook with merged data
  const columnsWithWatermark = addWatermark
    ? [...selectedColumns, l.watermarkColumn]
    : selectedColumns

  const workbook = await createWorkbookFromJson(
    l.sheetName,
    allRows,
    columnsWithWatermark,
  )

  // Add "About" sheet for Free plan
  if (addWatermark) {
    const aboutData: RowData[] = [
      {
        [l.aboutHeaderInfo]: l.aboutGeneratedBy,
        [l.aboutHeaderValue]: 'Tablix',
      },
      {
        [l.aboutHeaderInfo]: l.aboutWebsite,
        [l.aboutHeaderValue]: 'https://tablix.me',
      },
      { [l.aboutHeaderInfo]: l.aboutPlan, [l.aboutHeaderValue]: 'Free' },
      {
        [l.aboutHeaderInfo]: l.aboutGeneratedAt,
        [l.aboutHeaderValue]: new Date().toLocaleDateString(),
      },
      {
        [l.aboutHeaderInfo]: l.aboutTotalRows,
        [l.aboutHeaderValue]: allRows.length.toString(),
      },
      {
        [l.aboutHeaderInfo]: l.aboutFilesUnified,
        [l.aboutHeaderValue]: files.length.toString(),
      },
      { [l.aboutHeaderInfo]: '', [l.aboutHeaderValue]: '' },
      {
        [l.aboutHeaderInfo]: l.aboutUpgradeToPro,
        [l.aboutHeaderValue]: l.aboutUpgradeMessage,
      },
    ]

    addSheetFromJson(workbook, l.aboutSheetName, aboutData, [
      l.aboutHeaderInfo,
      l.aboutHeaderValue,
    ])
  }

  // Generate file
  const excelBuffer = await workbook.xlsx.writeBuffer()

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
 * Determine if files can be processed client-side based on plan limits.
 * Free plan: always client-side (plan limits guarantee small files).
 * Pro/Enterprise: client-side if total size < 10MB, server-side otherwise.
 */
export function canProcessClientSide(
  files: File[],
  plan: PlanType = 'free',
): boolean {
  const limits = PLAN_LIMITS[plan]

  // Free plan: total size is capped at maxTotalSize (1MB), always client-side
  if (plan === 'free') return true

  // Pro/Enterprise: use 10MB threshold for browser performance
  const MAX_CLIENT_TOTAL = Math.min(limits.maxTotalSize, 10 * 1024 * 1024)
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  return totalSize <= MAX_CLIENT_TOTAL
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
