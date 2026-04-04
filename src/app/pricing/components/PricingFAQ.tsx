'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { FAQ_KEYS } from '../constants'

export function PricingFAQ() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const toggleItem = (key: string) => {
    setExpandedItem((prev) => (prev === key ? null : key))
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 sm:pb-20">
      <h2 className="text-foreground mb-8 text-center text-2xl font-bold sm:mb-12 sm:text-3xl">
        {t('pricingPage.faq.title')}
      </h2>

      <div className="divide-border divide-y">
        {FAQ_KEYS.map((key) => {
          const isExpanded = expandedItem === key
          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => toggleItem(key)}
                aria-expanded={isExpanded}
                aria-controls={`faq-panel-${key}`}
                className="text-foreground flex w-full items-center justify-between py-5 text-left font-medium"
              >
                <span className="pr-4">{t(`pricingPage.faq.items.${key}.question`)}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`text-muted-foreground h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    id={`faq-panel-${key}`}
                    role="region"
                    initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <p className="text-muted-foreground pb-5 text-sm leading-relaxed">
                      {t(`pricingPage.faq.items.${key}.answer`)}
                    </p>
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
