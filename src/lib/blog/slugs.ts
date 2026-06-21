import type { Metadata } from 'next'
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config'
import { localizedUrl } from '@/lib/i18n/routing'

/**
 * Localized URL slugs per article (SEO: a keyword-rich URL in the reader's
 * language ranks/CTRs better than a Portuguese slug under /en, /de...).
 *
 * The KEY is the canonical slug = the content directory name = the pt-BR URL.
 * pt-BR is intentionally absent from each map (it always uses the canonical).
 * zh uses an ASCII slug (Chinese-character URLs percent-encode poorly).
 *
 * This code map is the SINGLE SOURCE OF TRUTH for slug↔locale, so hreflang stays
 * perfectly reciprocal (Google drops non-reciprocal hreflang). All functions are
 * pure → fully unit-testable, no filesystem access.
 */
export const SLUG_TRANSLATIONS: Record<string, Partial<Record<Locale, string>>> = {
  'como-juntar-planilhas-no-excel': {
    en: 'how-to-merge-spreadsheets-in-excel',
    es: 'como-unir-hojas-de-calculo-en-excel',
    fr: 'fusionner-feuilles-de-calcul-excel',
    de: 'excel-tabellen-zusammenfuehren',
    zh: 'how-to-merge-excel-spreadsheets',
  },
  'como-combinar-arquivos-csv': {
    en: 'how-to-combine-csv-files',
    es: 'como-combinar-archivos-csv',
    fr: 'combiner-fichiers-csv',
    de: 'csv-dateien-zusammenfuehren',
    zh: 'how-to-combine-csv-files',
  },
  'como-unir-varias-planilhas': {
    en: 'how-to-combine-multiple-spreadsheets',
    es: 'como-unir-varias-hojas-de-calculo',
    fr: 'regrouper-plusieurs-feuilles-de-calcul',
    de: 'mehrere-tabellen-zusammenfuehren',
    zh: 'how-to-combine-multiple-spreadsheets',
  },
  'csv-ou-xlsx-qual-usar': {
    en: 'csv-vs-xlsx',
    es: 'csv-o-xlsx',
    fr: 'csv-ou-xlsx',
    de: 'csv-oder-xlsx',
    zh: 'csv-vs-xlsx',
  },
}

/** Localized URL slug for a canonical slug + locale (pt-BR → canonical itself). */
export function localizedBlogSlug(canonical: string, locale: Locale): string {
  if (locale === defaultLocale) return canonical
  return SLUG_TRANSLATIONS[canonical]?.[locale] ?? canonical
}

/**
 * Rewrite an internal `/blog/<canonical>` href to the locale's localized slug.
 * Authors write cross-links with the canonical (pt-BR) slug; under /en, /de... the
 * canonical slug 404s, so links must be remapped to the localized slug. Non-blog
 * or already-localized hrefs pass through unchanged.
 */
export function localizeBlogHref(href: string, locale: Locale): string {
  const match = /^\/blog\/([a-z0-9-]+)\/?$/.exec(href)
  if (!match) return href
  const slug = match[1]
  return SLUG_TRANSLATIONS[slug] ? `/blog/${localizedBlogSlug(slug, locale)}` : href
}

/**
 * Reverse a URL slug back to its canonical (directory) slug for a locale.
 * - default locale: the URL slug IS the canonical.
 * - other locales: must match a mapped localized slug, else null (so the
 *   Portuguese slug under /en 404s instead of duplicating content).
 */
export function canonicalFromLocalizedSlug(urlSlug: string, locale: Locale): string | null {
  if (locale === defaultLocale) return urlSlug
  for (const [canonical, map] of Object.entries(SLUG_TRANSLATIONS)) {
    if (map[locale] === urlSlug) return canonical
  }
  // Article without a translation entry falls back to the canonical slug.
  return SLUG_TRANSLATIONS[urlSlug] ? null : urlSlug
}

/**
 * Build Metadata.alternates for a blog article from its canonical slug, using the
 * localized slug for every locale. Self-canonical + reciprocal hreflang set.
 */
export function blogArticleAlternates(
  canonical: string,
  currentLocale: Locale,
): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = localizedUrl(loc, `/blog/${localizedBlogSlug(canonical, loc)}`)
  }
  languages['x-default'] = localizedUrl(defaultLocale, `/blog/${canonical}`)

  return {
    canonical: localizedUrl(currentLocale, `/blog/${localizedBlogSlug(canonical, currentLocale)}`),
    languages,
  }
}
