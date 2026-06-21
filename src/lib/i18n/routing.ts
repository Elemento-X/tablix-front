import type { Metadata } from 'next'
import { locales, defaultLocale, type Locale } from './config'
import { SITE_URL } from '@/lib/constants'

/**
 * URL routing utilities for locale-prefixed i18n.
 *
 * Scheme (DEC-1): default locale (pt-BR) lives at the ROOT (`/`, `/pricing`),
 * every other locale is prefixed (`/en`, `/en/pricing`, `/fr/pricing`...).
 * This keeps the already-indexed pt-BR URLs unchanged (zero 301s) while making
 * the other 5 languages independently crawlable + hreflang-annotated.
 *
 * These are pure functions (no Next runtime) so they're fully unit-testable.
 */

/** Type guard: is `value` one of the supported locales? Guards the [locale] segment. */
export function isValidLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value)
}

/**
 * Normalize a path to always start with "/" and never end with a trailing "/"
 * (except the root which is "/").
 */
function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const withLeading = path.startsWith('/') ? path : `/${path}`
  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading
}

/**
 * Localized PATH for a given locale (no domain).
 * pt-BR → path as-is ("/", "/pricing"); others → "/{locale}" + path
 * ("/en", "/en/pricing"). The root for a non-default locale is just "/{locale}".
 */
export function localizedPath(locale: Locale, path: string = '/'): string {
  const p = normalizePath(path)
  if (locale === defaultLocale) return p
  return p === '/' ? `/${locale}` : `/${locale}${p}`
}

/**
 * Absolute localized URL (SITE_URL + localizedPath).
 * The root path collapses to the bare domain (no trailing slash) to match how
 * Next normalizes canonical URLs and to avoid duplicate-content ambiguity.
 */
export function localizedUrl(locale: Locale, path: string = '/'): string {
  const p = localizedPath(locale, path)
  return p === '/' ? SITE_URL : `${SITE_URL}${p}`
}

/**
 * Remove a leading locale segment from a pathname, returning the path WITHOUT
 * locale (always starting with "/"). "/en/pricing" → "/pricing", "/en" → "/",
 * "/pricing" → "/pricing" (pt-BR has no prefix), "/" → "/".
 */
export function stripLocale(pathname: string): string {
  const p = normalizePath(pathname)
  const segments = p.split('/').filter(Boolean) // ["en","pricing"]
  if (segments.length > 0 && isValidLocale(segments[0])) {
    const rest = segments.slice(1).join('/')
    return rest ? `/${rest}` : '/'
  }
  return p
}

/**
 * Build Next.js Metadata.alternates for a page, given the CURRENT locale and the
 * locale-free path. Produces a self-canonical + a complete, reciprocal set of
 * hreflang languages (all 6 locales) plus x-default → defaultLocale (pt-BR).
 *
 * Reciprocity is guaranteed because every page derives its alternates from this
 * single source (Google ignores non-reciprocal hreflang).
 */
export function buildAlternates(currentLocale: Locale, path: string = '/'): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = localizedUrl(loc, path)
  }
  // x-default points at the default locale version (pt-BR at root).
  languages['x-default'] = localizedUrl(defaultLocale, path)

  return {
    canonical: localizedUrl(currentLocale, path),
    languages,
  }
}
