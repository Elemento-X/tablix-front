'use client'

/**
 * Root error boundary — renders its own <html> tag, replacing the entire layout.
 * The React i18n context (useLocale/t) is NOT available here because LocaleProvider
 * lives inside the root layout, which this component replaces. CSS tokens are also
 * unavailable (globals.css loads via the root layout) — uses the stone palette
 * directly for Grid Vivo consistency.
 *
 * To still honor the user's language even in a total crash, we read the
 * `tablix-locale` cookie on the client and pick from a small inline dictionary
 * (kept self-contained — no import of the full message bundles). Falls back to
 * pt-BR (defaultLocale) on the server render / when the cookie is missing.
 */

import { useEffect, useState } from 'react'
import { env } from '@/config/env'

// NOTE: kept in sync manually with src/lib/i18n/config.ts `locales`. This module
// is intentionally self-contained (it replaces the root layout + LocaleProvider),
// so it cannot import the bundles. When adding a new locale, add it here too —
// otherwise that locale silently falls back to pt-BR on a root crash.
type Locale = 'pt-BR' | 'en' | 'es' | 'zh' | 'fr' | 'de'

const MESSAGES: Record<
  Locale,
  { title: string; description: string; tryAgain: string; goHome: string }
> = {
  'pt-BR': {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.',
    tryAgain: 'Tentar novamente',
    goHome: 'Voltar ao início',
  },
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try again or go back to the home page.',
    tryAgain: 'Try again',
    goHome: 'Go to home',
  },
  es: {
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado. Intenta de nuevo o vuelve a la página principal.',
    tryAgain: 'Intentar de nuevo',
    goHome: 'Volver al inicio',
  },
  zh: {
    title: '出错了',
    description: '发生了意外错误。请重试或返回首页。',
    tryAgain: '重试',
    goHome: '返回首页',
  },
  fr: {
    title: "Une erreur s'est produite",
    description: "Une erreur inattendue est survenue. Réessayez ou revenez à la page d'accueil.",
    tryAgain: 'Réessayer',
    goHome: "Retour à l'accueil",
  },
  de: {
    title: 'Etwas ist schiefgelaufen',
    description:
      'Ein unerwarteter Fehler ist aufgetreten. Versuchen Sie es erneut oder kehren Sie zur Startseite zurück.',
    tryAgain: 'Erneut versuchen',
    goHome: 'Zur Startseite',
  },
}

const DEFAULT_LOCALE: Locale = 'pt-BR'

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(/(?:^|;\s*)tablix-locale=([^;]+)/)
  const value = match?.[1]
  return value && value in MESSAGES ? (value as Locale) : DEFAULT_LOCALE
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Server render uses defaultLocale; the client effect swaps to the cookie locale.
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    setLocale(readLocaleCookie())
  }, [])

  useEffect(() => {
    if (env.NODE_ENV === 'production') {
      console.error('[RootErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[RootErrorBoundary]', error.message)
    }
  }, [error])

  const t = MESSAGES[locale]

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold text-stone-900">{t.title}</h2>
          <p className="max-w-md text-sm text-stone-500">{t.description}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="min-h-[44px] rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              {t.tryAgain}
            </button>
            <a
              href="/"
              className="flex min-h-[44px] items-center justify-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              {t.goHome}
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
