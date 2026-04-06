'use client'

import { useLocale } from '@/lib/i18n'
import { EASING, SPRING, TIMING } from '@/lib/motion'
import { motion } from 'framer-motion'
import { Check, ClipboardCopy, Columns3, Timer } from 'lucide-react'

const STAGGER = 0.18

const ITEMS = [
  { key: 'item1', painIcon: ClipboardCopy },
  { key: 'item2', painIcon: Columns3 },
  { key: 'item3', painIcon: Timer },
] as const

const ICON_CLASSES = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border'

export function BenefitsSection() {
  const { t } = useLocale()

  return (
    <section className="bg-muted dark:bg-muted/30 py-12 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: TIMING.slow, ease: EASING.enter }}
          className="mb-10 text-center sm:mb-16"
        >
          <h2 className="text-foreground text-2xl font-bold sm:text-3xl">{t('benefits.title')}</h2>
          <motion.div
            className="bg-primary mx-auto mt-3 h-0.5 w-0"
            whileInView={{ width: 48 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASING.enter, delay: 0.2 }}
          />
        </motion.div>

        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          {ITEMS.map((item, index) => {
            const base = index * STAGGER

            return (
              <motion.div
                key={item.key}
                className="group relative grid grid-cols-[2.75rem_1fr] gap-x-3 gap-y-3 rounded-xl p-6"
                initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: TIMING.slow,
                  ease: EASING.enter,
                  delay: base,
                }}
              >
                {/* Pain icon */}
                <motion.div
                  className={`${ICON_CLASSES} border-red-500/20 bg-red-500/10`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{
                    opacity: 1,
                    scale: 1,
                    x: [0, -3, 3, -2, 1, 0],
                  }}
                  viewport={{ once: true }}
                  transition={{
                    opacity: { duration: 0.2, delay: base + 0.15 },
                    scale: { ...SPRING.pop, delay: base + 0.15 },
                    x: { duration: 0.4, ease: EASING.enter, delay: base + 0.25 },
                  }}
                >
                  <item.painIcon
                    className="h-5 w-5 text-red-500 dark:text-red-400"
                    aria-hidden="true"
                  />
                </motion.div>

                {/* Pain text */}
                <p className="text-muted-foreground self-center text-sm leading-snug">
                  {t(`benefits.items.${item.key}.pain`)}
                </p>

                {/* Arrow — centered on icon + text */}
                <div className="col-span-2 flex justify-center">
                  <motion.div
                    className="text-teal-500"
                    whileInView={{ y: [0, 6, 0] }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      ease: EASING.easeOutStrong,
                      delay: base + 0.9,
                    }}
                  >
                    <motion.svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <motion.path
                        d="M12 5v14m0 0l-6-6m6 6l6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          pathLength: {
                            duration: 0.5,
                            ease: EASING.enter,
                            delay: base + 0.45,
                          },
                          opacity: { duration: 0.15, delay: base + 0.4 },
                        }}
                      />
                    </motion.svg>
                  </motion.div>
                </div>

                {/* Solution icon */}
                <motion.div
                  className={`${ICON_CLASSES} border-teal-500/20 bg-teal-500/10`}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: '0 0 12px 4px rgba(20, 184, 166, 0.15)',
                  }}
                  viewport={{ once: true }}
                  transition={{
                    opacity: { ...SPRING.pop, delay: base + 1.0 },
                    scale: { ...SPRING.pop, delay: base + 1.0 },
                    boxShadow: {
                      duration: 0.8,
                      ease: EASING.enter,
                      delay: base + 1.15,
                    },
                  }}
                >
                  <Check className="h-5 w-5 text-teal-500 dark:text-teal-400" aria-hidden="true" />
                </motion.div>

                {/* Solution text */}
                <motion.p
                  className="text-foreground self-center text-sm leading-snug font-medium"
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.3,
                    ease: EASING.enter,
                    delay: base + 1.1,
                  }}
                >
                  {t(`benefits.items.${item.key}.solution`)}
                </motion.p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
