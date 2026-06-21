'use client'

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Locale, defaultLocale } from './config'
import { localizedPath } from './routing'
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
}

type Messages = typeof ptBR

type InterpolationValues = Record<string, string | number>

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: InterpolationValues) => string
  messages: Messages
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

const LOCALE_STORAGE_KEY = 'tablix-locale'
const LOCALE_COOKIE_KEY = 'tablix-locale'

function setLocaleCookie(value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_COOKIE_KEY}=${value}; path=/; max-age=31536000; SameSite=Strict${secure}`
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return key if not found
    }
  }

  return typeof result === 'string' ? result : path
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  // URL (via initialLocale, resolved server-side from the path prefix) is the
  // source of truth — no flash of hydration. Falls back to defaultLocale.
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale)
  const [isClient, setIsClient] = useState(false)

  // Keep the cookie in sync with the active locale (used by the landing-page
  // language suggestion). We do NOT override the URL locale with localStorage.
  useEffect(() => {
    setIsClient(true)
    setLocaleCookie(initialLocale ?? defaultLocale)
  }, [initialLocale])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (isClient) {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
      setLocaleCookie(newLocale)
      document.documentElement.lang = newLocale
    }
  }

  const t = (key: string, values?: InterpolationValues): string => {
    const currentMessages = messages[locale]
    let result = getNestedValue(currentMessages, key)

    // Interpolate values if provided
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }

    return result
  }

  const value: LocaleContextType = {
    locale,
    setLocale,
    t,
    messages: messages[locale],
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

/**
 * Returns a function that localizes an internal path for the current locale.
 * Use for every internal href/Link so navigation stays within the active
 * language (e.g. in /en, `lh('/pricing')` → `/en/pricing`).
 */
export function useLocalizedHref() {
  const { locale } = useLocale()
  return (path: string) => localizedPath(locale, path)
}
