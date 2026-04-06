'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { EASING, TIMING } from '@/lib/motion'

const FEATURE_KEYS = ['maxFileSize', 'maxRows', 'processing', 'support'] as const

export function ComparisonMini() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16"
      aria-label={t('comparisonMini.title')}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: TIMING.slow, ease: EASING.enter }}
      >
        <h2 className="text-foreground mb-6 text-center text-xl font-bold sm:mb-8 sm:text-2xl">
          {t('comparisonMini.title')}
        </h2>

        <div className="border-border overflow-hidden rounded-xl border">
          {/* Header */}
          <div className="border-border bg-muted dark:bg-muted/30 grid grid-cols-3 border-b">
            <div className="p-3 sm:p-4" />
            <div className="text-muted-foreground border-border border-l p-3 text-center text-sm font-semibold sm:p-4">
              {t('pricing.plans.free.name')}
            </div>
            <div className="text-foreground border-border border-l p-3 text-center text-sm font-semibold sm:p-4">
              {t('pricing.plans.pro.name')}
            </div>
          </div>

          {/* Rows */}
          {FEATURE_KEYS.map((feature, index) => (
            <motion.div
              key={feature}
              className="border-border grid grid-cols-3 border-b last:border-0"
              {...(prefersReducedMotion
                ? {}
                : {
                    initial: { opacity: 0 },
                    whileInView: { opacity: 1 },
                    viewport: { once: true },
                    transition: {
                      duration: TIMING.normal,
                      ease: EASING.enter,
                      delay: index * 0.06,
                    },
                  })}
            >
              <div className="text-foreground p-3 text-sm font-medium sm:p-4">
                {t(`pricingPage.comparison.features.${feature}`)}
              </div>
              <div className="text-muted-foreground border-border border-l p-3 text-center text-sm sm:p-4">
                {t(`pricingPage.comparison.values.free.${feature}`)}
              </div>
              <div className="text-foreground border-border border-l p-3 text-center text-sm font-medium sm:p-4">
                {t(`pricingPage.comparison.values.pro.${feature}`)}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center sm:mt-6">
          <Link
            href="/pricing"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            {t('comparisonMini.seeAll')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
