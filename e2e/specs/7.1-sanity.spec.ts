import { test, expect } from '../fixtures/test.fixture'

test.describe('7.1 — Sanity', () => {
  test('landing page loads and shows brand', async ({ landingPage }) => {
    await landingPage.goto()
    await expect(landingPage.brand).toBeVisible()
  })

  test('CTA navigates to upload page', async ({ landingPage }) => {
    await landingPage.goto()
    await expect(landingPage.ctaButton).toBeVisible()
    await landingPage.clickCta()
    await expect(landingPage.page).toHaveURL('/upload')
  })

  test('upload page loads with dropzone', async ({ uploadPage }) => {
    await uploadPage.goto()
    await expect(uploadPage.dropzone).toBeVisible()
  })

  test('upload page shows usage status', async ({ uploadPage }) => {
    await uploadPage.goto()
    await expect(uploadPage.usageStatus).toBeVisible({ timeout: 5_000 })
  })

  test('continue button is disabled without files', async ({ uploadPage }) => {
    await uploadPage.goto()
    await expect(uploadPage.continueButton).toBeDisabled()
  })

  test('back link returns to landing', async ({ uploadPage }) => {
    await uploadPage.goto()
    await uploadPage.clickBack()
    await expect(uploadPage.page).toHaveURL('/')
  })
})
