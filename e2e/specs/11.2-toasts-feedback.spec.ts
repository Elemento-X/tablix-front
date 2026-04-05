import { test, expect } from '../fixtures/test.fixture'
import { expectAnyToast } from '../helpers/toast.helper'

test.describe('11.2 — Toasts de Feedback', () => {
  test.beforeEach(async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-toasts',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )
  })

  test('toast success appears after valid file upload', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')

    await expectAnyToast(uploadPage.page, /sucesso|adicionado|added/i)
  })

  test('toast success shows correct message for multiple files', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Aguardar primeiro toast desaparecer
    const firstToast = uploadPage.page.locator('[data-sonner-toast]')
    await expect(firstToast.first()).toBeVisible({ timeout: 5_000 })
    await expect(firstToast).not.toBeVisible({ timeout: 8_000 })

    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    // Toast de sucesso individual para segundo arquivo
    await expectAnyToast(uploadPage.page, /sucesso|adicionado|added/i)
  })

  test('file input has correct accept filter for CSV and XLSX only', async ({ uploadPage }) => {
    await uploadPage.goto()

    // Input type=file tem accept restrito
    const accept = await uploadPage.fileInput.getAttribute('accept')
    expect(accept).toContain('.csv')
    expect(accept).toContain('.xlsx')
    // Não aceita .txt, .exe, etc — react-dropzone rejeita silenciosamente
    expect(accept).not.toContain('.txt')
  })

  test('parsing progress toast shows for multiple files', async ({ uploadPage }) => {
    await uploadPage.goto()

    // Upload 2 arquivos
    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    // Clicar Continuar → parsing mostra progresso
    await uploadPage.clickContinue()

    // Toast de parsing ou sucesso de parse deve aparecer
    await expectAnyToast(uploadPage.page, /analisando|parsing|sucesso|colunas|coluna/i, 10_000)
  })
})
