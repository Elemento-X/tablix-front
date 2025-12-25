'use client'

import { LanguageSelector } from '@/components/language-selector'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useLocale } from '@/lib/i18n'
import { ArrowRight, Check, CheckCircle, Download, Eye, FileSpreadsheet } from 'lucide-react'
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
        return { price: t('proPricing.monthly.price'), period, total: t('proPricing.monthly.total') }
      case 'semester':
        return { price: t('proPricing.semester.price'), period, total: t('proPricing.semester.total') }
      case 'annual':
        return { price: t('proPricing.annual.price'), period, total: t('proPricing.annual.total') }
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
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-xl text-neutral-600 max-w-3xl mx-auto text-balance">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/upload">
              <Button
                size="lg"
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 h-12 text-base"
              >
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-neutral-900 mb-16">
          {t('howItWorks.title')}
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          <Card className="p-6 border-neutral-200 bg-neutral-50">
            <div className="rounded-lg bg-white p-3 w-fit">
              <FileSpreadsheet className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.upload.title')}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              {t('howItWorks.steps.upload.description')}
            </p>
          </Card>

          <Card className="p-6 border-neutral-200 bg-neutral-50">
            <div className="rounded-lg bg-white p-3 w-fit">
              <Eye className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.visualize.title')}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              {t('howItWorks.steps.visualize.description')}
            </p>
          </Card>

          <Card className="p-6 border-neutral-200 bg-neutral-50">
            <div className="rounded-lg bg-white p-3 w-fit">
              <CheckCircle className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.choose.title')}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              {t('howItWorks.steps.choose.description')}
            </p>
          </Card>

          <Card className="p-6 border-neutral-200 bg-neutral-50">
            <div className="rounded-lg bg-white p-3 w-fit">
              <Download className="h-6 w-6 text-neutral-700" />
            </div>
            <h3 className="mt-4 font-semibold text-neutral-900">
              {t('howItWorks.steps.generate.title')}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              {t('howItWorks.steps.generate.description')}
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-neutral-900 mb-6">
            {t('audience.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">{t('audience.roles.analysts')}</h3>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">{t('audience.roles.admins')}</h3>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-neutral-900">{t('audience.roles.recurring')}</h3>
            </div>
          </div>
          <p className="mt-12 text-center text-neutral-600 text-lg leading-relaxed max-w-2xl mx-auto text-balance">
            {t('audience.description')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-neutral-900">{t('pricing.title')}</h2>
          <p className="mt-4 text-lg text-neutral-600">{t('pricing.subtitle')}</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('semester')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'semester'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.semester')}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('pricing.billingPeriod.annual')}
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                {t('pricing.billingPeriod.annualBadge')}
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
              <p className="mt-2 text-sm text-neutral-600">{t('pricing.plans.free.period')}</p>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.free.features.maxColumns')}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs text-neutral-500 leading-relaxed">
                {t('pricing.plans.free.description')}
              </p>

              <Link href="/upload">
                <Button
                  variant="outline"
                  className="w-full mt-8 border-neutral-300 bg-transparent"
                  size="lg"
                >
                  {t('pricing.plans.free.cta')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-neutral-900 shadow-xl relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-neutral-900 text-white hover:bg-neutral-900">
                {t('pricing.plans.pro.badge')}
              </Badge>
            </div>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-neutral-900">{t('pricing.plans.pro.name')}</h3>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-neutral-500 line-through">
                    {t('pricing.plans.pro.oldPrice')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-neutral-900">{t('proPricing.currencySymbol')} {proPrice.price}</span>
                  <span className="text-neutral-600">/{t('pricing.plans.pro.period')}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-green-700 font-medium">
                {t('pricing.plans.pro.launchPrice')}
              </p>
              {billingPeriod !== 'monthly' && (
                <p className="mt-1 text-xs text-neutral-500">{proPrice.total}</p>
              )}

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.sheetsPerMonth')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.maxRows')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.maxColumns')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.priorityProcessing')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.noWatermark')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.pro.features.fileHistory')}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-8 bg-neutral-900 hover:bg-neutral-800 text-white h-12"
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
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.customLimits')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.sla')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.prioritySupport')}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">
                    {t('pricing.plans.enterprise.features.dedicatedInfra')}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs text-neutral-500 leading-relaxed">
                {t('pricing.plans.enterprise.description')}
              </p>

              <Button
                variant="outline"
                className="w-full mt-8 border-neutral-300 bg-transparent"
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
          <p className="text-center text-sm text-neutral-600">{t('footer.security')}</p>
          <p className="mt-2 text-center text-sm text-neutral-500">{t('footer.privacy')}</p>
        </div>
      </footer>
    </div>
  )
}
