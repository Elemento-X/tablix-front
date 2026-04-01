'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { type Locale, defaultLocale } from './config'
import ptBR from './messages/pt-BR.json'
import en from './messages/en.json'
import es from './messages/es.json'

const messages = {
  'pt-BR': ptBR,
  en,
  es,
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isClient, setIsClient] = useState(false)

  // Initialize locale from localStorage on client side
  useEffect(() => {
    setIsClient(true)
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    if (stored && stored in messages) {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (isClient) {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
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

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
