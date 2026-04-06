/**
 * Motion system — Tablix "Grid Vivo" animation constants.
 *
 * Centralizes timings, easings, and spring presets so animation
 * values are consistent across all landing page sections.
 */

/** Duration presets (seconds) */
export const TIMING = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  reveal: 0.5,
  stagger: 0.06,
} as const

/** Cubic-bezier easing curves */
export const EASING = {
  enter: [0.25, 0.46, 0.45, 0.94] as const,
  exit: [0.55, 0.06, 0.68, 0.19] as const,
}

/** Spring physics presets for framer-motion */
export const SPRING = {
  button: { type: 'spring' as const, stiffness: 400, damping: 30 },
  gentle: { type: 'spring' as const, stiffness: 300, damping: 24 },
  pop: { type: 'spring' as const, stiffness: 500, damping: 25 },
}

/** Reusable framer-motion variants */
export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: TIMING.normal, ease: EASING.enter } },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: TIMING.slow, ease: EASING.enter } },
  },
  blurDissolve: {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: { duration: TIMING.slow, ease: EASING.enter },
    },
  },
  springPop: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: SPRING.pop },
  },
  /** Parent container for staggered children */
  staggerContainer: (staggerDelay: number = TIMING.stagger) => ({
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay },
    },
  }),
  /** Child for word-split / item-stagger reveals */
  wordReveal: {
    hidden: { y: '110%', opacity: 0 },
    visible: {
      y: '0%',
      opacity: 1,
      transition: { duration: TIMING.reveal, ease: EASING.enter },
    },
  },
} as const
