import { test as base } from '@playwright/test'
import { LandingPage } from '../pages/landing.page'
import { UploadPage } from '../pages/upload.page'
import { ColumnsPage } from '../pages/columns.page'
import { ResultPage } from '../pages/result.page'

interface TablixFixtures {
  landingPage: LandingPage
  uploadPage: UploadPage
  columnsPage: ColumnsPage
  resultPage: ResultPage
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

    // Dismiss cookie consent and onboarding tips via localStorage
    await page.addInitScript(() => {
      localStorage.setItem('tablix-cookie-consent', 'accepted')
      localStorage.setItem('tablix-onboarding-upload-seen', '1')
      localStorage.setItem('tablix-onboarding-columns-seen', '1')
    })

    await use(new UploadPage(page))
  },

  landingPage: async ({ page }, use) => {
    // Dismiss cookie consent
    await page.addInitScript(() => {
      localStorage.setItem('tablix-cookie-consent', 'accepted')
    })

    await use(new LandingPage(page))
  },

  columnsPage: async ({ page }, use) => {
    await use(new ColumnsPage(page))
  },

  resultPage: async ({ page }, use) => {
    await use(new ResultPage(page))
  },
})

export { expect } from '@playwright/test'
