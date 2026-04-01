import { test, expect } from '../fixtures/test.fixture'
import { expectAnyToast } from '../helpers/toast.helper'
import { parseDownloadedXlsx } from '../helpers/download.helper'

test.describe('7.2 — Free Flow Completo', () => {
  test.beforeEach(async ({ uploadPage }) => {
    // Mock /api/preview → retorna token
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-e2e-123',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    // Mock /api/unification/complete → sucesso
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

  test('single CSV: upload → parse → columns → download', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')

    // Arquivo aparece na lista
    await expect(uploadPage.fileItems.first()).toBeVisible()
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Continuar → parsing → colunas
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Colunas detectadas
    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(3)

    // Download
    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/tablix-unificado.*\.xlsx/)

    // Valida conteúdo do XLSX
    const parsed = await parseDownloadedXlsx(download)
    expect(parsed.sheetNames.length).toBeGreaterThan(0)
    const sheet = parsed.sheets[parsed.sheetNames[0]]
    expect(sheet.headers).toEqual(
      expect.arrayContaining(['ID', 'Nome', 'Email']),
    )
    expect(sheet.rowCount).toBe(5)

    // Volta pro step de upload
    await expect(uploadPage.dropzone).toBeVisible({ timeout: 5_000 })
  })

  test('two CSVs with common columns: merge flow', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Colunas em comum: ID e Nome (não Email nem Telefone)
    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(2)

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/tablix-unificado.*\.xlsx/)

    // Valida conteúdo do merge
    const parsed = await parseDownloadedXlsx(download)
    const sheet = parsed.sheets[parsed.sheetNames[0]]
    expect(sheet.headers).toEqual(expect.arrayContaining(['ID', 'Nome']))
    expect(sheet.rowCount).toBeGreaterThan(0)
  })

  test('XLSX file upload works', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.xlsx')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const columnCount = await columnsPage.columnButtons.count()
    expect(columnCount).toBe(3)
  })

  test('column toggle: select all, deselect all, individual', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Desmarcar todas
    await columnsPage.clickDeselectAll()
    const noneSelected = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(noneSelected).toHaveCount(0)

    // Process desabilitado sem colunas
    await expect(columnsPage.processButton).toBeDisabled()

    // Selecionar todas
    await columnsPage.clickSelectAll()
    const allSelected = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(allSelected).toHaveCount(3)

    // Toggle individual: desmarcar uma
    await columnsPage.toggleColumn('Email')
    const afterToggle = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(afterToggle).toHaveCount(2)
  })

  test('start over resets to upload step', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickStartOver()
    await expect(uploadPage.dropzone).toBeVisible({ timeout: 5_000 })
    await expect(uploadPage.fileItems).toHaveCount(0)
  })

  test('file removal works', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.removeFile(0)
    await expect(uploadPage.fileItems).toHaveCount(0)
    await expect(uploadPage.continueButton).toBeDisabled()
  })

  test('success toast appears after file added', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expectAnyToast(uploadPage.page, /sucesso|adicionado/i)
  })
})
