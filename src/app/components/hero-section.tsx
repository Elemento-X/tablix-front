'use client'

import type { MouseEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { GridBackground } from '@/components/grid-background'
import { useLocale } from '@/lib/i18n'
import { EASING, SPRING, TIMING } from '@/lib/motion'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const MotionLink = motion.create(Link)

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*'

/** Cryptographic decode effect — each letter cycles through random chars before locking in */
function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState(text)
  const rafRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const spanRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    hasAnimated.current = false
    setDisplayed(text)
  }, [text])

  const animate = useCallback(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    const speed = 30
    const charsPerTick = 0.4
    let iteration = 0
    let last = 0

    function tick(time: number) {
      if (time - last < speed) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      last = time

      const result = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          if (i < iteration) return char
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        })
        .join('')

      setDisplayed(result)
      iteration += charsPerTick

      if (iteration >= text.length) {
        setDisplayed(text)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [text])

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutRef.current = setTimeout(animate, 200)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      clearTimeout(timeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [animate, text])

  return (
    <span ref={spanRef} className={className}>
      {displayed}
    </span>
  )
}

export function HeroSection() {
  const { t } = useLocale()

  const handleScrollToHowItWorks = (e: MouseEvent) => {
    e.preventDefault()
    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative mx-auto max-w-5xl px-4 pt-12 pb-10 sm:px-6 sm:pt-20 sm:pb-16">
      <GridBackground animated />
      <div className="relative text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: TIMING.normal, ease: EASING.enter }}
        >
          <Badge variant="outline" className="mb-4 text-xs font-medium">
            {t('hero.earlyAccess')}
          </Badge>
        </motion.div>

        {/* Title — fade in + scramble decode */}
        <motion.h1
          className="text-foreground text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl md:text-4xl lg:text-5xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: TIMING.slow, ease: EASING.enter, delay: 0.15 }}
        >
          <ScrambleText text={t('hero.title')} />
        </motion.h1>

        {/* Subtitle — blur dissolve */}
        <motion.p
          className="text-muted-foreground mx-auto mt-4 max-w-3xl text-lg text-balance sm:mt-6 sm:text-xl"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: TIMING.slow, ease: EASING.enter, delay: 0.5 }}
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* CTAs — spring entrance */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MotionLink
            href="/upload"
            data-testid="cta-upload"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ ...SPRING.gentle, delay: 0.6 }}
          >
            <Button
              variant="brand"
              size="lg"
              className="h-12 px-8 text-base shadow-lg transition-shadow hover:shadow-xl hover:shadow-teal-500/20"
            >
              {t('hero.cta')}
              <motion.span
                className="ml-2 inline-flex"
                whileHover={{ x: 4 }}
                transition={SPRING.button}
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.span>
            </Button>
          </MotionLink>

          <motion.a
            href="#how-it-works"
            onClick={handleScrollToHowItWorks}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ ...SPRING.gentle, delay: 0.7 }}
          >
            <Button variant="ghost" size="lg" className="text-muted-foreground h-12 px-8 text-base">
              {t('hero.ctaSecondary')}
              <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
