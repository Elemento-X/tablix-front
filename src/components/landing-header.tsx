'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useActiveSection } from '@/hooks/use-active-section'
import { LanguageSelector } from '@/components/language-selector'
import { LandingHeaderNav } from '@/components/landing-header-nav'
import { LandingHeaderMobile } from '@/components/landing-header-mobile'
import { Button } from '@/components/button'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const SECTION_IDS = ['how-it-works', 'audience', 'pricing']

export function LandingHeader() {
  const { t } = useLocale()
  const sectionIds = useMemo(() => SECTION_IDS, [])
  const activeSection = useActiveSection(sectionIds)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const headerScale = useTransform(scrollYProgress, [0, 0.02], [1, 0.95])

  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <motion.div style={prefersReducedMotion ? undefined : { scale: headerScale }}>
            <Link
              href="/"
              className="text-foreground flex items-center gap-2 text-xl font-semibold"
            >
              {t('header.brand')}
            </Link>
          </motion.div>
          <LandingHeaderNav activeSection={activeSection} />
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link href="/upload" className="hidden lg:inline-flex">
            <Button variant="brand" size="default">
              {t('header.cta')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <LandingHeaderMobile activeSection={activeSection} />
        </div>
      </div>

      {/* Scroll progress bar */}
      <motion.div
        className="bg-primary absolute bottom-0 left-0 h-0.5 origin-left"
        style={prefersReducedMotion ? { scaleX: 0 } : { scaleX: scrollYProgress }}
      />
    </header>
  )
}
