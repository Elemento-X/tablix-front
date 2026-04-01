'use client'

import { useEffect } from 'react'
import { useLocale } from '@/lib/i18n'

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[UploadErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[UploadErrorBoundary]', error.message)
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-foreground text-xl font-semibold">
        {t('errorBoundary.uploadTitle')}
      </h2>
      <p className="text-muted-foreground max-w-md text-sm">
        {t('errorBoundary.uploadDescription')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="bg-foreground text-background hover:bg-foreground/80 min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          {t('errorBoundary.tryAgain')}
        </button>
        <a
          href="/"
          className="border-border text-foreground hover:bg-muted flex min-h-[44px] items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          {t('errorBoundary.goHome')}
        </a>
      </div>
    </div>
  )
}
