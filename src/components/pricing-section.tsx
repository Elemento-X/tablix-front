'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { CONTACT_EMAIL } from '@/lib/constants'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'

type BillingPeriod = 'monthly' | 'semester' | 'annual'

interface PricingSectionProps {
  as?: 'section' | 'div'
  headingLevel?: 'h1' | 'h2'
  id?: string
  className?: string
}

export function PricingSection({
  as: Tag = 'section',
  headingLevel: Heading = 'h2',
  id,
  className = '',
}: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const { t } = useLocale()

  const getProPrice = () => {
    const period = t('billingPeriods.month')
    switch (billingPeriod) {
      case 'monthly':
        return {
          price: t('proPricing.monthly.price'),
          period,
          total: t('proPricing.monthly.total'),
        }
      case 'semester':
        return {
          price: t('proPricing.semester.price'),
          period,
          total: t('proPricing.semester.total'),
        }
      case 'annual':
        return {
          price: t('proPricing.annual.price'),
          period,
          total: t('proPricing.annual.total'),
        }
    }
  }

  const proPrice = getProPrice()

  return (
    <Tag
      id={id}
      className={`mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 ${className}`}
    >
      <div className="mb-8 text-center sm:mb-12">
        <Heading className="text-foreground text-3xl font-bold sm:text-4xl">
          {t('pricing.title')}
        </Heading>
        <p className="text-muted-foreground mt-3 text-base sm:mt-4 sm:text-lg">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="mb-8 flex justify-center sm:mb-12">
        <div
          role="radiogroup"
          aria-label={t('pricing.title')}
          className="border-border bg-muted inline-flex flex-wrap justify-center rounded-lg border p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={billingPeriod === 'monthly'}
            onClick={() => setBillingPeriod('monthly')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-6 ${
              billingPeriod === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pricing.billingPeriod.monthly')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billingPeriod === 'semester'}
            onClick={() => setBillingPeriod('semester')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-6 ${
              billingPeriod === 'semester'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pricing.billingPeriod.semester')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billingPeriod === 'annual'}
            onClick={() => setBillingPeriod('annual')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-6 ${
              billingPeriod === 'annual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('pricing.billingPeriod.annual')}
            <Badge variant="success" className="text-xs">
              {t('pricing.billingPeriod.annualBadge')}
            </Badge>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 sm:gap-8 md:grid-cols-3">
        <Card className="border-border">
          <CardContent className="p-5 sm:p-8">
            <h3 className="text-foreground text-2xl font-bold">
              {t('pricing.plans.free.name')}
            </h3>
            <div className="mt-4">
              <span className="text-foreground text-3xl font-bold sm:text-4xl">
                {t('pricing.plans.free.price')}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('pricing.plans.free.period')}
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.free.features.sheetsPerMonth')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.free.features.maxRows')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.free.features.maxColumns')}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
              {t('pricing.plans.free.description')}
            </p>

            <Link href="/upload">
              <Button
                variant="outline"
                className="mt-8 w-full bg-transparent"
                size="lg"
              >
                {t('pricing.plans.free.cta')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-foreground relative shadow-xl">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-foreground text-background hover:bg-foreground">
              {t('pricing.plans.pro.badge')}
            </Badge>
          </div>
          <CardContent className="p-5 sm:p-8">
            <h3 className="text-foreground text-2xl font-bold">
              {t('pricing.plans.pro.name')}
            </h3>
            <div className="mt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground text-sm line-through">
                  {t('pricing.plans.pro.oldPrice')}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-foreground text-3xl font-bold sm:text-4xl">
                  {t('proPricing.currencySymbol')} {proPrice.price}
                </span>
                <span className="text-muted-foreground">
                  /{t('pricing.plans.pro.period')}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-400">
              {t('pricing.plans.pro.launchPrice')}
            </p>
            {billingPeriod !== 'monthly' && (
              <p className="text-muted-foreground mt-1 text-xs">
                {proPrice.total}
              </p>
            )}

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.sheetsPerMonth')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.maxRows')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.maxColumns')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.priorityProcessing')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.noWatermark')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.pro.features.fileHistory')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="brand"
              className="mt-8 h-12 w-full"
              size="lg"
            >
              {t('pricing.plans.pro.cta')}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 sm:p-8">
            <h3 className="text-foreground text-2xl font-bold">
              {t('pricing.plans.enterprise.name')}
            </h3>
            <div className="mt-4">
              <span className="text-foreground text-2xl font-bold">
                {t('pricing.plans.enterprise.price')}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('pricing.plans.enterprise.period')}
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.enterprise.features.customLimits')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.enterprise.features.sla')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.enterprise.features.prioritySupport')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-foreground/80 text-sm">
                  {t('pricing.plans.enterprise.features.dedicatedInfra')}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
              {t('pricing.plans.enterprise.description')}
            </p>

            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Button
                variant="outline"
                className="mt-8 w-full bg-transparent"
                size="lg"
              >
                {t('pricing.plans.enterprise.cta')}
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </Tag>
  )
}
