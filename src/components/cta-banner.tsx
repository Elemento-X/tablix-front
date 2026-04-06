'use client'

import Link from 'next/link'
import { Button } from '@/components/button'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { EASING, SPRING, TIMING, variants } from '@/lib/motion'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface CtaBannerInlineProps {
  variant: 'inline'
  title: string
  ctaLabel: string
  href?: string
}

interface CtaBannerCardProps {
  variant: 'card'
  title: string
  subtitle: string
  ctaLabel: string
  href?: string
}

interface CtaBannerFinalProps {
  variant: 'final'
  title: string
  subtitle: string
  ctaLabel: string
  href?: string
}

type CtaBannerProps = CtaBannerInlineProps | CtaBannerCardProps | CtaBannerFinalProps

const MotionLink = motion.create(Link)

function InlineCta({ title, ctaLabel, href = '/upload' }: Omit<CtaBannerInlineProps, 'variant'>) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="py-6 text-center sm:py-8"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: TIMING.normal, ease: EASING.enter }}
    >
      <p className="text-muted-foreground text-sm sm:text-base">
        {title}{' '}
        <Link
          href={href}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 underline-offset-4 transition-colors hover:underline"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </motion.div>
  )
}

function CardCta({
  title,
  subtitle,
  ctaLabel,
  href = '/upload',
}: Omit<CtaBannerCardProps, 'variant'>) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="px-4 py-8 sm:py-12">
      <motion.div
        className="border-border mx-auto max-w-2xl rounded-xl border p-6 text-center sm:p-8 dark:border-stone-700/50"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: TIMING.slow, ease: EASING.enter }}
      >
        <motion.h3
          className="text-foreground text-lg font-semibold"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: TIMING.slow, ease: EASING.enter }}
        >
          {title}
        </motion.h3>
        <motion.p
          className="text-muted-foreground mx-auto mt-2 max-w-md text-sm"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: TIMING.slow, ease: EASING.enter, delay: 0.15 }}
        >
          {subtitle}
        </motion.p>
        <motion.div
          className="mt-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: TIMING.slow, ease: EASING.enter, delay: 0.3 }}
        >
          <Link href={href}>
            <Button variant="brand" size="lg" className="w-full sm:w-auto">
              {ctaLabel}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

function FinalCta({
  title,
  subtitle,
  ctaLabel,
  href = '/upload',
}: Omit<CtaBannerFinalProps, 'variant'>) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="bg-gradient-to-b from-transparent via-teal-50/30 to-transparent py-16 sm:py-24 dark:via-teal-950/20">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <motion.h2
          className="text-foreground text-2xl font-bold text-balance sm:text-3xl"
          initial={prefersReducedMotion ? false : variants.blurDissolve.hidden}
          whileInView={variants.blurDissolve.visible}
          viewport={{ once: true, margin: '-80px' }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="text-muted-foreground mt-3 text-base sm:text-lg"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: TIMING.slow, ease: EASING.enter, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
        <motion.div
          className="mt-8"
          initial={prefersReducedMotion ? false : variants.springPop.hidden}
          whileInView={variants.springPop.visible}
          viewport={{ once: true }}
          transition={{ ...SPRING.pop, delay: 0.4 }}
        >
          <MotionLink
            href={href}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          >
            <Button
              variant="brand"
              size="lg"
              className="h-12 w-full px-8 text-base shadow-lg transition-shadow hover:shadow-xl hover:shadow-teal-500/20 sm:w-auto"
            >
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </MotionLink>
        </motion.div>
      </div>
    </section>
  )
}

export function CtaBanner(props: CtaBannerProps) {
  const { variant, ...rest } = props

  switch (variant) {
    case 'inline':
      return <InlineCta {...(rest as Omit<CtaBannerInlineProps, 'variant'>)} />
    case 'card':
      return <CardCta {...(rest as Omit<CtaBannerCardProps, 'variant'>)} />
    case 'final':
      return <FinalCta {...(rest as Omit<CtaBannerFinalProps, 'variant'>)} />
  }
}
