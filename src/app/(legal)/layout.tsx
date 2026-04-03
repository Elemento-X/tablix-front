'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LanguageSelector } from '@/components/language-selector'
import { useLocale } from '@/lib/i18n'

export default function LegalLayout({ children }: { children: ReactNode }) {
  const { t } = useLocale()

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('legal.backToHome')}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex gap-4 text-sm">
              <Link
                href="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.terms')}
              </Link>
            </div>
            <p className="text-muted-foreground text-xs">
              {t('footer.copyright', {
                year: new Date().getFullYear().toString(),
              })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
