'use client'

import { LanguageSelector } from '@/components/language-selector'
import { GridBackground } from '@/components/grid-background'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useLocale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  CheckCircle,
  Download,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type BillingPeriod = 'monthly' | 'semester' | 'annual'

const MotionCard = motion.create(Card)

export function LandingPageContent() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

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
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-foreground text-xl font-semibold">
              {t('header.brand')}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-4 pt-12 pb-10 sm:px-6 sm:pt-20 sm:pb-16">
        <GridBackground />
        <motion.div
          className="relative text-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-lg text-balance sm:mt-6 sm:text-xl">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/upload" data-testid="cta-upload">
              <Button variant="brand" size="lg" className="h-12 px-8 text-base">
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <h2 className="text-foreground mb-10 text-center text-2xl font-bold sm:mb-16 sm:text-3xl">
          {t('howItWorks.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4 md:gap-8">
          {[
            {
              icon: (
                <FileSpreadsheet className="text-muted-foreground h-6 w-6" />
              ),
              title: t('howItWorks.steps.upload.title'),
              description: t('howItWorks.steps.upload.description'),
            },
            {
              icon: <Eye className="text-muted-foreground h-6 w-6" />,
              title: t('howItWorks.steps.visualize.title'),
              description: t('howItWorks.steps.visualize.description'),
            },
            {
              icon: <CheckCircle className="text-muted-foreground h-6 w-6" />,
              title: t('howItWorks.steps.choose.title'),
              description: t('howItWorks.steps.choose.description'),
            },
            {
              icon: <Download className="text-muted-foreground h-6 w-6" />,
              title: t('howItWorks.steps.generate.title'),
              description: t('howItWorks.steps.generate.description'),
            },
          ].map((step, index) => (
            <MotionCard
              key={step.title}
              className="border-border bg-muted p-6"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
                delay: index * 0.08,
              }}
            >
              <div className="bg-background w-fit rounded-lg p-3">
                {step.icon}
              </div>
              <h3 className="text-foreground mt-4 font-semibold">
                {step.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {step.description}
              </p>
            </MotionCard>
          ))}
        </div>
      </section>

      <section className="bg-muted py-12 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-foreground mb-6 text-center text-2xl font-bold sm:text-3xl">
            {t('audience.title')}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <h3 className="text-foreground font-semibold">
                {t('audience.roles.analysts')}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-foreground font-semibold">
                {t('audience.roles.admins')}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-foreground font-semibold">
                {t('audience.roles.recurring')}
              </h3>
            </div>
          </div>
          <p className="text-muted-foreground mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed text-balance">
            {t('audience.description')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="text-foreground text-3xl font-bold sm:text-4xl">
            {t('pricing.title')}
          </h2>
          <p className="text-muted-foreground mt-3 text-base sm:mt-4 sm:text-lg">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="mb-8 flex justify-center sm:mb-12">
          <div className="border-border bg-muted inline-flex flex-wrap justify-center rounded-lg border p-1">
            <button
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
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.free.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.free.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
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
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.maxColumns')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.priorityProcessing')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.noWatermark')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.pro.features.fileHistory')}
                  </span>
                </div>
              </div>

              <Button variant="brand" className="mt-8 h-12 w-full" size="lg">
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
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.enterprise.features.customLimits')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.enterprise.features.sla')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.enterprise.features.prioritySupport')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {t('pricing.plans.enterprise.features.dedicatedInfra')}
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
                {t('pricing.plans.enterprise.description')}
              </p>

              <Button
                variant="outline"
                className="mt-8 w-full bg-transparent"
                size="lg"
              >
                {t('pricing.plans.enterprise.cta')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-border border-t py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-muted-foreground text-center text-sm">
            {t('footer.security')}
          </p>
          <p className="text-muted-foreground mt-2 text-center text-sm opacity-70">
            {t('footer.privacy')}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <Link
              href="/privacy-policy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('footer.privacyPolicy')}
            </Link>
            <span className="text-muted-foreground opacity-30">|</span>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('footer.terms')}
            </Link>
          </div>
          <p className="text-muted-foreground mt-3 text-center text-xs opacity-50">
            {t('footer.copyright', {
              year: new Date().getFullYear().toString(),
            })}
          </p>
        </div>
      </footer>
    </div>
  )
}
