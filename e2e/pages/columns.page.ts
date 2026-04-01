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
    this.startOverButton = page.locator('button', {
      hasText: /Recomeçar|Start Over/,
    })
    this.selectAllButton = page.locator('button', {
      hasText: /Selecionar Todas|Select All/,
    })
    this.deselectAllButton = page.locator('button', {
      hasText: /Desmarcar Todas|Deselect All/,
    })
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
