/**
 * Tests for generateMetadata() in src/app/layout.tsx
 * Validates: OG tags, Twitter tags, canonical, hreflang, no generator field,
 * robots config, and locale-aware title/description
 */

// Mock next/headers before importing layout
const mockGet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: mockGet }),
  headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
}))

// Mock next/font/google to avoid network calls in tests
jest.mock('next/font/google', () => ({
  Geist: () => ({ className: 'mock-geist', subsets: [] }),
  Geist_Mono: () => ({ className: 'mock-geist-mono', subsets: [] }),
}))

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}))

jest.mock('sonner', () => ({
  Toaster: () => null,
}))

describe('generateMetadata()', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    // Re-apply mocks after resetModules
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
      headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
    }))
  })

  async function getMetadata(locale?: string) {
    mockGet.mockReturnValue(locale ? { value: locale } : undefined)
    const { generateMetadata } = await import('@/app/layout')
    return generateMetadata()
  }

  it('returns an object', async () => {
    const result = await getMetadata('pt-BR')
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('does not include generator field', async () => {
    const result = await getMetadata('pt-BR')
    expect((result as Record<string, unknown>).generator).toBeUndefined()
  })

  it('returns title from pt-BR messages when locale is pt-BR', async () => {
    const result = await getMetadata('pt-BR')
    expect(typeof result.title).toBe('string')
    expect((result.title as string).length).toBeGreaterThan(0)
  })

  it('returns title from en messages when locale is en', async () => {
    const ptResult = await getMetadata('pt-BR')
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
      headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
    }))
    const enResult = await getMetadata('en')
    // Titles should differ between locales
    expect(ptResult.title).not.toBe(enResult.title)
  })

  it('returns description from messages', async () => {
    const result = await getMetadata('pt-BR')
    expect(typeof result.description).toBe('string')
    expect((result.description as string).length).toBeGreaterThan(0)
  })

  it('includes metadataBase pointing to tablix.me', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.metadataBase).toBeDefined()
    expect(result.metadataBase?.toString()).toContain('tablix.me')
  })

  it('includes alternates.canonical', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.alternates?.canonical).toBeDefined()
  })

  it('does not include hreflang languages (no locale-based routing)', async () => {
    // hreflang requires different URLs per locale. Since Tablix uses
    // client-side locale switching without URL-based routing, hreflang
    // is intentionally omitted to avoid sending incorrect signals to crawlers.
    const result = await getMetadata('pt-BR')
    expect(result.alternates?.languages).toBeUndefined()
  })

  it('includes openGraph object', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.openGraph).toBeDefined()
  })

  it('openGraph type is "website"', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.openGraph?.type).toBe('website')
  })

  it('openGraph siteName is "Tablix"', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.openGraph?.siteName).toBe('Tablix')
  })

  it('openGraph url points to tablix.me', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.openGraph?.url?.toString()).toContain('tablix.me')
  })

  it('openGraph locale for pt-BR is pt_BR', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('openGraph locale for en is en', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
      headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
    }))
    const result = await getMetadata('en')
    expect(result.openGraph?.locale).toBe('en')
  })

  it('includes twitter card config', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.twitter).toBeDefined()
  })

  it('twitter card is "summary_large_image"', async () => {
    const result = await getMetadata('pt-BR')
    expect(result.twitter?.card).toBe('summary_large_image')
  })

  it('twitter title is set', async () => {
    const result = await getMetadata('pt-BR')
    expect(typeof result.twitter?.title).toBe('string')
    expect((result.twitter?.title as string).length).toBeGreaterThan(0)
  })

  it('twitter description is set', async () => {
    const result = await getMetadata('pt-BR')
    expect(typeof result.twitter?.description).toBe('string')
    expect((result.twitter?.description as string).length).toBeGreaterThan(0)
  })

  it('robots config allows indexing', async () => {
    const result = await getMetadata('pt-BR')
    const robots = result.robots as Record<string, unknown>
    expect(robots?.index).toBe(true)
    expect(robots?.follow).toBe(true)
  })

  it('robots googleBot config is set', async () => {
    const result = await getMetadata('pt-BR')
    const robots = result.robots as Record<string, unknown>
    expect(robots?.googleBot).toBeDefined()
  })

  it('falls back to pt-BR when no cookie is set', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
      headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
    }))
    mockGet.mockReturnValue(undefined)
    const { generateMetadata } = await import('@/app/layout')
    const result = await generateMetadata()
    // openGraph locale for pt-BR is pt_BR
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('falls back to pt-BR for invalid cookie locale', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
      headers: () => Promise.resolve({ get: jest.fn().mockReturnValue('') }),
    }))
    mockGet.mockReturnValue({ value: 'zh-CN' })
    const { generateMetadata } = await import('@/app/layout')
    const result = await generateMetadata()
    expect(result.openGraph?.locale).toBe('pt_BR')
  })
})
