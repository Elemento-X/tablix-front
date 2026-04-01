import { type Page, type Locator } from '@playwright/test'
import path from 'node:path'

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'files')

export class UploadPage {
  readonly page: Page
  readonly dropzone: Locator
  readonly fileInput: Locator
  readonly fileList: Locator
  readonly fileItems: Locator
  readonly continueButton: Locator
  readonly usageStatus: Locator
  readonly backLink: Locator

  constructor(page: Page) {
    this.page = page
    this.dropzone = page.getByTestId('dropzone')
    this.fileInput = page.locator('input[type="file"]')
    this.fileList = page.getByTestId('file-list')
    this.fileItems = page.getByTestId('file-item')
    this.continueButton = page.getByTestId('btn-continue')
    this.usageStatus = page.getByTestId('usage-status')
    this.backLink = page.getByRole('link', { name: 'Voltar' })
  }

  async goto() {
    await this.page.goto('/upload')
    await this.page.waitForLoadState('networkidle')
  }

  async uploadFixture(...filenames: string[]) {
    const paths = filenames.map((f) => path.join(FIXTURES_DIR, f))
    await this.fileInput.setInputFiles(paths)
  }

  async removeFile(index: number) {
    const removeButtons = this.fileItems.nth(index).locator('button')
    await removeButtons.click()
  }

  async clickContinue() {
    await this.continueButton.click()
  }

  async clickBack() {
    await this.backLink.click()
    await this.page.waitForURL('/')
  }
}
