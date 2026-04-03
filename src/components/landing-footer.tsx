'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { scrollToSection } from '@/components/landing-header-nav'

export function LandingFooter() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  const productLinks = [
    { label: t('footer.product.howItWorks'), section: 'how-it-works' },
    { label: t('footer.product.audience'), section: 'audience' },
    { label: t('footer.product.pricing'), section: 'pricing' },
  ]

  return (
    <footer className="bg-muted border-border border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 md:grid-cols-4 md:gap-12">
          <div className="md:col-span-2">
            <span className="text-foreground text-lg font-semibold">
              {t('header.brand')}
            </span>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <nav aria-label={t('footer.nav.product')}>
            <h3 className="text-foreground mb-4 text-sm font-semibold">
              {t('footer.product.title')}
            </h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.section}>
                  <a
                    href={`/#${link.section}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToSection(link.section, prefersReducedMotion)
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/upload"
                  className="text-primary hover:text-primary/80 text-sm transition-colors"
                >
                  {t('footer.product.cta')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.nav.legal')}>
            <h3 className="text-foreground mb-4 text-sm font-semibold">
              {t('footer.legal.title')}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contato@tablix.me"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t('footer.contact.email')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <hr className="border-border mt-10 mb-6" />

        <p className="text-muted-foreground/70 text-xs">
          {t('footer.copyright', {
            year: new Date().getFullYear().toString(),
          })}
        </p>
      </div>
    </footer>
  )
}
