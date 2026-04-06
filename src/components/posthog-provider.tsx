'use client'

import type React from 'react'
import { useEffect } from 'react'
import { initPostHog } from '@/lib/analytics/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog().catch(() => {})
  }, [])

  return <>{children}</>
}
