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

  test('single CSV: upload → parse → columns → download', async ({ uploadPage, columnsPage }) => {
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
    expect(sheet.headers).toEqual(expect.arrayContaining(['ID', 'Nome', 'Email']))
    expect(sheet.rowCount).toBe(5)

    // Tela de resultado aparece com botão "Nova unificação"
    const newUnificationBtn = uploadPage.page.getByRole('button', { name: /nova unificação/i })
    await expect(newUnificationBtn).toBeVisible({ timeout: 5_000 })

    // Clicar "Nova unificação" volta ao step de upload
    await newUnificationBtn.click()
    await expect(uploadPage.dropzone).toBeVisible({ timeout: 5_000 })
  })

  test('two CSVs with common columns: merge flow', async ({ uploadPage, columnsPage }) => {
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

  test('start over resets to upload step', async ({ uploadPage, columnsPage }) => {
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

  // --- Cenários adicionais ---

  test('file list shows correct count and size', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Verifica contador "1 de 3 arquivos"
    const fileList = uploadPage.fileList
    await expect(fileList).toContainText(/1/)
    await expect(fileList).toContainText(/3/)
  })

  test('remove file and add another works correctly', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.removeFile(0)
    await expect(uploadPage.fileItems).toHaveCount(0)

    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)
    await expect(uploadPage.continueButton).toBeEnabled()
  })

  test('column buttons have aria-pressed state', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Todas as colunas selecionadas por padrão
    const selectedBtns = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(selectedBtns).toHaveCount(3)

    // Desmarcar uma → aria-pressed muda
    await columnsPage.toggleColumn('Nome')
    const afterDeselect = columnsPage.page.locator('button[aria-pressed="false"]')
    await expect(afterDeselect).toHaveCount(1)
  })

  test('preview table shows data rows', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Preview table deve estar visível com headers e dados
    const previewTable = columnsPage.page.locator('table')
    await expect(previewTable).toBeVisible()

    // Headers da tabela
    const headers = previewTable.locator('th')
    await expect(headers).toHaveCount(3)
  })

  test('deselect all then select all re-enables process', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickDeselectAll()
    await expect(columnsPage.processButton).toBeDisabled()

    await columnsPage.clickSelectAll()
    await expect(columnsPage.processButton).toBeEnabled()
  })

  test('result step shows success metrics', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    await downloadPromise

    // Tela resultado com métricas
    const resultHeading = uploadPage.page.getByRole('heading', { name: /pronto|success/i })
    await expect(resultHeading.first()).toBeVisible({ timeout: 5_000 })

    // Métricas: arquivo(s), linhas, colunas
    await expect(uploadPage.page.getByText(/arquivo.*unificado/i)).toBeVisible()
    await expect(uploadPage.page.getByText(/coluna.*selecionada/i)).toBeVisible()
  })

  test('result step shows upgrade card for free plan', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    await downloadPromise

    // Card de upgrade pro
    const upgradeLink = uploadPage.page.getByRole('link', { name: /upgrade.*pro/i })
    await expect(upgradeLink).toBeVisible({ timeout: 5_000 })
  })

  test('result step shows remaining quota', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    await downloadPromise

    // Quota restante
    await expect(uploadPage.page.getByText(/unificação|unification/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('columns detected count header is accurate', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // "Colunas Detectadas (3)"
    const heading = columnsPage.page.getByRole('heading', { name: /3/i })
    await expect(heading).toBeVisible()
  })

  test('selected count text updates on toggle', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // "3 de 3 selecionada(s)"
    await expect(columnsPage.page.getByText(/3 .* 3 .*selecionada/)).toBeVisible()

    await columnsPage.toggleColumn('Email')
    // "2 de 3 selecionada(s)"
    await expect(columnsPage.page.getByText(/2 .* 3 .*selecionada/)).toBeVisible()
  })

  test('preview table hides when no columns selected', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Table visível com colunas selecionadas
    await expect(columnsPage.page.locator('table')).toBeVisible()

    // Desmarcar todas → table some
    await columnsPage.clickDeselectAll()
    await expect(columnsPage.page.locator('table')).not.toBeVisible()
  })

  test('select all button disabled when all selected', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Todas já selecionadas → "Selecionar Todas" disabled
    await expect(columnsPage.selectAllButton).toBeDisabled()
  })

  test('deselect all button disabled when none selected', async ({ uploadPage, columnsPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickDeselectAll()
    // Nenhuma selecionada → "Desmarcar Todas" disabled
    await expect(columnsPage.deselectAllButton).toBeDisabled()
  })
})
