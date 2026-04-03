/**
 * Tests for src/lib/i18n/server.ts
 * getServerLocale() — reads cookie, falls back to defaultLocale, rejects invalid locales
 * getMessages() — returns correct message bundle for a given locale
 */

import { defaultLocale, locales } from '@/lib/i18n/config'

// Mock next/headers before importing server.ts
const mockGet = jest.fn()
const mockCookies = jest.fn()

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('getServerLocale()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({ get: mockGet })
  })

  it('returns pt-BR when cookie is "pt-BR"', async () => {
    mockGet.mockReturnValue({ value: 'pt-BR' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('pt-BR')
  })

  it('returns en when cookie is "en"', async () => {
    mockGet.mockReturnValue({ value: 'en' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('en')
  })

  it('returns es when cookie is "es"', async () => {
    mockGet.mockReturnValue({ value: 'es' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('es')
  })

  it('returns defaultLocale when cookie is missing (undefined)', async () => {
    mockGet.mockReturnValue(undefined)
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale when cookie value is empty string', async () => {
    mockGet.mockReturnValue({ value: '' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale when cookie value is invalid locale', async () => {
    mockGet.mockReturnValue({ value: 'fr' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for path traversal attempt in cookie', async () => {
    mockGet.mockReturnValue({ value: '../etc/passwd' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for XSS payload in cookie', async () => {
    mockGet.mockReturnValue({ value: '<script>alert(1)</script>' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for null-ish cookie value', async () => {
    mockGet.mockReturnValue({ value: null })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returned locale is always a member of locales tuple', async () => {
    mockGet.mockReturnValue({ value: 'invalid' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(locales).toContain(result)
  })
})

describe('getMessages()', () => {
  it('returns pt-BR messages for pt-BR locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('pt-BR')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('returns en messages for en locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('en')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('returns es messages for es locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('es')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('each locale returns distinct meta.title (no cross-contamination)', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const ptBR = getMessages('pt-BR')
    const en = getMessages('en')
    const es = getMessages('es')

    const titles = [ptBR.meta.title, en.meta.title, es.meta.title]
    const uniqueTitles = new Set(titles)
    // All three should be different strings (sanity check — they are distinct translations)
    expect(uniqueTitles.size).toBe(3)
  })

  it('returns object with meta.description for all locales', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    for (const locale of locales) {
      const messages = getMessages(locale)
      expect(typeof messages.meta.description).toBe('string')
      expect(messages.meta.description.length).toBeGreaterThan(0)
    }
  })
})
