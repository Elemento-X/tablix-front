'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const FEATURE_KEYS = [
  'sheetsPerMonth',
  'maxRows',
  'maxColumns',
  'maxFileSize',
  'processing',
  'watermark',
  'fileHistory',
  'support',
  'infrastructure',
] as const

const PLANS = ['free', 'pro', 'enterprise'] as const

export function ComparisonTable() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)

  const togglePlan = (plan: string) => {
    setExpandedPlan((prev) => (prev === plan ? null : plan))
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-20">
      <h2 className="text-foreground mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
        {t('pricingPage.comparison.title')}
      </h2>

      <div className="hidden md:block">
        <table
          className="w-full border-collapse text-sm"
          aria-label={t('pricingPage.comparison.title')}
        >
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                aria-hidden="true"
                className="text-muted-foreground py-4 pr-4 text-left font-medium"
              />
              {PLANS.map((plan) => (
                <th
                  key={plan}
                  scope="col"
                  className={`py-4 text-center font-semibold ${
                    plan === 'pro' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(`pricing.plans.${plan}.name`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_KEYS.map((feature) => (
              <tr
                key={feature}
                className="border-border border-b last:border-0"
              >
                <th
                  scope="row"
                  className="text-foreground py-3.5 pr-4 text-left font-medium"
                >
                  {t(`pricingPage.comparison.features.${feature}`)}
                </th>
                {PLANS.map((plan) => (
                  <td
                    key={plan}
                    className={`py-3.5 text-center ${
                      plan === 'pro' ? 'bg-muted/30 font-medium' : ''
                    }`}
                  >
                    <span
                      className={
                        plan === 'pro'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }
                    >
                      {t(`pricingPage.comparison.values.${plan}.${feature}`)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {PLANS.map((plan) => {
          const isExpanded = expandedPlan === plan
          return (
            <div
              key={plan}
              className="border-border overflow-hidden rounded-lg border"
            >
              <button
                type="button"
                onClick={() => togglePlan(plan)}
                aria-expanded={isExpanded}
                aria-controls={`comparison-panel-${plan}`}
                className="text-foreground flex w-full items-center justify-between p-4 text-left font-semibold"
              >
                <span>{t(`pricing.plans.${plan}.name`)}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    id={`comparison-panel-${plan}`}
                    role="region"
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { height: 0, opacity: 0 }
                    }
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { height: 'auto', opacity: 1 }
                    }
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="border-border space-y-2 border-t px-4 pt-3 pb-4">
                      {FEATURE_KEYS.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {t(`pricingPage.comparison.features.${feature}`)}
                          </span>
                          <span className="text-foreground font-medium">
                            {t(
                              `pricingPage.comparison.values.${plan}.${feature}`,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
