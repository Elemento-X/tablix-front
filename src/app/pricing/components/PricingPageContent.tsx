'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { LandingHeader } from '@/components/landing-header'
import { LandingFooter } from '@/components/landing-footer'
import { PricingSection } from '@/components/pricing-section'
import { Button } from '@/components/button'

const ComparisonTable = dynamic(() =>
  import('./ComparisonTable').then((mod) => mod.ComparisonTable),
)
const PricingFAQ = dynamic(() =>
  import('./PricingFAQ').then((mod) => mod.PricingFAQ),
)

export function PricingPageContent() {
  const { t } = useLocale()

  return (
    <div className="bg-background min-h-screen">
      <LandingHeader />

      <main id="main-content">
        <PricingSection
          id="pricing"
          headingLevel="h1"
          className="scroll-mt-20"
        />

        <ComparisonTable />

        <PricingFAQ />

        <div className="border-border mx-auto max-w-3xl border-t px-4 pt-12 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-20">
          <h2 className="text-foreground text-2xl font-bold sm:text-3xl">
            {t('pricingPage.ctaText')}
          </h2>
          <p className="text-muted-foreground mt-3 text-base">
            {t('pricingPage.ctaSubtext')}
          </p>
          <Link href="/upload" className="mt-6 inline-block">
            <Button variant="brand" size="lg" className="h-12 px-8 text-base">
              {t('pricingPage.cta')}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
