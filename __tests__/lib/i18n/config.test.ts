import {
  locales,
  defaultLocale,
  localeNames,
  type Locale,
} from '@/lib/i18n/config'

describe('i18n config', () => {
  describe('locales', () => {
    it('should have pt-BR, en, and es locales', () => {
      expect(locales).toContain('pt-BR')
      expect(locales).toContain('en')
      expect(locales).toContain('es')
    })

    it('should have exactly 3 locales', () => {
      expect(locales).toHaveLength(3)
    })

    it('should be a readonly tuple', () => {
      // TypeScript enforces readonly at compile time via "as const"
      // At runtime, we just verify the array exists and has expected values
      expect(Array.isArray(locales)).toBe(true)
      expect(locales.length).toBe(3)
    })
  })

  describe('defaultLocale', () => {
    it('should be pt-BR', () => {
      expect(defaultLocale).toBe('pt-BR')
    })

    it('should be included in locales', () => {
      expect(locales).toContain(defaultLocale)
    })
  })

  describe('localeNames', () => {
    it('should have correct name for pt-BR', () => {
      expect(localeNames['pt-BR']).toBe('Português')
    })

    it('should have correct name for en', () => {
      expect(localeNames.en).toBe('English')
    })

    it('should have correct name for es', () => {
      expect(localeNames.es).toBe('Español')
    })

    it('should have names for all locales', () => {
      for (const locale of locales) {
        expect(localeNames[locale]).toBeDefined()
        expect(typeof localeNames[locale]).toBe('string')
        expect(localeNames[locale].length).toBeGreaterThan(0)
      }
    })
  })

  describe('Locale type', () => {
    it('should accept valid locale values', () => {
      const validLocales: Locale[] = ['pt-BR', 'en', 'es']
      expect(validLocales).toHaveLength(3)
    })
  })
})
