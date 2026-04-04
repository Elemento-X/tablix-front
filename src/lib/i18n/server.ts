import { cookies } from 'next/headers'
import { type Locale, defaultLocale, locales } from './config'
import ptBR from './messages/pt-BR.json'
import en from './messages/en.json'
import es from './messages/es.json'

const messages = {
  'pt-BR': ptBR,
  en,
  es,
} as const

/**
 * Read the user's locale preference from the cookie (server-side).
 * Falls back to defaultLocale if cookie is missing or invalid.
 */
export async function getServerLocale(): Promise<Locale> {
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
