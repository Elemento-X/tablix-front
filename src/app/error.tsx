'use client'

import { useEffect } from 'react'
import { WifiOff, RotateCcw, Home } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useNetworkStatus } from '@/hooks/use-network-status'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary]', error.digest ?? 'unknown')
    } else {
      console.error('[ErrorBoundary]', error.message)
    }
  }, [error])

  const isOffline = !isOnline

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      {isOffline && (
        <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
          <WifiOff className="h-8 w-8 text-amber-700 dark:text-amber-400" />
        </div>
      )}

      <div>
        <h2 className="text-foreground text-xl font-semibold">
          {isOffline ? t('errors.offlineShort') : t('errorBoundary.title')}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          {isOffline ? t('errors.offline') : t('errorBoundary.description')}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={isOffline ? () => window.location.reload() : reset}
          className="bg-foreground text-background hover:bg-foreground/80 flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          {t('errorBoundary.tryAgain')}
        </button>
        <a
          href="/"
          className="border-border text-foreground hover:bg-muted flex min-h-[44px] items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          <Home className="h-4 w-4" />
          {t('errorBoundary.goHome')}
        </a>
      </div>
    </div>
  )
}
