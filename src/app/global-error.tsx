'use client'

/**
 * Root error boundary — renders its own <html> tag, replacing the entire layout.
 * i18n (useLocale/t) is NOT available here because LocaleProvider lives inside
 * the root layout, which this component replaces. Strings are hardcoded in pt-BR
 * as a deliberate fallback. This is a known Next.js App Router limitation.
 * Approved by project owner (Maclean) — 2026-03-29.
 *
 * CSS tokens are NOT available either (globals.css loads via the root layout).
 * Uses stone palette directly for Grid Vivo consistency.
 */

import { useEffect } from 'react'
import { env } from '@/config/env'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (env.NODE_ENV === 'production') {
      console.error('[RootErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[RootErrorBoundary]', error.message)
    }
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold text-stone-900">
            Algo deu errado
          </h2>
          <p className="max-w-md text-sm text-stone-500">
            Ocorreu um erro inesperado. Tente novamente ou volte para a página
            inicial.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="min-h-[44px] rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Tentar novamente
            </button>
            <a
              href="/"
              className="flex min-h-[44px] items-center justify-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
