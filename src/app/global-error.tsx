'use client'

/**
 * Root error boundary — renders its own <html> tag, replacing the entire layout.
 * i18n (useLocale/t) is NOT available here because LocaleProvider lives inside
 * the root layout, which this component replaces. Strings are hardcoded in pt-BR
 * as a deliberate fallback. This is a known Next.js App Router limitation.
 * Approved by project owner (Maclean) — 2026-03-29.
 */

import { useEffect } from 'react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[RootErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[RootErrorBoundary]', error.message)
    }
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold">Algo deu errado</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Ocorreu um erro inesperado. Tente novamente ou volte para a página
            inicial.
          </p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Tentar novamente
            </button>
            <a
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
