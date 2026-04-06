import { test, expect } from '../fixtures/test.fixture'

test.describe('11.6 — Landing Page', () => {
  test('hero section loads with heading and CTA', async ({ landingPage }) => {
    await landingPage.goto()

    // H1 hero
    const heading = landingPage.page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // CTA button
    await expect(landingPage.ctaButton).toBeVisible()
  })

  test('CTA navigates to /upload', async ({ landingPage }) => {
    await landingPage.goto()

    await landingPage.clickCta()
    await expect(landingPage.page).toHaveURL('/upload')
  })

  test('how-it-works section is visible', async ({ landingPage }) => {
    await landingPage.goto()

    const section = landingPage.page.locator('#how-it-works')
    await expect(section).toBeVisible()

    // Heading "Como funciona"
    const heading = section.getByRole('heading', { name: /como funciona/i })
    await expect(heading).toBeVisible()
  })

  test('audience section is visible', async ({ landingPage }) => {
    await landingPage.goto()

    const section = landingPage.page.locator('#audience')
    await expect(section).toBeVisible()

    const heading = section.getByRole('heading', { name: /para quem/i })
    await expect(heading).toBeVisible()
  })

  test('pricing section is visible', async ({ landingPage }) => {
    await landingPage.goto()

    const section = landingPage.page.locator('#pricing')
    await expect(section).toBeVisible()
  })

  test('footer has legal links', async ({ landingPage }) => {
    await landingPage.goto()

    const footer = landingPage.page.locator('footer')
    await expect(footer).toBeVisible()

    // Links legais
    const privacyLink = footer.getByRole('link', { name: /privacidade/i })
    await expect(privacyLink).toBeVisible()

    const termsLink = footer.getByRole('link', { name: /termos/i })
    await expect(termsLink).toBeVisible()
  })

  test('footer upload link is visible and points to /upload', async ({ landingPage }) => {
    await landingPage.goto()

    const footer = landingPage.page.locator('footer')
    const uploadLink = footer.getByRole('link', { name: /começar|grátis|upload/i })
    await expect(uploadLink.first()).toBeVisible()

    const href = await uploadLink.first().getAttribute('href')
    expect(href).toContain('/upload')
  })

  test('header nav links are visible on desktop', async ({ landingPage }) => {
    await landingPage.goto()

    const header = landingPage.page.locator('header')
    const howItWorksLink = header.getByRole('link', { name: /como funciona/i })
    await expect(howItWorksLink).toBeVisible()

    const pricingLink = header.getByRole('link', { name: /preços/i })
    await expect(pricingLink).toBeVisible()
  })

  test('brand link in header is visible', async ({ landingPage }) => {
    await landingPage.goto()
    await expect(landingPage.brand).toBeVisible()
  })

  test('early access badge is visible', async ({ landingPage }) => {
    await landingPage.goto()

    const badge = landingPage.page.getByText(/grátis para os primeiros usuários/i).first()
    await expect(badge).toBeVisible({ timeout: 10_000 })
  })
})
