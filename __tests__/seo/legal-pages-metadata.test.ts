/**
 * Tests for generateMetadata() in legal pages:
 *   - src/app/(legal)/privacy-policy/page.tsx
 *   - src/app/(legal)/terms/page.tsx
 *
 * Validates: title, description, canonical URL, openGraph fields,
 * locale-awareness (pt-BR / en / es), and fallback behavior.
 */

import ptBR from '@/lib/i18n/messages/pt-BR.json'
import en from '@/lib/i18n/messages/en.json'
import es from '@/lib/i18n/messages/es.json'
import { SITE_URL } from '@/lib/constants'

// Must mock next/headers BEFORE importing any module that calls it
const mockGet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: mockGet }),
}))

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getPrivacyMetadata(locale?: string) {
  mockGet.mockReturnValue(locale ? { value: locale } : undefined)
  const { generateMetadata } = await import(
    '@/app/(legal)/privacy-policy/page'
  )
  return generateMetadata()
}

async function getTermsMetadata(locale?: string) {
  mockGet.mockReturnValue(locale ? { value: locale } : undefined)
  const { generateMetadata } = await import('@/app/(legal)/terms/page')
  return generateMetadata()
}

// ─── Privacy Policy generateMetadata ─────────────────────────────────────────

describe('generateMetadata() — PrivacyPolicyPage', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
  })

  it('returns an object', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('title matches messages.meta.privacyTitle for pt-BR', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.title).toBe(ptBR.meta.privacyTitle)
  })

  it('title matches messages.meta.privacyTitle for en', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata('en')
    expect(result.title).toBe(en.meta.privacyTitle)
  })

  it('title matches messages.meta.privacyTitle for es', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata('es')
    expect(result.title).toBe(es.meta.privacyTitle)
  })

  it('description matches messages.meta.privacyDescription for pt-BR', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.description).toBe(ptBR.meta.privacyDescription)
  })

  it('description matches messages.meta.privacyDescription for en', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata('en')
    expect(result.description).toBe(en.meta.privacyDescription)
  })

  it('canonical URL is SITE_URL/privacy-policy', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.alternates?.canonical).toBe(`${SITE_URL}/privacy-policy`)
  })

  it('openGraph type is "website"', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.type).toBe('website')
  })

  it('openGraph siteName is "Tablix"', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.siteName).toBe('Tablix')
  })

  it('openGraph url is SITE_URL/privacy-policy', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.url).toBe(`${SITE_URL}/privacy-policy`)
  })

  it('openGraph title matches privacyTitle for pt-BR', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.title).toBe(ptBR.meta.privacyTitle)
  })

  it('openGraph description matches privacyDescription for pt-BR', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.description).toBe(ptBR.meta.privacyDescription)
  })

  it('openGraph locale is pt_BR for pt-BR cookie', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('openGraph locale is "en" for en cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata('en')
    expect(result.openGraph?.locale).toBe('en')
  })

  it('openGraph locale is "es" for es cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata('es')
    expect(result.openGraph?.locale).toBe('es')
  })

  it('falls back to pt-BR when no cookie is present', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getPrivacyMetadata(undefined)
    expect(result.title).toBe(ptBR.meta.privacyTitle)
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('falls back to pt-BR for an invalid locale cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    mockGet.mockReturnValue({ value: 'zh-CN' })
    const { generateMetadata } = await import(
      '@/app/(legal)/privacy-policy/page'
    )
    const result = await generateMetadata()
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('title is a non-empty string', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(typeof result.title).toBe('string')
    expect((result.title as string).length).toBeGreaterThan(0)
  })

  it('description is a non-empty string', async () => {
    const result = await getPrivacyMetadata('pt-BR')
    expect(typeof result.description).toBe('string')
    expect((result.description as string).length).toBeGreaterThan(0)
  })

  it('title differs between pt-BR and en', async () => {
    const ptResult = await getPrivacyMetadata('pt-BR')
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const enResult = await getPrivacyMetadata('en')
    expect(ptResult.title).not.toBe(enResult.title)
  })
})

// ─── Terms generateMetadata ───────────────────────────────────────────────────

describe('generateMetadata() — TermsPage', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
  })

  it('returns an object', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('title matches messages.meta.termsTitle for pt-BR', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.title).toBe(ptBR.meta.termsTitle)
  })

  it('title matches messages.meta.termsTitle for en', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata('en')
    expect(result.title).toBe(en.meta.termsTitle)
  })

  it('title matches messages.meta.termsTitle for es', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata('es')
    expect(result.title).toBe(es.meta.termsTitle)
  })

  it('description matches messages.meta.termsDescription for pt-BR', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.description).toBe(ptBR.meta.termsDescription)
  })

  it('description matches messages.meta.termsDescription for en', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata('en')
    expect(result.description).toBe(en.meta.termsDescription)
  })

  it('canonical URL is SITE_URL/terms', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.alternates?.canonical).toBe(`${SITE_URL}/terms`)
  })

  it('openGraph type is "website"', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.type).toBe('website')
  })

  it('openGraph siteName is "Tablix"', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.siteName).toBe('Tablix')
  })

  it('openGraph url is SITE_URL/terms', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.url).toBe(`${SITE_URL}/terms`)
  })

  it('openGraph title matches termsTitle for pt-BR', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.title).toBe(ptBR.meta.termsTitle)
  })

  it('openGraph description matches termsDescription for pt-BR', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.description).toBe(ptBR.meta.termsDescription)
  })

  it('openGraph locale is pt_BR for pt-BR cookie', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('openGraph locale is "en" for en cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata('en')
    expect(result.openGraph?.locale).toBe('en')
  })

  it('openGraph locale is "es" for es cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata('es')
    expect(result.openGraph?.locale).toBe('es')
  })

  it('falls back to pt-BR when no cookie is present', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const result = await getTermsMetadata(undefined)
    expect(result.title).toBe(ptBR.meta.termsTitle)
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('falls back to pt-BR for an invalid locale cookie', async () => {
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    mockGet.mockReturnValue({ value: 'fr-FR' })
    const { generateMetadata } = await import('@/app/(legal)/terms/page')
    const result = await generateMetadata()
    expect(result.openGraph?.locale).toBe('pt_BR')
  })

  it('title is a non-empty string', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(typeof result.title).toBe('string')
    expect((result.title as string).length).toBeGreaterThan(0)
  })

  it('description is a non-empty string', async () => {
    const result = await getTermsMetadata('pt-BR')
    expect(typeof result.description).toBe('string')
    expect((result.description as string).length).toBeGreaterThan(0)
  })

  it('title differs between pt-BR and en', async () => {
    const ptResult = await getTermsMetadata('pt-BR')
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockGet }),
    }))
    const enResult = await getTermsMetadata('en')
    expect(ptResult.title).not.toBe(enResult.title)
  })

  it('privacy-policy and terms canonical URLs are distinct', async () => {
    const termsResult = await getTermsMetadata('pt-BR')
    expect(termsResult.alternates?.canonical).not.toBe(
      `${SITE_URL}/privacy-policy`,
    )
    expect(termsResult.alternates?.canonical).toBe(`${SITE_URL}/terms`)
  })
})
