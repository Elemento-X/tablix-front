'use client'

import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Cookie } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Button } from '@/components/button'

const STORAGE_KEY = 'tablix-cookie-consent'
const APPEAR_DELAY_MS = 1500

export function CookieConsent() {
  const { t } = useLocale()
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const descriptionId = useId()

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY)
    if (consent) return

    const timer = setTimeout(() => setVisible(true), reducedMotion ? 0 : APPEAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  const motionProps = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 16 },
        transition: {
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
      }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label={t('cookieConsent.ariaLabel')}
          aria-describedby={descriptionId}
          className="fixed inset-x-0 bottom-0 z-50 p-0 sm:right-auto sm:bottom-4 sm:left-4 sm:p-0"
          onAnimationComplete={() => buttonRef.current?.focus()}
          {...motionProps}
        >
          <div className="bg-card border-border rounded-t-xl border p-4 pb-6 shadow-md sm:max-w-sm sm:rounded-xl sm:p-5 sm:pb-5 dark:shadow-lg dark:shadow-black/20">
            <div className="mb-2 flex items-center gap-2">
              <Cookie className="text-muted-foreground h-4 w-4" />
              <span className="text-foreground text-sm font-medium">
                {t('cookieConsent.title')}
              </span>
            </div>

            <p id={descriptionId} className="text-muted-foreground mb-4 text-xs leading-relaxed">
              {t('cookieConsent.message')}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/privacy-policy"
                className="text-xs text-teal-700 underline underline-offset-2 dark:text-teal-500"
              >
                {t('cookieConsent.learnMore')}
              </Link>
              <Button ref={buttonRef} variant="brand" size="sm" onClick={handleAccept}>
                {t('cookieConsent.accept')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
