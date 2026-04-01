'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

interface StepTransitionProps {
  stepKey: string
  children: ReactNode
  direction?: 'forward' | 'backward'
}

const DURATION = 0.22

function focusFirstHeading(container: HTMLDivElement | null) {
  if (!container) return
  const heading = container.querySelector<HTMLElement>('h1, h2, h3')
  if (heading) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

export function StepTransition({
  stepKey,
  children,
  direction = 'forward',
}: StepTransitionProps) {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleAnimationComplete = useCallback(() => {
    focusFirstHeading(containerRef.current)
  }, [])

  // Focus heading on step change for reduced motion users (no onAnimationComplete)
  useEffect(() => {
    if (prefersReducedMotion) {
      focusFirstHeading(containerRef.current)
    }
  }, [stepKey, prefersReducedMotion])

  if (prefersReducedMotion) {
    return (
      <div key={stepKey} ref={containerRef}>
        {children}
      </div>
    )
  }

  const xOffset = direction === 'forward' ? 24 : -24

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        ref={containerRef}
        initial={{ opacity: 0, x: xOffset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -xOffset }}
        transition={{ duration: DURATION, ease: 'easeInOut' }}
        onAnimationComplete={handleAnimationComplete}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
