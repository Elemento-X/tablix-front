'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import type { ReactNode } from 'react'

interface AnimatedListProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  'data-testid'?: string
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export function AnimatedList({
  children,
  className,
  staggerDelay = 0.05,
  'data-testid': testId,
}: AnimatedListProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      data-testid={testId}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
  'data-testid'?: string
}

export function AnimatedListItem({
  children,
  className,
  'data-testid': testId,
}: AnimatedListItemProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      data-testid={testId}
      variants={itemVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
