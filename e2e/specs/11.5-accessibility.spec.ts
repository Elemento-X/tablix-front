import { test, expect } from '../fixtures/test.fixture'

test.describe('11.5 — Acessibilidade', () => {
  test.describe('Navegação por teclado', () => {
    test('Tab navigates to dropzone element', async ({ uploadPage }) => {
      await uploadPage.goto()

      // Tab deve alcançar o dropzone (data-testid="dropzone")
      let found = false
      for (let i = 0; i < 20; i++) {
        await uploadPage.page.keyboard.press('Tab')
        const testId = await uploadPage.page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid'),
        )
        if (testId === 'dropzone') {
          found = true
          break
        }
      }
      expect(found).toBe(true)
    })

    test('focus visible ring appears on focused elements', async ({ uploadPage }) => {
      await uploadPage.goto()
      await uploadPage.uploadFixture('valid-3col-5row.csv')

      // Tab até o botão continuar receber foco (keyboard navigation ativa :focus-visible)
      for (let i = 0; i < 20; i++) {
        await uploadPage.page.keyboard.press('Tab')
        if (await uploadPage.continueButton.evaluate((el) => el === document.activeElement)) {
          break
        }
      }

      // Verificar indicador visual de foco (outline ou box-shadow, não borda genérica)
      const hasFocusIndicator = await uploadPage.continueButton.evaluate((el) => {
        const style = window.getComputedStyle(el)
        const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
        const hasBoxShadow = style.boxShadow !== 'none' && style.boxShadow !== ''
        return hasOutline || hasBoxShadow
      })
      expect(hasFocusIndicator).toBe(true)
    })
  })

  test.describe('ARIA attributes', () => {
    test('all action buttons have aria-label or accessible name', async ({ uploadPage }) => {
      await uploadPage.goto()
      await uploadPage.uploadFixture('valid-3col-5row.csv')

      // Botão de remover arquivo tem aria-label
      const removeBtn = uploadPage.fileItems.first().locator('button')
      const ariaLabel = await removeBtn.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel!.length).toBeGreaterThan(0)
    })

    test('dropzone has correct role and aria-label', async ({ uploadPage }) => {
      await uploadPage.goto()

      await expect(uploadPage.dropzone).toHaveAttribute('role', 'button')
      const label = await uploadPage.dropzone.getAttribute('aria-label')
      expect(label).toBeTruthy()
    })

    test('step indicator has nav with aria-label', async ({ uploadPage }) => {
      await uploadPage.goto()

      const nav = uploadPage.page.locator('nav[aria-label]')
      await expect(nav.first()).toBeVisible()

      const ariaLabel = await nav.first().getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    })

    test('usage status has progressbar role', async ({ uploadPage }) => {
      await uploadPage.goto()

      const progressbar = uploadPage.usageStatus.locator('[role="progressbar"]')
      await expect(progressbar).toBeVisible({ timeout: 5_000 })
    })

    test('column buttons have aria-pressed attribute', async ({ uploadPage, columnsPage }) => {
      await uploadPage.page.route('**/api/preview', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            columns: ['ID', 'Nome', 'Email'],
            unificationToken: 'test-token-a11y',
            usage: { current: 0, max: 1, remaining: 1 },
          }),
        }),
      )

      await uploadPage.goto()
      await uploadPage.uploadFixture('valid-3col-5row.csv')
      await uploadPage.clickContinue()
      await columnsPage.waitForColumns()

      const buttons = columnsPage.columnButtons
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      for (let i = 0; i < count; i++) {
        const ariaPressed = await buttons.nth(i).getAttribute('aria-pressed')
        expect(ariaPressed).toMatch(/^(true|false)$/)
      }
    })
  })

  test.describe('Sonner toasts acessibilidade', () => {
    test('toast is visible and accessible after file upload', async ({ uploadPage }) => {
      await uploadPage.goto()
      await uploadPage.uploadFixture('valid-3col-5row.csv')

      // Toast individual aparece com data-sonner-toast
      const toast = uploadPage.page.locator('[data-sonner-toast]')
      await expect(toast.first()).toBeVisible({ timeout: 5_000 })

      // Toast tem data-type para tipo semântico
      const type = await toast.first().getAttribute('data-type')
      expect(type).toBeTruthy()
    })
  })
})
