import { test, expect } from '../fixtures/test.fixture'
import { expectAnyToast } from '../helpers/toast.helper'

test.describe('7.4 — Rate Limiting', () => {
  test.describe.configure({ mode: 'serial' })

  test('shows error toast when API returns 429 (mocked)', async ({ uploadPage }) => {
    // Mock /api/preview para retornar 429
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({
          error: 'Too many requests. Please try again later.',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /too many|muitas|tente novamente/i)
  })

  test('process button shows error on 429 during processing (mocked)', async ({
    uploadPage,
    columnsPage,
  }) => {
    // Mock /api/preview → sucesso (para chegar na tela de colunas)
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-rate',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    // Mock /api/unification/complete → 429
    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({
          error: 'Too many requests. Please try again later.',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()
    await expectAnyToast(uploadPage.page, /too many|falha|failed/i)
  })

  test('real rate limit: preview returns 429 with Retry-After after rapid requests', async ({
    page,
  }) => {
    // Visita a página para obter cookies (fingerprint)
    await page.goto('/upload')
    await page.waitForLoadState('networkidle')

    let got429 = false
    let retryAfter: string | null = null

    // Dispara requests rápidos até obter 429 (máx 20 tentativas)
    for (let i = 0; i < 20; i++) {
      const result = await page.evaluate(async () => {
        const formData = new FormData()
        const csvBlob = new Blob(['ID,Nome\n1,Test'], { type: 'text/csv' })
        formData.append('files', csvBlob, 'test.csv')

        const response = await fetch('/api/preview', {
          method: 'POST',
          body: formData,
        })
        return {
          status: response.status,
          retryAfter: response.headers.get('retry-after'),
        }
      })

      if (result.status === 429) {
        got429 = true
        retryAfter = result.retryAfter
        break
      }
    }

    // Deve ter recebido 429
    expect(got429).toBe(true)

    // Deve incluir header Retry-After válido
    expect(retryAfter).not.toBeNull()
    expect(Number(retryAfter)).toBeGreaterThan(0)
  })
})
