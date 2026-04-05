import { test as base, expect } from '@playwright/test'
import { UploadPage } from '../pages/upload.page'
import { ColumnsPage } from '../pages/columns.page'

/**
 * Fixture SEM dismiss de onboarding/cookies via localStorage.
 * Permite testar que os banners aparecem na primeira visita.
 */
const test = base.extend<{
  freshUploadPage: UploadPage
  columnsPage: ColumnsPage
}>({
  freshUploadPage: async ({ page }, use) => {
    // Mock /api/usage
    await page.route('**/api/usage', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'free',
          unifications: { current: 0, max: 1, remaining: 1 },
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

    // NÃO definir localStorage — primeira visita limpa
    await use(new UploadPage(page))
  },

  columnsPage: async ({ page }, use) => {
    await use(new ColumnsPage(page))
  },
})

test.describe('11.1 — Onboarding Tips & Cookie Consent', () => {
  test.describe('Cookie Consent', () => {
    test('cookie consent banner appears on first visit', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      const dialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(dialog).toBeVisible({ timeout: 5_000 })
    })

    test('accepting cookie consent hides banner and persists', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      const dialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      const acceptBtn = dialog.getByRole('button', { name: /entendi/i })
      await acceptBtn.click()

      await expect(dialog).not.toBeVisible()

      // Verificar localStorage
      const consent = await freshUploadPage.page.evaluate(() =>
        localStorage.getItem('tablix-cookie-consent'),
      )
      expect(consent).toBe('accepted')
    })

    test('cookie consent does not reappear after accept + reload', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      const dialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      await dialog.getByRole('button', { name: /entendi/i }).click()
      await expect(dialog).not.toBeVisible()

      // Reload
      await freshUploadPage.page.reload()
      await freshUploadPage.page.waitForLoadState('networkidle')

      // Não deve reaparecer
      await expect(dialog).not.toBeVisible()
    })
  })

  test.describe('Onboarding Tips', () => {
    test('upload tip is visible on first visit (no localStorage)', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      // Dismiss cookie consent primeiro (scoped ao dialog)
      const cookieDialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(cookieDialog).toBeVisible({ timeout: 5_000 })
      await cookieDialog.getByRole('button', { name: /entendi/i }).click()

      // Tip de upload visível
      const uploadTip = freshUploadPage.page.getByText(/envie seus arquivos/i)
      await expect(uploadTip).toBeVisible({ timeout: 5_000 })
    })

    test('dismissing upload tip persists in localStorage', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      // Dismiss cookie consent (scoped ao dialog)
      const cookieDialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(cookieDialog).toBeVisible({ timeout: 5_000 })
      await cookieDialog.getByRole('button', { name: /entendi/i }).click()

      // Tip visível
      const uploadTip = freshUploadPage.page.getByText(/envie seus arquivos/i)
      await expect(uploadTip).toBeVisible({ timeout: 5_000 })

      // Dismiss tip (botão "Entendi" dentro do main content, não do dialog)
      const mainContent = freshUploadPage.page.locator('#main-content')
      await mainContent.getByRole('button', { name: /entendi/i }).click()

      // localStorage atualizado
      const seen = await freshUploadPage.page.evaluate(() =>
        localStorage.getItem('tablix-onboarding-upload-seen'),
      )
      expect(seen).toBe('1')
    })

    test('upload tip does not reappear after dismiss + reload', async ({ freshUploadPage }) => {
      await freshUploadPage.goto()

      // Dismiss cookie consent (scoped ao dialog)
      const cookieDialog = freshUploadPage.page.getByRole('dialog', { name: /cookies/i })
      await expect(cookieDialog).toBeVisible({ timeout: 5_000 })
      await cookieDialog.getByRole('button', { name: /entendi/i }).click()

      // Tip deve estar visível — falha explícita se não aparecer
      const uploadTip = freshUploadPage.page.getByText(/envie seus arquivos/i)
      await expect(uploadTip).toBeVisible({ timeout: 5_000 })

      // Dismiss tip
      const mainContent = freshUploadPage.page.locator('#main-content')
      await mainContent.getByRole('button', { name: /entendi/i }).click()

      // Reload
      await freshUploadPage.page.reload()
      await freshUploadPage.page.waitForLoadState('networkidle')

      // Tip não reaparece
      await expect(uploadTip).not.toBeVisible()
    })
  })
})
