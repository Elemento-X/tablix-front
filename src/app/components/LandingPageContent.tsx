'use client'

import { LanguageSelector } from '@/components/language-selector'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useLocale } from '@/lib/i18n'
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

export function LandingPageContent() {
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold text-neutral-900">
              {t('header.brand')}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl leading-tight font-bold tracking-tight text-balance text-neutral-900">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl text-balance text-neutral-600">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/upload">
              <Button
                size="lg"
                className="h-12 bg-neutral-900 px-8 text-base text-white hover:bg-neutral-800"
              >
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-16 text-center text-3xl font-bold text-neutral-900">
          {t('howItWorks.title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-4">
          <Card className="border-neutral-200 bg-neutral-50 p-6">
            <div className="w-fit rounded-lg bg-white p-3">
              <FileSpreadsheet className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.upload.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {t('howItWorks.steps.upload.description')}
            </p>
          </Card>

          <Card className="border-neutral-200 bg-neutral-50 p-6">
            <div className="w-fit rounded-lg bg-white p-3">
              <Eye className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.visualize.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {t('howItWorks.steps.visualize.description')}
            </p>
          </Card>

          <Card className="border-neutral-200 bg-neutral-50 p-6">
            <div className="w-fit rounded-lg bg-white p-3">
              <CheckCircle className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.choose.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {t('howItWorks.steps.choose.description')}
            </p>
          </Card>

          <Card className="border-neutral-200 bg-neutral-50 p-6">
            <div className="w-fit rounded-lg bg-white p-3">
              <Download className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.generate.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {t('howItWorks.steps.generate.description')}
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-center text-3xl font-bold text-neutral-900">
            {t('audience.title')}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">
                {t('audience.roles.analysts')}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">
                {t('audience.roles.admins')}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">
                {t('audience.roles.recurring')}
              </h3>
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed text-balance text-neutral-600">
            {t('audience.description')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-neutral-900">
            {t('pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="mb-12 flex justify-center">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('semester')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
                billingPeriod === 'semester'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.semester')}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`flex items-center gap-2 rounded-md px-6 py-2 text-sm font-medium transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.annual')}
              <Badge className="bg-green-100 text-xs text-green-700 hover:bg-green-100">
                {t('pricing.billingPeriod.annualBadge')}
              </Badge>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-neutral-900">
                {t('pricing.plans.free.name')}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-neutral-900">
                  {t('pricing.plans.free.price')}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                {t('pricing.plans.free.period')}
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.maxColumns')}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-neutral-500">
                {t('pricing.plans.free.description')}
              </p>

              <Link href="/upload">
                <Button
                  variant="outline"
                  className="mt-8 w-full border-neutral-300 bg-transparent"
                  size="lg"
                >
                  {t('pricing.plans.free.cta')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative border-neutral-900 shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-neutral-900 text-white hover:bg-neutral-900">
                {t('pricing.plans.pro.badge')}
              </Badge>
            </div>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-neutral-900">
                {t('pricing.plans.pro.name')}
              </h3>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-neutral-500 line-through">
                    {t('pricing.plans.pro.oldPrice')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-neutral-900">
                    {t('proPricing.currencySymbol')} {proPrice.price}
                  </span>
                  <span className="text-neutral-600">
                    /{t('pricing.plans.pro.period')}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-green-700">
                {t('pricing.plans.pro.launchPrice')}
              </p>
              {billingPeriod !== 'monthly' && (
                <p className="mt-1 text-xs text-neutral-500">
                  {proPrice.total}
                </p>
              )}

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.maxColumns')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.priorityProcessing')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.noWatermark')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-900" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.fileHistory')}
                  </span>
                </div>
              </div>

              <Button
                className="mt-8 h-12 w-full bg-neutral-900 text-white hover:bg-neutral-800"
                size="lg"
              >
                {t('pricing.plans.pro.cta')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-neutral-900">
                {t('pricing.plans.enterprise.name')}
              </h3>
              <div className="mt-4">
                <span className="text-2xl font-bold text-neutral-900">
                  {t('pricing.plans.enterprise.price')}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                {t('pricing.plans.enterprise.period')}
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.customLimits')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.sla')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.prioritySupport')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.dedicatedInfra')}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-neutral-500">
                {t('pricing.plans.enterprise.description')}
              </p>

              <Button
                variant="outline"
                className="mt-8 w-full border-neutral-300 bg-transparent"
                size="lg"
              >
                {t('pricing.plans.enterprise.cta')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm text-neutral-600">
            {t('footer.security')}
          </p>
          <p className="mt-2 text-center text-sm text-neutral-500">
            {t('footer.privacy')}
          </p>
        </div>
      </footer>
    </div>
  )
}
