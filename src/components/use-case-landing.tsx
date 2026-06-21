'use client'

import Link from 'next/link'
import { ArrowRight, Check, Upload, Columns3, Download } from 'lucide-react'
import { useLocale, useLocalizedHref } from '@/lib/i18n'
import { LandingHeader } from '@/components/landing-header'
import { LandingFooter } from '@/components/landing-footer'
import { ComparisonMini } from '@/components/comparison-mini'
import { Button } from '@/components/button'

/**
 * Reusable transactional landing for a use case (e.g. "merge Excel files").
 * Content is data-driven via the `useCases.<key>.*` i18n namespace, so new
 * landings only need a new namespace + a thin route that renders this with the
 * matching `useCaseKey`. Schema (HowTo/FAQ) is emitted server-side by the route.
 */
interface RelatedGuide {
  href: string
  title: string
}

export function UseCaseLanding({
  useCaseKey,
  relatedGuides = [],
}: {
  useCaseKey: string
  relatedGuides?: RelatedGuide[]
}) {
  const { t } = useLocale()
  const lh = useLocalizedHref()
  const k = (suffix: string) => t(`useCases.${useCaseKey}.${suffix}`)

  const benefits = [k('benefit1'), k('benefit2'), k('benefit3')]
  const steps = [
    { icon: Upload, title: k('step1Title'), desc: k('step1Desc') },
    { icon: Columns3, title: k('step2Title'), desc: k('step2Desc') },
    { icon: Download, title: k('step3Title'), desc: k('step3Desc') },
  ]
  const faqs = [
    { q: k('faq1Q'), a: k('faq1A') },
    { q: k('faq2Q'), a: k('faq2A') },
    { q: k('faq3Q'), a: k('faq3A') },
  ]

  return (
    <div className="bg-background min-h-screen">
      <LandingHeader />

      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14">
          <h1 className="text-foreground text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {k('h1')}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg text-balance sm:mt-6">
            {k('intro')}
          </p>

          <ul className="mx-auto mt-8 flex max-w-xl flex-col gap-3 text-left">
            {benefits.map((b) => (
              <li key={b} className="text-foreground flex items-start gap-3 text-sm sm:text-base">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-700 dark:text-teal-500" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link href={lh('/upload')}>
              <Button variant="brand" size="lg" className="h-12 px-8 text-base">
                {k('ctaButton')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </section>

        {/* How to */}
        <section className="border-border bg-muted/30 border-t border-b">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-foreground mb-8 text-center text-xl font-bold sm:text-2xl">
              {k('howToTitle')}
            </h2>
            <ol className="grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => {
                const Icon = s.icon
                return (
                  <li key={s.title} className="border-border bg-card rounded-xl border p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                        {i + 1}
                      </span>
                      <Icon className="text-muted-foreground h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-foreground text-base font-semibold">{s.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{s.desc}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* Comparison teaser (Free vs Pro) — internal link to /pricing */}
        <ComparisonMini />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-foreground mb-8 text-center text-xl font-bold sm:text-2xl">
            {k('faqTitle')}
          </h2>
          <dl className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="border-border border-b pb-6 last:border-0">
                <dt className="text-foreground text-base font-semibold">{f.q}</dt>
                <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Related guides (hub-and-spoke: money page → informational guides) */}
        {relatedGuides.length > 0 && (
          <section className="border-border mx-auto max-w-3xl border-t px-4 py-10 sm:px-6 sm:py-12">
            <h2 className="text-foreground mb-4 text-lg font-bold">
              {t('blog.relatedGuidesTitle')}
            </h2>
            <ul className="space-y-2">
              {relatedGuides.map((g) => (
                <li key={g.href}>
                  <Link
                    href={lh(g.href)}
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  >
                    {g.title}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Final CTA */}
        <section className="border-border mx-auto max-w-3xl border-t px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="text-foreground text-2xl font-bold sm:text-3xl">{k('ctaTitle')}</h2>
          <div className="mt-6">
            <Link href={lh('/upload')}>
              <Button variant="brand" size="lg" className="h-12 px-8 text-base">
                {k('ctaButton')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
