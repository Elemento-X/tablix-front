'use client'

import { Monitor, Trash2, Lock, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { EASING, TIMING } from '@/lib/motion'

const STAGGER_DELAY = 0.07

export function SecurityBadges() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  const badges = [
    {
      icon: <Monitor className="h-8 w-8 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
      title: t('securityBadges.local.title'),
      subtitle: t('securityBadges.local.subtitle'),
    },
    {
      icon: <Trash2 className="h-8 w-8 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
      title: t('securityBadges.noStorage.title'),
      subtitle: t('securityBadges.noStorage.subtitle'),
    },
    {
      icon: <Lock className="h-8 w-8 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
      title: t('securityBadges.tls.title'),
      subtitle: t('securityBadges.tls.subtitle'),
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
      title: t('securityBadges.validation.title'),
      subtitle: t('securityBadges.validation.subtitle'),
    },
  ]

  return (
    <section className="bg-background py-16 md:py-20" aria-label={t('securityBadges.title')}>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-foreground text-center text-2xl font-semibold tracking-tight">
          {t('securityBadges.title')}
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.title}
              className="flex flex-col items-center text-center"
              {...(prefersReducedMotion
                ? {}
                : {
                    initial: { opacity: 0, y: 12 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.3 },
                    transition: {
                      duration: TIMING.slow,
                      ease: EASING.enter,
                      delay: index * STAGGER_DELAY,
                    },
                  })}
            >
              {badge.icon}
              <span className="text-foreground mt-2 text-sm font-medium">{badge.title}</span>
              <span className="text-muted-foreground mt-0.5 text-xs">{badge.subtitle}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
