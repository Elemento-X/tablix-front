import { type Page, type Locator, expect } from '@playwright/test'

export class ResultPage {
  readonly page: Page
  readonly heading: Locator
  readonly newUnificationButton: Locator
  readonly upgradeLink: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /pronto/i })
    this.newUnificationButton = page.getByRole('button', { name: /nova unificação/i })
    this.upgradeLink = page.getByRole('link', { name: /upgrade.*pro/i })
  }

  async waitForResult() {
    await expect(this.heading).toBeVisible({ timeout: 10_000 })
  }

  async clickNewUnification() {
    await this.newUnificationButton.click()
  }
}
