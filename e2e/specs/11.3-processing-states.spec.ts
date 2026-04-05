import { test, expect } from '../fixtures/test.fixture'

test.describe('11.3 — Estados de Processamento', () => {
  test.beforeEach(async ({ uploadPage }) => {
    // Mock /api/preview → sucesso
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-processing',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )
  })

  test('process button shows spinner during processing', async ({ uploadPage, columnsPage }) => {
    // Mock /api/unification/complete com delay para capturar estado de loading
    await uploadPage.page.route('**/api/unification/complete', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          unifications: { current: 1, max: 1, remaining: 0 },
        }),
      })
    })

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    // Clicar processar (não esperar download ainda)
    await columnsPage.clickProcess()

    // Botão deve mostrar estado de loading (spinner/texto de phase)
    const processBtn = columnsPage.processButton
    await expect(processBtn).toBeDisabled({ timeout: 2_000 })

    // Texto de phase deve aparecer no botão ou próximo
    const phaseText = uploadPage.page.getByText(
      /reservando|unificando|gerando|download|processando/i,
    )
    await expect(phaseText.first()).toBeVisible({ timeout: 3_000 })
  })

  test('process button is disabled during processing', async ({ uploadPage, columnsPage }) => {
    await uploadPage.page.route('**/api/unification/complete', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          unifications: { current: 1, max: 1, remaining: 0 },
        }),
      })
    })

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()

    // Botão process desabilitado
    await expect(columnsPage.processButton).toBeDisabled()
  })

  test('start-over button is disabled during processing', async ({ uploadPage, columnsPage }) => {
    await uploadPage.page.route('**/api/unification/complete', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          unifications: { current: 1, max: 1, remaining: 0 },
        }),
      })
    })

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()

    // Botão start-over desabilitado durante processamento
    await expect(columnsPage.startOverButton).toBeDisabled()
  })

  test('column toggle buttons are disabled during processing', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.page.route('**/api/unification/complete', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          unifications: { current: 1, max: 1, remaining: 0 },
        }),
      })
    })

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()

    // Todos os botões de coluna desabilitados
    const columnBtns = columnsPage.columnButtons
    const count = await columnBtns.count()
    for (let i = 0; i < count; i++) {
      await expect(columnBtns.nth(i)).toBeDisabled()
    }
  })

  test('processing completes and transitions to result step', async ({
    uploadPage,
    columnsPage,
  }) => {
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

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    const downloadPromise = uploadPage.page.waitForEvent('download')
    await columnsPage.clickProcess()
    await downloadPromise

    // Transição para tela de resultado
    const resultHeading = uploadPage.page.getByRole('heading', { name: /pronto/i })
    await expect(resultHeading).toBeVisible({ timeout: 5_000 })
  })
})
