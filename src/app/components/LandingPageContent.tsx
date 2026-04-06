'use client'

import { BenefitsSection } from '@/components/benefits-section'
import { LandingFooter } from '@/components/landing-footer'
import { LandingHeader } from '@/components/landing-header'
import { Card } from '@/components/card'
import { PricingSection } from '@/components/pricing-section'
import { SecurityBadges } from '@/components/security-badges'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useLocale } from '@/lib/i18n'
import { EASING, SPRING, TIMING } from '@/lib/motion'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CircleCheck,
  Download,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Users,
} from 'lucide-react'

import { HeroSection } from './hero-section'

const MotionCard = motion.create(Card)

export function LandingPageContent() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="bg-background min-h-screen">
      <LandingHeader />

      <main id="main-content">
        <HeroSection />

        <BenefitsSection />

        {/* How it Works — sequential card fill */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-20"
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: TIMING.slow, ease: EASING.enter }}
            className="relative mb-10 text-center sm:mb-16"
          >
            <h2 className="text-foreground text-2xl font-bold sm:text-3xl">
              {t('howItWorks.title')}
            </h2>
            <motion.div
              className="bg-primary mx-auto mt-3 h-0.5 w-0"
              whileInView={{ width: 48 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASING.enter, delay: 0.2 }}
            />
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4 md:gap-8">
            {[
              {
                id: 'upload',
                icon: FileSpreadsheet,
                title: t('howItWorks.steps.upload.title'),
                description: t('howItWorks.steps.upload.description'),
              },
              {
                id: 'visualize',
                icon: Eye,
                title: t('howItWorks.steps.visualize.title'),
                description: t('howItWorks.steps.visualize.description'),
              },
              {
                id: 'choose',
                icon: CircleCheck,
                title: t('howItWorks.steps.choose.title'),
                description: t('howItWorks.steps.choose.description'),
              },
              {
                id: 'generate',
                icon: Download,
                title: t('howItWorks.steps.generate.title'),
                description: t('howItWorks.steps.generate.description'),
              },
            ].map((step, index) => (
              <MotionCard
                key={step.id}
                className="border-border bg-muted dark:bg-muted/30 relative overflow-hidden p-6"
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 24, clipPath: 'inset(100% 0 0 0)' }
                }
                whileInView={{
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0% 0 0 0)',
                }}
                whileHover={prefersReducedMotion ? undefined : { y: -4, transition: SPRING.gentle }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: TIMING.slow,
                  ease: EASING.enter,
                  delay: index * 0.12,
                }}
              >
                <span className="text-muted-foreground/30 absolute top-2 left-3 font-mono text-xs">
                  {index + 1}
                </span>
                <motion.div
                  className="bg-background w-fit rounded-lg p-3"
                  whileInView={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scale: [0.8, 1.1, 1],
                          rotate: step.icon === FileSpreadsheet ? [0, 5, 0] : 0,
                        }
                  }
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    ease: EASING.enter,
                    delay: index * 0.12 + 0.3,
                  }}
                >
                  <step.icon className="text-muted-foreground h-6 w-6" />
                </motion.div>
                <h3 className="text-foreground mt-4 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {step.description}
                </p>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* Audience — spotlight reveal */}
        <section id="audience" className="bg-muted dark:bg-muted/30 scroll-mt-20 py-12 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: TIMING.slow, ease: EASING.enter }}
              className="mb-12 text-center sm:mb-16"
            >
              <h2 className="text-foreground text-2xl font-bold sm:text-3xl">
                {t('audience.title')}
              </h2>
              <motion.div
                className="bg-primary mx-auto mt-3 h-0.5 w-0"
                whileInView={{ width: 48 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASING.enter, delay: 0.2 }}
              />
            </motion.div>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  id: 'analysts',
                  icon: BarChart3,
                  title: t('audience.roles.analysts.title'),
                  description: t('audience.roles.analysts.description'),
                },
                {
                  id: 'admins',
                  icon: Users,
                  title: t('audience.roles.admins.title'),
                  description: t('audience.roles.admins.description'),
                },
                {
                  id: 'recurring',
                  icon: RefreshCw,
                  title: t('audience.roles.recurring.title'),
                  description: t('audience.roles.recurring.description'),
                },
              ].map((role, index) => (
                <motion.div
                  key={role.id}
                  className="group text-center"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: TIMING.slow,
                    ease: EASING.enter,
                    delay: index * 0.2,
                  }}
                >
                  <motion.div
                    className="bg-background mx-auto flex h-12 w-12 items-center justify-center rounded-full transition-shadow group-hover:shadow-lg group-hover:shadow-teal-500/10"
                    whileInView={prefersReducedMotion ? undefined : { scale: [0, 1.1, 1] }}
                    viewport={{ once: true }}
                    transition={{
                      ...SPRING.pop,
                      delay: index * 0.2 + 0.1,
                    }}
                  >
                    <role.icon className="text-muted-foreground h-6 w-6" aria-hidden="true" />
                  </motion.div>
                  <h3 className="text-foreground mt-4 font-semibold">{role.title}</h3>
                  <p className="text-muted-foreground mx-auto mt-2 max-w-[240px] text-sm leading-relaxed">
                    {role.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection id="pricing" className="scroll-mt-20" />

        <SecurityBadges />
      </main>

      <LandingFooter />
    </div>
  )
}
