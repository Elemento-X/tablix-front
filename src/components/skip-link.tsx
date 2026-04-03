'use client'

import { useLocale } from '@/lib/i18n'

export function SkipLink() {
  const { t } = useLocale()

  return (
    <a
      href="#main-content"
      className="bg-background text-foreground border-border fixed top-0 left-0 z-[9999] -translate-y-full border px-4 py-2 text-sm font-medium transition-transform focus:translate-y-0"
    >
      {t('a11y.skipToContent')}
    </a>
  )
}
