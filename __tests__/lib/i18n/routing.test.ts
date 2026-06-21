import {
  isValidLocale,
  localizedPath,
  localizedUrl,
  stripLocale,
  buildAlternates,
} from '@/lib/i18n/routing'
import { locales, defaultLocale } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/constants'

describe('i18n routing utils', () => {
  describe('isValidLocale', () => {
    it('accepts every declared locale', () => {
      for (const loc of locales) expect(isValidLocale(loc)).toBe(true)
    })
    it('rejects unknown / malformed values', () => {
      expect(isValidLocale('xx')).toBe(false)
      expect(isValidLocale('')).toBe(false)
      expect(isValidLocale(undefined)).toBe(false)
      expect(isValidLocale(null)).toBe(false)
      expect(isValidLocale('../etc/passwd')).toBe(false)
      expect(isValidLocale('EN')).toBe(false) // case-sensitive
    })
  })

  describe('localizedPath', () => {
    it('default locale (pt-BR) keeps path at root, no prefix', () => {
      expect(localizedPath('pt-BR', '/')).toBe('/')
      expect(localizedPath('pt-BR', '/pricing')).toBe('/pricing')
      expect(localizedPath('pt-BR')).toBe('/')
    })
    it('non-default locale gets prefixed', () => {
      expect(localizedPath('en', '/')).toBe('/en')
      expect(localizedPath('en', '/pricing')).toBe('/en/pricing')
      expect(localizedPath('fr', '/privacy-policy')).toBe('/fr/privacy-policy')
      expect(localizedPath('zh', '/')).toBe('/zh')
    })
    it('normalizes missing leading slash and trailing slash', () => {
      expect(localizedPath('en', 'pricing')).toBe('/en/pricing')
      expect(localizedPath('en', '/pricing/')).toBe('/en/pricing')
      expect(localizedPath('pt-BR', '/pricing/')).toBe('/pricing')
    })
  })

  describe('localizedUrl', () => {
    it('prepends SITE_URL', () => {
      expect(localizedUrl('pt-BR', '/')).toBe(`${SITE_URL}/`)
      expect(localizedUrl('en', '/pricing')).toBe(`${SITE_URL}/en/pricing`)
    })
  })

  describe('stripLocale', () => {
    it('removes a leading locale prefix', () => {
      expect(stripLocale('/en/pricing')).toBe('/pricing')
      expect(stripLocale('/fr/privacy-policy')).toBe('/privacy-policy')
      expect(stripLocale('/en')).toBe('/')
      expect(stripLocale('/zh')).toBe('/')
    })
    it('leaves pt-BR (unprefixed) paths untouched', () => {
      expect(stripLocale('/pricing')).toBe('/pricing')
      expect(stripLocale('/')).toBe('/')
    })
    it('does not strip a non-locale first segment', () => {
      expect(stripLocale('/pricing/details')).toBe('/pricing/details')
      expect(stripLocale('/upload')).toBe('/upload')
    })
  })

  describe('buildAlternates', () => {
    it('canonical points at the current locale URL', () => {
      const alt = buildAlternates('en', '/pricing')
      expect(alt?.canonical).toBe(`${SITE_URL}/en/pricing`)
      const ptAlt = buildAlternates('pt-BR', '/pricing')
      expect(ptAlt?.canonical).toBe(`${SITE_URL}/pricing`)
    })
    it('languages map covers all locales + x-default', () => {
      const alt = buildAlternates('pt-BR', '/')
      const langs = alt?.languages as Record<string, string>
      for (const loc of locales) {
        expect(langs[loc]).toBe(`${SITE_URL}${loc === defaultLocale ? '/' : '/' + loc}`)
      }
      expect(langs['x-default']).toBe(`${SITE_URL}/`)
    })
    it('x-default always maps to the default locale (pt-BR) version', () => {
      const alt = buildAlternates('de', '/terms')
      const langs = alt?.languages as Record<string, string>
      expect(langs['x-default']).toBe(`${SITE_URL}/terms`)
      expect(langs['de']).toBe(`${SITE_URL}/de/terms`)
      expect(langs['pt-BR']).toBe(`${SITE_URL}/terms`)
    })
    it('is reciprocal — every locale resolvable from any page', () => {
      const fromEn = buildAlternates('en', '/') as { languages: Record<string, string> }
      const fromFr = buildAlternates('fr', '/') as { languages: Record<string, string> }
      // Both pages list the same set of language URLs (reciprocity).
      expect(fromEn.languages).toEqual(fromFr.languages)
    })
  })
})
