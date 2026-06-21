import { cookies, headers } from 'next/headers'
import { type Locale, defaultLocale, locales } from './config'
import ptBR from './messages/pt-BR.json'
import en from './messages/en.json'
import es from './messages/es.json'
import zh from './messages/zh.json'
import fr from './messages/fr.json'
import de from './messages/de.json'

const messages = {
  'pt-BR': ptBR,
  en,
  es,
  zh,
  fr,
  de,
} as const

/**
 * Resolve the locale for the current request (server-side).
 *
 * Source of truth is the `x-locale` header, set by proxy.ts from the URL prefix
 * (/en, /fr...) — this is what the crawler sees and what keeps SSR consistent
 * with the URL. Falls back to the `tablix-locale` cookie (routes the proxy may
 * not cover) and finally to defaultLocale.
 */
export async function getServerLocale(): Promise<Locale> {
  const headerStore = await headers()
  const fromHeader = headerStore.get('x-locale')
  if (fromHeader && locales.includes(fromHeader as Locale)) {
    return fromHeader as Locale
  }

  const cookieStore = await cookies()
  const stored = cookieStore.get('tablix-locale')?.value
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale
  }

  return defaultLocale
}

/**
 * Get messages for a given locale (server-side).
 */
export function getMessages(locale: Locale): typeof ptBR {
  return messages[locale]
}

/**
 * Convert a Locale to OpenGraph locale format (e.g., 'pt-BR' → 'pt_BR').
 */
export function toOpenGraphLocale(locale: Locale): string {
  return locale.replace('-', '_')
}
