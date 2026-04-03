'use client'

import { LandingFooter } from '@/components/landing-footer'
import { LandingHeader } from '@/components/landing-header'
import { GridBackground } from '@/components/grid-background'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { PricingSection } from '@/components/pricing-section'
import { SecurityBadges } from '@/components/security-badges'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useLocale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  Download,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Users,
} from 'lucide-react'
import Link from 'next/link'

const MotionCard = motion.create(Card)

export function LandingPageContent() {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="bg-background min-h-screen">
      <LandingHeader />

      <main id="main-content">
        <section className="relative mx-auto max-w-5xl px-4 pt-12 pb-10 sm:px-6 sm:pt-20 sm:pb-16">
          <GridBackground />
          <motion.div
            className="relative text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Badge variant="outline" className="mb-4 text-xs font-medium">
              {t('hero.earlyAccess')}
            </Badge>
            <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-lg text-balance sm:mt-6 sm:text-xl">
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/upload" data-testid="cta-upload">
                <Button
                  variant="brand"
                  size="lg"
                  className="h-12 px-8 text-base"
                >
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-20"
        >
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
                icon: <CircleCheck className="text-muted-foreground h-6 w-6" />,
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

        <section id="audience" className="bg-muted scroll-mt-20 py-12 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-foreground mb-12 text-center text-2xl font-bold sm:mb-16 sm:text-3xl">
              {t('audience.title')}
            </h2>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  icon: (
                    <BarChart3
                      className="text-muted-foreground h-6 w-6"
                      aria-hidden="true"
                    />
                  ),
                  title: t('audience.roles.analysts.title'),
                  description: t('audience.roles.analysts.description'),
                },
                {
                  icon: (
                    <Users
                      className="text-muted-foreground h-6 w-6"
                      aria-hidden="true"
                    />
                  ),
                  title: t('audience.roles.admins.title'),
                  description: t('audience.roles.admins.description'),
                },
                {
                  icon: (
                    <RefreshCw
                      className="text-muted-foreground h-6 w-6"
                      aria-hidden="true"
                    />
                  ),
                  title: t('audience.roles.recurring.title'),
                  description: t('audience.roles.recurring.description'),
                },
              ].map((role, index) => (
                <motion.div
                  key={role.title}
                  className="text-center"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                    delay: index * 0.08,
                  }}
                >
                  <div className="bg-background mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                    {role.icon}
                  </div>
                  <h3 className="text-foreground mt-4 font-semibold">
                    {role.title}
                  </h3>
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
