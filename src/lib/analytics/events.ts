import { getPostHog } from './posthog'

type UsageBucket = 'low' | 'medium' | 'near_limit' | 'at_limit'

type EventMap = {
  landing_cta_click: { locale: string }
  upload_started: { fileCount: number; totalSizeMB: number }
  upload_completed: {
    fileCount: number
    totalSizeMB: number
    fileTypes: string[]
    parseTimeMs: number
    columnCount: number
  }
  upload_error: { errorType: string; fileCount: number }
  preview_generated: { columnCount: number; selectedColumns: number }
  download_started: {
    fileCount: number
    selectedColumns: number
    processingMode: 'client' | 'server'
  }
  download_completed: {
    fileCount: number
    rowCount: number | null
    selectedColumns: number
    processingMode: 'client' | 'server'
    processTimeMs: number
  }
  plan_limit_reached: {
    limitType: 'unifications' | 'fileSize' | 'fileCount' | 'columns' | 'rows' | 'totalSize'
    usageBucket: UsageBucket
  }
}

export type AnalyticsEvent = keyof EventMap

/**
 * Track a typed analytics event. No-op if PostHog is not initialized
 * or if the user hasn't opted in.
 */
export function trackEvent<E extends AnalyticsEvent>(event: E, properties: EventMap[E]): void {
  const client = getPostHog()
  if (!client) return
  client.capture(event, properties)
}
