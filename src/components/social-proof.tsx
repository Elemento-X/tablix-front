'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { motion } from 'framer-motion'
import { EASING, TIMING } from '@/lib/motion'

interface MetricConfig {
  key: string
  target: number
  suffix: string
}

const METRICS: MetricConfig[] = [
  { key: 'zeroStorage', target: 0, suffix: '' },
  { key: 'localProcessing', target: 100, suffix: '%' },
  { key: 'formats', target: 3, suffix: '' },
]

const COUNT_UP_DURATION = 1500

function MetricItem({
  metric,
  index,
  prefersReducedMotion,
}: {
  metric: MetricConfig
  index: number
  prefersReducedMotion: boolean
}) {
  const { t } = useLocale()
  const [value, setValue] = useState(prefersReducedMotion ? metric.target : 0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)
  const rafId = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion || metric.target === 0) {
      setValue(metric.target)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          observer.disconnect()

          const start = performance.now()
          function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / COUNT_UP_DURATION, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(eased * metric.target))
            if (progress < 1) {
              rafId.current = requestAnimationFrame(tick)
            }
          }
          rafId.current = requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafId.current)
    }
  }, [prefersReducedMotion, metric.target])

  return (
    <motion.div
      ref={ref}
      className="px-6 text-center sm:px-10 md:px-14"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: TIMING.slow,
        ease: EASING.enter,
        delay: index * 0.12,
      }}
    >
      <p
        className="text-foreground text-4xl font-extrabold tabular-nums sm:text-5xl"
        aria-label={`${metric.target}${metric.suffix}`}
      >
        {value}
        {metric.suffix}
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        {t(`socialProof.metrics.${metric.key}.label`)}
      </p>
    </motion.div>
  )
}

export function SocialProof() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      className="border-border/50 border-y bg-teal-500/[0.03] dark:bg-teal-500/[0.04]"
      aria-label={t('socialProof.ariaLabel')}
    >
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <motion.p
          className="text-muted-foreground/70 mb-6 text-center text-xs font-medium tracking-widest uppercase sm:mb-8"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: TIMING.slow, ease: EASING.enter }}
        >
          {t('socialProof.heading')}
        </motion.p>

        <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-0">
          {METRICS.map((metric, index) => (
            <Fragment key={metric.key}>
              {index > 0 && (
                <>
                  <div
                    className="bg-border/30 h-px w-16 sm:hidden"
                    role="separator"
                    aria-hidden="true"
                  />
                  <div
                    className="bg-border/40 hidden h-12 w-px sm:block"
                    role="separator"
                    aria-hidden="true"
                  />
                </>
              )}
              <MetricItem
                metric={metric}
                index={index}
                prefersReducedMotion={prefersReducedMotion}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}
