import { type Page, type Locator, expect } from '@playwright/test'

export class ColumnsPage {
  readonly page: Page
  readonly columnGrid: Locator
  readonly columnButtons: Locator
  readonly selectAllButton: Locator
  readonly deselectAllButton: Locator
  readonly processButton: Locator
  readonly startOverButton: Locator

  constructor(page: Page) {
    this.page = page
    this.columnGrid = page.getByTestId('column-grid')
    this.columnButtons = page.locator('button[aria-pressed]')
    this.processButton = page.getByTestId('btn-process')
    this.startOverButton = page.getByTestId('btn-start-over')
    this.selectAllButton = page.getByTestId('btn-select-all')
    this.deselectAllButton = page.getByTestId('btn-deselect-all')
  }

  async waitForColumns() {
    await expect(this.columnGrid).toBeVisible({ timeout: 10_000 })
  }

  async toggleColumn(name: string) {
    await this.columnButtons.filter({ hasText: name }).click()
  }

  async clickSelectAll() {
    await this.selectAllButton.click()
  }

  async clickDeselectAll() {
    await this.deselectAllButton.click()
  }

  async clickProcess() {
    await this.processButton.click()
  }

  async clickStartOver() {
    await this.startOverButton.click()
  }
}
