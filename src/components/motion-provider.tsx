'use client'

import type React from 'react'
import { MotionConfig } from 'framer-motion'

/**
 * Overrides framer-motion's default reduced-motion behavior.
 *
 * By default, framer-motion reads `prefers-reduced-motion` from the OS
 * and silently disables ALL animations. Setting `reducedMotion="user"`
 * tells framer-motion to never auto-disable — our `useReducedMotion` hook
 * handles the opt-out per component instead.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
