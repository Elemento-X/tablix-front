import { test, expect } from '../fixtures/test.fixture'
import { expectAnyToast } from '../helpers/toast.helper'

test.describe('7.3 — Limites Free Plan', () => {
  test.beforeEach(async ({ uploadPage }) => {
    // Mock /api/preview → token
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-limits',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )
  })

  test('rejects 4th file (max 3 for Free)', async ({ uploadPage }) => {
    await uploadPage.goto()

    // Upload 3 arquivos um por um (limite Free = 3)
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(3)

    // 4o arquivo deve ser rejeitado
    await uploadPage.uploadFixture('no-common-cols.csv')
    await expectAnyToast(uploadPage.page, /muitos arquivos|too many files/i)
    await expect(uploadPage.fileItems).toHaveCount(3)
  })

  test('rejects file over 1MB', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('large-1.1mb.csv')
    await expectAnyToast(uploadPage.page, /grande|too large/i)
    await expect(uploadPage.fileItems).toHaveCount(0)
  })

  test('rejects files with >500 total rows', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('large-501-rows.csv')

    // Arquivo é aceito (tamanho ok), mas ao Continuar...
    await expect(uploadPage.fileItems).toHaveCount(1)
    await uploadPage.clickContinue()

    // Parsing detecta 501 linhas → toast de erro com mensagem de limite de linhas
    await expectAnyToast(uploadPage.page, /excede.*limite.*linhas|exceeds.*limit.*rows/i, 15_000)
  })

  test('rejects files with no common columns', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.uploadFixture('no-common-cols.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /nenhuma coluna|no common/i)
  })

  test('shows error when quota exhausted', async ({ uploadPage }) => {
    // Remove mock anterior e registra com quota zerada
    await uploadPage.page.unroute('**/api/usage')
    await uploadPage.page.route('**/api/usage', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'free',
          unifications: { current: 1, max: 1, remaining: 0 },
          limits: {
            maxInputFiles: 3,
            maxFileSize: 1_048_576,
            maxTotalSize: 1_048_576,
            maxRows: 500,
            maxColumns: 3,
          },
        }),
      }),
    )

    await uploadPage.goto()

    // Dropzone está desabilitado e mensagem de quota esgotada aparece
    const quotaMsg = uploadPage.page.getByText(/esgotad|exhausted/i)
    await expect(quotaMsg).toBeVisible({ timeout: 5_000 })

    // Botão continuar está desabilitado
    await expect(uploadPage.continueButton).toBeDisabled()
  })

  // --- Cenários negativos adicionais ---

  test('exact 500 rows is accepted', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('exact-500-rows.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Deve poder continuar sem erro
    await expect(uploadPage.continueButton).toBeEnabled()
  })

  test('continue button enabled after file upload', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Botão habilitado com arquivo presente
    await expect(uploadPage.continueButton).toBeEnabled()
  })

  test('dropzone disabled when quota exhausted', async ({ uploadPage }) => {
    await uploadPage.page.unroute('**/api/usage')
    await uploadPage.page.route('**/api/usage', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'free',
          unifications: { current: 1, max: 1, remaining: 0 },
          limits: {
            maxInputFiles: 3,
            maxFileSize: 1_048_576,
            maxTotalSize: 1_048_576,
            maxRows: 500,
            maxColumns: 3,
          },
        }),
      }),
    )

    await uploadPage.goto()
    // Dropzone visualmente desabilitado (opacity)
    await expect(uploadPage.dropzone).toHaveCSS('opacity', '0.5')
  })

  test('file removal button has accessible label', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    const removeBtn = uploadPage.fileItems.first().locator('button')
    await expect(removeBtn).toHaveAttribute('aria-label', /.+/)
  })

  test('remove second file keeps first', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await expect(uploadPage.fileItems).toHaveCount(2)

    // Remove o segundo
    await uploadPage.removeFile(1)
    await expect(uploadPage.fileItems).toHaveCount(1)

    // Pode continuar normalmente
    await expect(uploadPage.continueButton).toBeEnabled()
  })

  test('usage API failure shows error handling', async ({ uploadPage }) => {
    await uploadPage.page.unroute('**/api/usage')
    await uploadPage.page.route('**/api/usage', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      }),
    )

    await uploadPage.goto()
    // Página ainda carrega, dropzone visível (graceful degradation)
    await expect(uploadPage.dropzone).toBeVisible()
  })

  test('preview API returns 500 shows server error toast', async ({ uploadPage }) => {
    await uploadPage.page.unroute('**/api/preview')
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /erro|error/i, 10_000)
  })

  test('3 files at max count hides add-more hint', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.uploadFixture('valid-common-cols-a.csv')
    await uploadPage.uploadFixture('valid-common-cols-b.csv')
    await expect(uploadPage.fileItems).toHaveCount(3)

    // Hint "clique para adicionar mais" não aparece com 3 arquivos (max)
    const addMoreHint = uploadPage.page.getByText(/adicionar mais|add more/i)
    await expect(addMoreHint).not.toBeVisible()
  })

  test('single column file is accepted', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.uploadFixture('single-column.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)
    await expect(uploadPage.continueButton).toBeEnabled()
  })
})
