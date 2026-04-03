'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { LandingHeader } from '@/components/landing-header'
import { LandingFooter } from '@/components/landing-footer'
import { PricingSection } from '@/components/pricing-section'
import { Button } from '@/components/button'

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

        <div className="pb-12 text-center sm:pb-20">
          <p className="text-muted-foreground mb-4 text-base">
            {t('pricingPage.ctaText')}
          </p>
          <Link href="/upload">
            <Button variant="brand" size="lg" className="h-12 px-8 text-base">
              {t('pricingPage.cta')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
