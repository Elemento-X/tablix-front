import { test as base } from '@playwright/test'
import { LandingPage } from '../pages/landing.page'
import { UploadPage } from '../pages/upload.page'
import { ColumnsPage } from '../pages/columns.page'

interface TablixFixtures {
  landingPage: LandingPage
  uploadPage: UploadPage
  columnsPage: ColumnsPage
}

export const test = base.extend<TablixFixtures>({
  uploadPage: async ({ page }, use) => {
    // Mock /api/usage para retornar plano Free com quota disponível
    await page.route('**/api/usage', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'free',
          unifications: { current: 0, max: 1, remaining: 1 },
          limits: {
            maxInputFiles: 3,
            maxFileSize: 1_048_576,
            maxTotalSize: 1_048_576,
            maxRows: 500,
            maxColumns: 3,
          },
        }),
      }),
    )

    await use(new UploadPage(page))
  },

  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page))
  },

  columnsPage: async ({ page }, use) => {
    await use(new ColumnsPage(page))
  },
})

export { expect } from '@playwright/test'
