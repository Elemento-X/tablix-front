import { test, expect } from '@playwright/test'

test.describe('11.8 — Security Headers', () => {
  const routes = ['/', '/upload', '/terms', '/privacy-policy']

  for (const route of routes) {
    test(`${route} returns X-Frame-Options: SAMEORIGIN`, async ({ page }) => {
      const res = await page.request.get(route)
      const header = res.headers()['x-frame-options']
      expect(header).toBe('SAMEORIGIN')
    })

    test(`${route} returns X-Content-Type-Options: nosniff`, async ({ page }) => {
      const res = await page.request.get(route)
      const header = res.headers()['x-content-type-options']
      expect(header).toBe('nosniff')
    })

    test(`${route} returns Content-Security-Policy`, async ({ page }) => {
      const res = await page.request.get(route)
      const csp = res.headers()['content-security-policy']
      expect(csp).toBeTruthy()
      expect(csp).toMatch(/default-src/)
    })

    test(`${route} returns Referrer-Policy`, async ({ page }) => {
      const res = await page.request.get(route)
      const header = res.headers()['referrer-policy']
      expect(header).toBeTruthy()
    })

    test(`${route} returns X-DNS-Prefetch-Control`, async ({ page }) => {
      const res = await page.request.get(route)
      const header = res.headers()['x-dns-prefetch-control']
      expect(header).toBeTruthy()
    })
  }

  test('API route /api/usage returns security headers', async ({ page }) => {
    const res = await page.request.get('/api/usage')
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
  })
})
