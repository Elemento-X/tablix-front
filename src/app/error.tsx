'use client'

import { useEffect } from 'react'
import { useLocale } from '@/lib/i18n'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[ErrorBoundary]', error.message)
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {t('errorBoundary.title')}
      </h2>
      <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {t('errorBoundary.description')}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {t('errorBoundary.tryAgain')}
        </button>
        <a
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t('errorBoundary.goHome')}
        </a>
      </div>
    </div>
  )
}
