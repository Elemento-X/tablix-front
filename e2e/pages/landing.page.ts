import { type Page, type Locator } from '@playwright/test'

export class LandingPage {
  readonly page: Page
  readonly ctaButton: Locator
  readonly brand: Locator

  constructor(page: Page) {
    this.page = page
    this.ctaButton = page.getByTestId('cta-upload')
    this.brand = page.getByRole('link', { name: 'Tablix' })
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async clickCta() {
    await this.ctaButton.click()
    await this.page.waitForURL('/upload')
  }
}
