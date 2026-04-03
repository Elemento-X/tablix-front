'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'

export default function NotFound() {
  const { t } = useLocale()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-teal-100 p-4 dark:bg-teal-900/30">
        <span className="text-3xl font-bold text-teal-700 dark:text-teal-400">
          404
        </span>
      </div>
      <h2 className="text-foreground text-xl font-semibold">
        {t('notFound.title')}
      </h2>
      <p className="text-muted-foreground max-w-md text-sm">
        {t('notFound.description')}
      </p>
      <Link
        href="/"
        className="bg-foreground text-background hover:bg-foreground/80 min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        {t('notFound.goHome')}
      </Link>
    </div>
  )
}
