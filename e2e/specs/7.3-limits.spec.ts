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

    // Parsing detecta 501 linhas → toast de erro (parsing pode demorar em CI)
    await expectAnyToast(
      uploadPage.page,
      /linhas|rows|limite|limit|erro.*processar|error/i,
      15_000,
    )
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
    // Override usage mock com quota zerada
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
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /limite|limit/i)
  })
})
