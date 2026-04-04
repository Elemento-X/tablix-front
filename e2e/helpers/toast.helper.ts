import { type Page, expect } from '@playwright/test'

/**
 * Asserta que um toast do Sonner aparece com o tipo e texto esperados.
 */
export async function expectToast(
  page: Page,
  type: 'success' | 'error' | 'info' | 'warning',
  text: string | RegExp,
) {
  const toast = page.locator(`[data-sonner-toast][data-type="${type}"]`)
  await expect(toast.first()).toContainText(text, { timeout: 5_000 })
}

/**
 * Asserta que qualquer toast aparece com o texto esperado (ignora tipo).
 */
export async function expectAnyToast(page: Page, text: string | RegExp, timeout = 5_000) {
  const toast = page.locator('[data-sonner-toast]')
  await expect(toast.first()).toContainText(text, { timeout })
}
