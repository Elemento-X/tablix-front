"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type Locale, defaultLocale } from "./config"
import ptBR from "./messages/pt-BR.json"
import en from "./messages/en.json"
import es from "./messages/es.json"

const messages = {
  "pt-BR": ptBR,
  en: en,
  es: es,
}

type Messages = typeof ptBR

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  messages: Messages
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

const LOCALE_STORAGE_KEY = "tablix-locale"

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".")
  let result = obj

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = result[key]
    } else {
      return path // Return key if not found
    }
  }

  return typeof result === "string" ? result : path
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

  const t = (key: string): string => {
    const currentMessages = messages[locale]
    return getNestedValue(currentMessages, key)
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
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
