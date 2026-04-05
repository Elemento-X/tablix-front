'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import type { HTMLAttributes, ReactNode } from 'react'

interface AnimatedListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export function AnimatedList({
  children,
  className,
  staggerDelay = 0.05,
  ...rest
}: AnimatedListProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export function AnimatedListItem({ children, className, ...rest }: AnimatedListItemProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      variants={itemVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
