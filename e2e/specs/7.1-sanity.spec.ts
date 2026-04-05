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

  test('dropzone has accessible role and label', async ({ uploadPage }) => {
    await uploadPage.goto()
    const dropzone = uploadPage.dropzone
    await expect(dropzone).toHaveAttribute('role', 'button')
    await expect(dropzone).toHaveAttribute('aria-label', /.+/)
  })

  test('file input accepts only CSV and XLSX', async ({ uploadPage }) => {
    await uploadPage.goto()
    const accept = await uploadPage.fileInput.getAttribute('accept')
    expect(accept).toContain('.csv')
    expect(accept).toContain('.xlsx')
  })

  test('upload page step navigation shows 3 steps', async ({ uploadPage }) => {
    await uploadPage.goto()
    const steps = uploadPage.page.locator('nav[aria-label] li')
    await expect(steps).toHaveCount(3)
  })

  test('theme toggle button is visible', async ({ uploadPage }) => {
    await uploadPage.goto()
    const themeBtn = uploadPage.page.getByRole('button', { name: /tema|theme/i })
    await expect(themeBtn).toBeVisible()
  })

  test('language selector button is visible', async ({ uploadPage }) => {
    await uploadPage.goto()
    const langBtn = uploadPage.page.getByRole('button', { name: /idioma|language/i })
    await expect(langBtn).toBeVisible()
  })

  test('usage status shows plan and quota info', async ({ uploadPage }) => {
    await uploadPage.goto()
    await expect(uploadPage.usageStatus).toBeVisible({ timeout: 5_000 })
    await expect(uploadPage.usageStatus).toContainText(/free/i)
  })

  test('security note is visible below dropzone', async ({ uploadPage }) => {
    await uploadPage.goto()
    const secNote = uploadPage.page.getByText(/segur|security|local/i)
    await expect(secNote.first()).toBeVisible()
  })
})
