import { test, expect } from '../fixtures/test.fixture'
import { expectAnyToast } from '../helpers/toast.helper'

test.describe('7.4 — Rate Limiting & Error Handling', () => {
  test.describe.configure({ mode: 'serial' })

  // Rate limiter real requer Redis — sem Redis no CI, in-memory não garante 429 consistente.
  // Habilitar quando CI tiver Redis configurado (UPSTASH_REDIS_REST_URL secret no workflow).
  const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL

  test('shows error toast when preview API returns 429 (mocked)', async ({ uploadPage }) => {
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
    await expectAnyToast(uploadPage.page, /too many|muitas tentativas|tente novamente/i)
  })
  ;(hasRedis ? test : test.skip)(
    'real rate limit: preview returns 429 with Retry-After after rapid requests',
    async ({ page }) => {
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

          // Ler cookie __csrf para double-submit pattern
          const csrfToken = document.cookie
            .split('; ')
            .find((c) => c.startsWith('__csrf='))
            ?.split('=')[1]

          const headers: Record<string, string> = {}
          if (csrfToken) headers['X-CSRF-Token'] = csrfToken

          const response = await fetch('/api/preview', {
            method: 'POST',
            body: formData,
            headers,
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
    },
  )

  // --- Cenários adicionais de erros ---

  test('preview API returns 5xx shows server error toast', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Gateway Timeout' }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /erro|error/i, 10_000)
  })

  test('preview API returns empty columns shows error', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: [],
          unificationToken: 'test-token',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()

    // Deve mostrar erro ou ir para colunas com 0 colunas (process disabled)
    // Depende da implementação — pelo menos não deve crashar
    const errorOrColumns = uploadPage.page
      .locator('[data-sonner-toast], [data-testid="column-grid"]')
      .first()
    await expect(errorOrColumns).toBeVisible({ timeout: 10_000 })
  })

  test('network error during preview shows offline/error toast', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) => route.abort('connectionrefused'))

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /offline|erro|error|conexão|connection/i, 10_000)
  })

  test('network error during processing shows error toast', async ({ uploadPage, columnsPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-net',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.abort('connectionrefused'),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()
    await expectAnyToast(uploadPage.page, /offline|erro|error|falha|conexão/i, 10_000)
  })

  test('columns step still functional after error recovery', async ({
    uploadPage,
    columnsPage,
  }) => {
    let callCount = 0
    await uploadPage.page.route('**/api/preview', (route) => {
      callCount++
      if (callCount === 1) {
        // Primeiro: sucesso
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            columns: ['ID', 'Nome', 'Email'],
            unificationToken: 'test-token-recovery',
            usage: { current: 0, max: 1, remaining: 1 },
          }),
        })
      }
      // Subsequentes: erro
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

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

    // Colunas funcionam normalmente
    await columnsPage.toggleColumn('Email')
    const selected = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(selected).toHaveCount(2)
  })

  // --- Cenários de segurança: 403 ---

  test('preview API returns 403 QUOTA_EXCEEDED shows error toast', async ({ uploadPage }) => {
    await uploadPage.page.unroute('**/api/preview')
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Quota exceeded',
          errorCode: 'QUOTA_EXCEEDED',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /erro|error|limite|limit/i, 10_000)
  })

  test('unification/complete returns 403 invalid token shows error toast', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'expired-token-123',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid or expired unification token',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()
    await expectAnyToast(uploadPage.page, /erro|error|falha|failed/i, 10_000)
  })

  // --- Cenários adicionais de erros ---

  test('preview API returns 5xx shows server error toast', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Gateway Timeout' }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /erro|error/i, 10_000)
  })

  test('preview API returns empty columns shows error', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: [],
          unificationToken: 'test-token',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()

    // Deve mostrar erro ou ir para colunas com 0 colunas (process disabled)
    // Depende da implementação — pelo menos não deve crashar
    const errorOrColumns = uploadPage.page
      .locator('[data-sonner-toast], [data-testid="column-grid"]')
      .first()
    await expect(errorOrColumns).toBeVisible({ timeout: 10_000 })
  })

  test('network error during preview shows offline/error toast', async ({ uploadPage }) => {
    await uploadPage.page.route('**/api/preview', (route) => route.abort('connectionrefused'))

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /offline|erro|error|conexão|connection/i, 10_000)
  })

  test('network error during processing shows error toast', async ({ uploadPage, columnsPage }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'test-token-net',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.abort('connectionrefused'),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()
    await expectAnyToast(uploadPage.page, /offline|erro|error|falha|conexão/i, 10_000)
  })

  test('columns step still functional after error recovery', async ({
    uploadPage,
    columnsPage,
  }) => {
    let callCount = 0
    await uploadPage.page.route('**/api/preview', (route) => {
      callCount++
      if (callCount === 1) {
        // Primeiro: sucesso
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            columns: ['ID', 'Nome', 'Email'],
            unificationToken: 'test-token-recovery',
            usage: { current: 0, max: 1, remaining: 1 },
          }),
        })
      }
      // Subsequentes: erro
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

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

    // Colunas funcionam normalmente
    await columnsPage.toggleColumn('Email')
    const selected = columnsPage.page.locator('button[aria-pressed="true"]')
    await expect(selected).toHaveCount(2)
  })

  // --- Cenários de segurança: 403 ---

  test('preview API returns 403 QUOTA_EXCEEDED shows error toast', async ({ uploadPage }) => {
    await uploadPage.page.unroute('**/api/preview')
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Quota exceeded',
          errorCode: 'QUOTA_EXCEEDED',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await expect(uploadPage.fileItems).toHaveCount(1)

    await uploadPage.clickContinue()
    await expectAnyToast(uploadPage.page, /erro|error|limite|limit/i, 10_000)
  })

  test('unification/complete returns 403 invalid token shows error toast', async ({
    uploadPage,
    columnsPage,
  }) => {
    await uploadPage.page.route('**/api/preview', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: ['ID', 'Nome', 'Email'],
          unificationToken: 'expired-token-123',
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      }),
    )

    await uploadPage.page.route('**/api/unification/complete', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid or expired unification token',
        }),
      }),
    )

    await uploadPage.goto()
    await uploadPage.uploadFixture('valid-3col-5row.csv')
    await uploadPage.clickContinue()
    await columnsPage.waitForColumns()

    await columnsPage.clickProcess()
    await expectAnyToast(uploadPage.page, /erro|error|falha|failed/i, 10_000)
  })
})
