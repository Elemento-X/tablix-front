import { test, expect } from '../fixtures/test.fixture'
import { parseDownloadedXlsx } from '../helpers/download.helper'

test.describe('11.4 — Fluxos Avançados', () => {
  test.beforeEach(async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-advanced',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          unifications: { current: 1, max: 1, remaining: 0 },
        }),
      }),
    )
  })

  test('XLSX upload → full flow with download and content validation', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.xlsx')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(3)

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/tablix-unificado.*\.xlsx/)

    const parsed = await parseDownloadedXlsx(download)
    expect(parsed.sheetNames.length).toBeGreaterThan(0)
    const sheet = parsed.sheets[parsed.sheetNames[0]]
    expect(sheet.headers).toEqual(expect.arrayContaining(['ID', 'Nome', 'Email']))
    expect(sheet.rowCount).toBe(5)
  })

  test('merge 2 CSVs → download validates merged content', async ({ uploadPage, columnsPage }) => {
    // Mock preview para retornar colunas em comum (ID, Nome)
    await uploadPage.page.unroute('**/api/preview')
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome'],
          unificationToken: 'test-token-merge',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    const download = await downloadPromise

    const parsed = await parseDownloadedXlsx(download)
    const sheet = parsed.sheets[parsed.sheetNames[0]]
    expect(sheet.headers).toEqual(expect.arrayContaining(['ID', 'Nome']))
    // 2 + 2 = 4 linhas merged
    expect(sheet.rowCount).toBe(4)
  })

  test('formula injection in CSV is sanitized in output', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('formula-injection.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    const download = await downloadPromise

    const parsed = await parseDownloadedXlsx(download)
    const sheet = parsed.sheets[parsed.sheetNames[0]]

    // Valores devem ter sido sanitizados — nenhum deve começar com =, +, -, @, \t, \r
    for (const row of sheet.data) {
      for (const [, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          expect(value).not.toMatch(/^[=+\-@\t\r]/)
        }
      }
    }
  })

  test('3 files upload: all within Free limit', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    await uploadPage.uploadFixture('valid-third-file.csv')
    await expect(uploadPage.fileItems).toHaveCount(3)

    // Botão continuar habilitado
    await expect(uploadPage.continueButton).toBeEnabled()
  })

  test('XSS payload in column name is rendered as text, not HTML', async ({
    uploadPage,
    columnsPage,
  }) => {
    // Mock preview retornando colunas com payload XSS
    await uploadPage.page.unroute('**/api/preview')
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', '<img src=x onerror=alert(1)>', '<script>alert("xss")</script>'],
          unificationToken: 'test-token-xss',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    // Interceptar dialogs — se XSS executar, dialog vai disparar
    let dialogTriggered = false
    uploadPage.page.on('dialog', () => {
      dialogTriggered = true
    })

    await uploadPage.goto()
    await uploadPage.uploadFixture('xss-column-name.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Aguardar renderização completa antes de verificar XSS
    await uploadPage.page.waitForTimeout(1_000)

    // Nenhum dialog de alert deve ter sido disparado
    expect(dialogTriggered).toBe(false)

    // Os nomes de coluna devem ser renderizados como texto literal no DOM
    const pageContent = await uploadPage.page.content()
    expect(pageContent).not.toContain('<img src=x onerror')
    expect(pageContent).not.toContain('<script>alert')

    // Os botões de coluna devem existir com o texto literal
    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(3)
  })

  test('empty file (headers only) is accepted and shows columns', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('empty-headers-only.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(3)
  })
})
