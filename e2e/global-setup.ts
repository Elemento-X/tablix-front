import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'files')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function writeCsv(filename: string, content: string) {
  fs.writeFileSync(path.join(FIXTURES_DIR, filename), content, 'utf-8')
}

async function writeXlsx(
  filename: string,
  data: Record<string, string | number>[],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')

  if (data.length > 0) {
    const headers = Object.keys(data[0])
    ws.columns = headers.map((h) => ({ header: h, key: h, width: 15 }))
    for (const row of data) {
      ws.addRow(row)
    }
  }

  await wb.xlsx.writeFile(path.join(FIXTURES_DIR, filename))
}

export default async function globalSetup() {
  ensureDir(FIXTURES_DIR)

  // valid-3col-5row.csv — 3 colunas, 5 linhas
  writeCsv(
    'valid-3col-5row.csv',
    [
      'ID,Nome,Email',
      '1,Ana,ana@test.com',
      '2,Bruno,bruno@test.com',
      '3,Carla,carla@test.com',
      '4,Diego,diego@test.com',
      '5,Eva,eva@test.com',
    ].join('\n'),
  )

  // valid-common-cols-a.csv — colunas ID, Nome, Email
  writeCsv(
    'valid-common-cols-a.csv',
    ['ID,Nome,Email', '1,Ana,ana@test.com', '2,Bruno,bruno@test.com'].join(
      '\n',
    ),
  )

  // valid-common-cols-b.csv — colunas ID, Nome, Telefone (ID e Nome em comum)
  writeCsv(
    'valid-common-cols-b.csv',
    ['ID,Nome,Telefone', '3,Carla,11999990000', '4,Diego,11888880000'].join(
      '\n',
    ),
  )

  // no-common-cols.csv — sem colunas em comum com os outros
  writeCsv(
    'no-common-cols.csv',
    ['Codigo,Produto,Preco', '1,Widget,9.99', '2,Gadget,19.99'].join('\n'),
  )

  // valid-3col-5row.xlsx — mesmo conteúdo do CSV em XLSX
  await writeXlsx('valid-3col-5row.xlsx', [
    { ID: 1, Nome: 'Ana', Email: 'ana@test.com' },
    { ID: 2, Nome: 'Bruno', Email: 'bruno@test.com' },
    { ID: 3, Nome: 'Carla', Email: 'carla@test.com' },
    { ID: 4, Nome: 'Diego', Email: 'diego@test.com' },
    { ID: 5, Nome: 'Eva', Email: 'eva@test.com' },
  ])

  // large-501-rows.csv — excede limite Free de 500 linhas
  const largeRows = ['ID,Nome,Email']
  for (let i = 1; i <= 501; i++) {
    largeRows.push(`${i},User${i},user${i}@test.com`)
  }
  writeCsv('large-501-rows.csv', largeRows.join('\n'))

  // large-1.1mb.csv — excede limite Free de 1MB
  const bigRows = ['ID,Nome,Email,Descricao']
  const padding = 'A'.repeat(200)
  for (let i = 1; bigRows.join('\n').length < 1.15 * 1024 * 1024; i++) {
    bigRows.push(`${i},User${i},user${i}@test.com,${padding}`)
  }
  writeCsv('large-1.1mb.csv', bigRows.join('\n'))
}
