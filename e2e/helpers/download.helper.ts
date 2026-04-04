import { type Download } from '@playwright/test'
import ExcelJS from 'exceljs'

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
export async function parseDownloadedXlsx(download: Download): Promise<ParsedDownload> {
  const filePath = await download.path()
  if (!filePath) throw new Error('Download path not available')

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  const sheets: Record<string, ParsedSheet> = {}
  const sheetNames: string[] = []

  for (const ws of wb.worksheets) {
    sheetNames.push(ws.name)
    const headers: string[] = []
    const data: Record<string, unknown>[] = []

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.value != null ? String(cell.value) : ''
        })
        return
      }

      const obj: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        if (!header) return
        const cell = row.getCell(index + 1)
        obj[header] = cell.value
      })
      data.push(obj)
    })

    sheets[ws.name] = { headers, rowCount: data.length, data }
  }

  return {
    filename: download.suggestedFilename(),
    sheetNames,
    sheets,
  }
}
