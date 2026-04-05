import { test, expect } from '../fixtures/test.fixture'
import { t } from '../helpers/locale.helper'

test.describe('11.7 — Tema, Legal & Responsive', () => {
  test.describe('Dark Mode', () => {
    test('theme toggle switches to dark mode', async ({ uploadPage }) => {
      await uploadPage.goto()

      // Botão de tema (modo claro → escuro)
      const themeBtn = uploadPage.page.getByRole('button', { name: /tema escuro|theme/i })
      await themeBtn.click()

      // HTML deve ter classe "dark"
      await expect(uploadPage.page.locator('html')).toHaveClass(/dark/)
    })

    test('dark mode persists after reload', async ({ uploadPage }) => {
      await uploadPage.goto()

      const themeBtn = uploadPage.page.getByRole('button', { name: /tema escuro|theme/i })
      await themeBtn.click()

      await expect(uploadPage.page.locator('html')).toHaveClass(/dark/)

      // Reload
      await uploadPage.page.reload()
      await uploadPage.page.waitForLoadState('networkidle')

      // Deve permanecer no dark mode
      await expect(uploadPage.page.locator('html')).toHaveClass(/dark/)
    })
  })

  test.describe('Legal Pages', () => {
    test('terms of use page loads and has heading', async ({ page }) => {
      await page.goto('/terms')
      await page.waitForLoadState('networkidle')

      const heading = page.getByRole('heading', { name: /termos de uso/i })
      await expect(heading).toBeVisible()
    })

    test('terms of use has table of contents sections', async ({ page }) => {
      await page.goto('/terms')
      await page.waitForLoadState('networkidle')

      // Seções com ID existem
      await expect(page.locator('#acceptance')).toBeVisible()
      await expect(page.locator('#service-description')).toBeVisible()
    })

    test('privacy policy page loads and has heading', async ({ page }) => {
      await page.goto('/privacy-policy')
      await page.waitForLoadState('networkidle')

      const heading = page.getByRole('heading', { name: /política de privacidade/i })
      await expect(heading).toBeVisible()
    })

    test('privacy policy has table of contents sections', async ({ page }) => {
      await page.goto('/privacy-policy')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('#data-collection')).toBeVisible()
      await expect(page.locator('#cookies')).toBeVisible()
    })

    test('legal pages have back link to home', async ({ page }) => {
      await page.goto('/terms')
      await page.waitForLoadState('networkidle')

      const backLink = page.getByRole('link', { name: /voltar/i })
      await expect(backLink).toBeVisible()

      await backLink.click()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Responsive', () => {
    test('upload page renders correctly on mobile (375px)', async ({ uploadPage }) => {
      await uploadPage.page.setViewportSize({ width: 375, height: 812 })
      await uploadPage.goto()

      // Dropzone visível
      await expect(uploadPage.dropzone).toBeVisible()

      // Botão continuar visível
      await expect(uploadPage.continueButton).toBeVisible()

      // Usage status visível
      await expect(uploadPage.usageStatus).toBeVisible({ timeout: 5_000 })
    })

    test('upload page renders correctly on tablet (768px)', async ({ uploadPage }) => {
      await uploadPage.page.setViewportSize({ width: 768, height: 1024 })
      await uploadPage.goto()

      await expect(uploadPage.dropzone).toBeVisible()
      await expect(uploadPage.continueButton).toBeVisible()
      await expect(uploadPage.usageStatus).toBeVisible({ timeout: 5_000 })
    })

    test('landing page renders correctly on mobile (375px)', async ({ landingPage }) => {
      await landingPage.page.setViewportSize({ width: 375, height: 812 })
      await landingPage.goto()

      // Hero visível
      const heading = landingPage.page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()

      // CTA visível
      await expect(landingPage.ctaButton).toBeVisible()

      // Hamburger menu visível em mobile
      const menuBtn = landingPage.page.getByRole('button', {
        name: /menu|navegação/i,
      })
      await expect(menuBtn).toBeVisible()
    })
  })

  test.describe('i18n — Troca de idioma', () => {
    test('switching to English updates UI text on upload page', async ({ uploadPage }) => {
      await uploadPage.goto()

      // Texto em pt-BR presente inicialmente
      const ptTitle = t('pt-BR', 'upload.title')
      await expect(uploadPage.page.getByText(ptTitle)).toBeVisible()

      // Clicar no seletor de idioma
      const langBtn = uploadPage.page.getByRole('button', { name: /idioma|language/i })
      await langBtn.click()

      // Selecionar English (texto no dropdown)
      await uploadPage.page.getByText('English').click()

      // Texto em en presente
      const enTitle = t('en', 'upload.title')
      await expect(uploadPage.page.getByText(enTitle)).toBeVisible({ timeout: 5_000 })
    })

    test('switching to English updates landing page text', async ({ landingPage }) => {
      await landingPage.goto()

      // Clicar no seletor de idioma
      const langBtn = landingPage.page.getByRole('button', { name: /idioma|language/i })
      await langBtn.click()

      // Selecionar English (texto no dropdown)
      await landingPage.page.getByText('English').click()

      // Hero em inglês
      const enHeroTitle = t('en', 'hero.title')
      await expect(landingPage.page.getByText(enHeroTitle)).toBeVisible({ timeout: 5_000 })
    })
  })
})
