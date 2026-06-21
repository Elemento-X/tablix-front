/**
 * Tests for src/lib/i18n/server.ts
 * getServerLocale() — reads x-locale header first, falls back to cookie, then defaultLocale
 * getMessages() — returns correct message bundle for a given locale
 * toOpenGraphLocale() — converts Locale to OpenGraph locale format
 *
 * Source-of-truth hierarchy (Abordagem B — locale by URL prefix):
 *   1. x-locale header (injected by proxy.ts from URL prefix)
 *   2. tablix-locale cookie (fallback for routes the proxy may not cover)
 *   3. defaultLocale ('pt-BR')
 */

import { defaultLocale, locales } from '@/lib/i18n/config'

// Mock next/headers before importing server.ts.
// Both headers() and cookies() must be mocked because getServerLocale() awaits both.
const mockHeaderGet = jest.fn()
const mockHeaders = jest.fn()
const mockCookieGet = jest.fn()
const mockCookies = jest.fn()

jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
  cookies: () => mockCookies(),
}))

describe('getServerLocale()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: headers() resolves with an object whose get() returns null (no x-locale header).
    // This ensures cookie-path tests are not polluted by a previous test that set a header value.
    mockHeaders.mockResolvedValue({ get: mockHeaderGet })
    mockHeaderGet.mockReturnValue(null)
    // Default: cookies() resolves with an object whose get() returns undefined (no cookie).
    mockCookies.mockResolvedValue({ get: mockCookieGet })
  })

  // ─── x-locale header path (primary source of truth) ─────────────────────────

  it('returns locale from x-locale header when header carries a valid locale', async () => {
    mockHeaderGet.mockReturnValue('en')
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('en')
  })

  it('returns "fr" when x-locale header is "fr"', async () => {
    mockHeaderGet.mockReturnValue('fr')
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('fr')
  })

  it('returns "zh" when x-locale header is "zh"', async () => {
    mockHeaderGet.mockReturnValue('zh')
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('zh')
  })

  it('returns "de" when x-locale header is "de"', async () => {
    mockHeaderGet.mockReturnValue('de')
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('de')
  })

  it('x-locale header takes precedence over cookie (header wins)', async () => {
    mockHeaderGet.mockReturnValue('de')
    mockCookieGet.mockReturnValue({ value: 'es' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('de')
  })

  it('falls back to cookie when x-locale header carries an invalid locale', async () => {
    mockHeaderGet.mockReturnValue('xx')
    mockCookieGet.mockReturnValue({ value: 'es' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('es')
  })

  it('falls back to defaultLocale when x-locale is invalid and no cookie exists', async () => {
    mockHeaderGet.mockReturnValue('invalid')
    mockCookieGet.mockReturnValue(undefined)
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('falls back to cookie when x-locale header is null (no prefix in URL)', async () => {
    mockHeaderGet.mockReturnValue(null)
    mockCookieGet.mockReturnValue({ value: 'zh' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('zh')
  })

  it('rejects XSS payload in x-locale header and falls back to cookie', async () => {
    mockHeaderGet.mockReturnValue('<script>alert(1)</script>')
    mockCookieGet.mockReturnValue({ value: 'pt-BR' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('pt-BR')
  })

  it('rejects path traversal in x-locale header and falls back to defaultLocale', async () => {
    mockHeaderGet.mockReturnValue('../etc/passwd')
    mockCookieGet.mockReturnValue(undefined)
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  // ─── cookie path (fallback when no x-locale header) ──────────────────────────
  // In all cookie tests, mockHeaderGet returns null (set in beforeEach),
  // so getServerLocale falls through to the cookie store.

  it('returns pt-BR when cookie is "pt-BR" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'pt-BR' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('pt-BR')
  })

  it('returns en when cookie is "en" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'en' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('en')
  })

  it('returns es when cookie is "es" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'es' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('es')
  })

  it('returns zh when cookie is "zh" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'zh' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('zh')
  })

  it('returns fr when cookie is "fr" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'fr' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('fr')
  })

  it('returns de when cookie is "de" (no x-locale header)', async () => {
    mockCookieGet.mockReturnValue({ value: 'de' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe('de')
  })

  it('returns defaultLocale when cookie is missing (undefined)', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale when cookie value is empty string', async () => {
    mockCookieGet.mockReturnValue({ value: '' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale when cookie value is invalid locale', async () => {
    mockCookieGet.mockReturnValue({ value: 'xx' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for path traversal attempt in cookie', async () => {
    mockCookieGet.mockReturnValue({ value: '../etc/passwd' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for XSS payload in cookie', async () => {
    mockCookieGet.mockReturnValue({ value: '<script>alert(1)</script>' })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returns defaultLocale for null-ish cookie value', async () => {
    mockCookieGet.mockReturnValue({ value: null })
    const { getServerLocale } = await import('@/lib/i18n/server')
    const result = await getServerLocale()
    expect(result).toBe(defaultLocale)
  })

  it('returned locale is always a member of locales tuple', async () => {
    mockCookieGet.mockReturnValue({ value: 'invalid' })
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

  it('returns zh messages for zh locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('zh')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('returns fr messages for fr locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('fr')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('returns de messages for de locale', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const messages = getMessages('de')
    expect(messages).toBeDefined()
    expect(typeof messages.meta.title).toBe('string')
    expect(messages.meta.title.length).toBeGreaterThan(0)
  })

  it('each locale returns distinct meta.title (no cross-contamination)', async () => {
    const { getMessages } = await import('@/lib/i18n/server')
    const ptBR = getMessages('pt-BR')
    const en = getMessages('en')
    const es = getMessages('es')
    const zh = getMessages('zh')
    const fr = getMessages('fr')
    const de = getMessages('de')

    const titles = [
      ptBR.meta.title,
      en.meta.title,
      es.meta.title,
      zh.meta.title,
      fr.meta.title,
      de.meta.title,
    ]
    const uniqueTitles = new Set(titles)
    // All six should be different strings (sanity check — they are distinct translations)
    expect(uniqueTitles.size).toBe(6)
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

describe('toOpenGraphLocale()', () => {
  it('converts pt-BR to pt_BR (hyphen to underscore)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('pt-BR')).toBe('pt_BR')
  })

  it('returns "en" unchanged (no hyphen)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('en')).toBe('en')
  })

  it('returns "es" unchanged (no hyphen)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('es')).toBe('es')
  })

  it('returns "zh" unchanged (no hyphen)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('zh')).toBe('zh')
  })

  it('returns "fr" unchanged (no hyphen)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('fr')).toBe('fr')
  })

  it('returns "de" unchanged (no hyphen)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('de')).toBe('de')
  })

  it('returns a string for every supported locale', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    for (const locale of locales) {
      const result = toOpenGraphLocale(locale)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('output never contains a hyphen (always underscore-separated)', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    for (const locale of locales) {
      const result = toOpenGraphLocale(locale)
      expect(result).not.toContain('-')
    }
  })

  it('is idempotent on locales that are already underscore-free', async () => {
    const { toOpenGraphLocale } = await import('@/lib/i18n/server')
    expect(toOpenGraphLocale('en')).toBe(toOpenGraphLocale('en'))
    expect(toOpenGraphLocale('es')).toBe(toOpenGraphLocale('es'))
  })
})
