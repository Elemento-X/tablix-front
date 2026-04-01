import { type Download } from '@playwright/test'
import * as XLSX from 'xlsx'

interface ParsedSheet {
  headers: string[]
  rowCount: number
  data: Record<string, unknown>[]
}

interface ParsedDownload {
  filename: string
  sheetNames: string[]
  sheets: Record<string, ParsedSheet>
}

/**
 * Parseia um XLSX baixado pelo Playwright e retorna estrutura navegável.
 */
export async function parseDownloadedXlsx(
  download: Download,
): Promise<ParsedDownload> {
  const filePath = await download.path()
  if (!filePath) throw new Error('Download path not available')

  const wb = XLSX.readFile(filePath)
  const sheets: Record<string, ParsedSheet> = {}

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
    const headers = data.length > 0 ? Object.keys(data[0]) : []

    sheets[name] = { headers, rowCount: data.length, data }
  }

  return {
    filename: download.suggestedFilename(),
    sheetNames: wb.SheetNames,
    sheets,
  }
}
