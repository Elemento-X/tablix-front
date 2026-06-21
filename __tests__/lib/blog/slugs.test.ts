import {
  SLUG_TRANSLATIONS,
  localizedBlogSlug,
  canonicalFromLocalizedSlug,
  blogArticleAlternates,
} from '@/lib/blog/slugs'
import { locales, defaultLocale } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/constants'

const CANONICAL = 'como-juntar-planilhas-no-excel'

describe('SLUG_TRANSLATIONS integrity', () => {
  it('every localized slug is URL-safe ([a-z0-9-])', () => {
    for (const map of Object.values(SLUG_TRANSLATIONS)) {
      for (const slug of Object.values(map)) {
        expect(slug).toMatch(/^[a-z0-9-]+$/)
      }
    }
  })

  it('never maps a localized slug to the default locale (pt-BR uses canonical)', () => {
    for (const map of Object.values(SLUG_TRANSLATIONS)) {
      expect(map[defaultLocale]).toBeUndefined()
    }
  })

  it('has no slug collisions within a single locale', () => {
    for (const loc of locales) {
      const slugs = Object.values(SLUG_TRANSLATIONS)
        .map((m) => m[loc])
        .filter(Boolean)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })
})

describe('localizedBlogSlug', () => {
  it('returns the canonical slug for the default locale', () => {
    expect(localizedBlogSlug(CANONICAL, defaultLocale)).toBe(CANONICAL)
  })

  it('returns the mapped slug for a translated locale', () => {
    expect(localizedBlogSlug(CANONICAL, 'en')).toBe('how-to-merge-spreadsheets-in-excel')
    expect(localizedBlogSlug('csv-ou-xlsx-qual-usar', 'de')).toBe('csv-oder-xlsx')
  })

  it('falls back to the canonical slug for an unmapped article', () => {
    expect(localizedBlogSlug('artigo-sem-traducao', 'en')).toBe('artigo-sem-traducao')
  })
})

describe('canonicalFromLocalizedSlug', () => {
  it('returns the input slug for the default locale', () => {
    expect(canonicalFromLocalizedSlug(CANONICAL, defaultLocale)).toBe(CANONICAL)
  })

  it('reverses a localized slug back to the canonical', () => {
    expect(canonicalFromLocalizedSlug('how-to-merge-spreadsheets-in-excel', 'en')).toBe(CANONICAL)
    expect(canonicalFromLocalizedSlug('csv-oder-xlsx', 'de')).toBe('csv-ou-xlsx-qual-usar')
  })

  it('returns null when a translated article is requested via its canonical slug (avoid duplicate content)', () => {
    // The pt-BR slug must NOT resolve under /en — only the localized slug does.
    expect(canonicalFromLocalizedSlug(CANONICAL, 'en')).toBeNull()
  })

  it('returns the slug itself for an unmapped article under a non-default locale', () => {
    expect(canonicalFromLocalizedSlug('artigo-sem-traducao', 'en')).toBe('artigo-sem-traducao')
  })

  it('round-trips localized → canonical → localized for every locale', () => {
    for (const canonical of Object.keys(SLUG_TRANSLATIONS)) {
      for (const loc of locales) {
        const localized = localizedBlogSlug(canonical, loc)
        expect(canonicalFromLocalizedSlug(localized, loc)).toBe(canonical)
      }
    }
  })
})

describe('blogArticleAlternates', () => {
  const alt = blogArticleAlternates(CANONICAL, 'en')

  it('self-canonical points at the current locale localized URL', () => {
    expect(alt?.canonical).toBe(`${SITE_URL}/en/blog/how-to-merge-spreadsheets-in-excel`)
  })

  it('includes all locales plus x-default', () => {
    const langs = alt?.languages as Record<string, string>
    for (const loc of locales) expect(langs[loc]).toBeDefined()
    expect(langs['x-default']).toBe(`${SITE_URL}/blog/${CANONICAL}`)
  })

  it('each locale alternate uses its own localized slug (reciprocal hreflang)', () => {
    const langs = alt?.languages as Record<string, string>
    expect(langs['pt-BR']).toBe(`${SITE_URL}/blog/${CANONICAL}`)
    expect(langs.en).toBe(`${SITE_URL}/en/blog/how-to-merge-spreadsheets-in-excel`)
    expect(langs.de).toBe(`${SITE_URL}/de/blog/excel-tabellen-zusammenfuehren`)
  })
})
