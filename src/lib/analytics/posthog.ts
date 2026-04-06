import type { PostHog } from 'posthog-js'

let client: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null

/**
 * Initialize PostHog with privacy-hardened config.
 *
 * - Dynamic import: posthog-js is NOT in the critical path (~300KB saved)
 * - persistence: 'memory' — no cookies, no localStorage
 * - autocapture: false — only explicit events
 * - opt_out_capturing_by_default: true — zero collection pre-consent
 * - ip: false — no IP sent to PostHog
 *
 * Returns a promise that resolves to the PostHog instance, or null if key is missing.
 */
export async function initPostHog(): Promise<PostHog | null> {
  if (client) return client
  if (initPromise) return initPromise

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key) return null

  initPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        opt_out_capturing_by_default: true,
        person_profiles: 'identified_only',
        ip: false,
        property_denylist: ['$device_id'],
        loaded: (ph) => {
          if (process.env.NODE_ENV === 'development') {
            ph.debug()
          }
        },
      })

      client = posthog
      return client
    })
    .catch(() => {
      initPromise = null
      return null
    })

  return initPromise
}

/**
 * Returns the PostHog client if initialized, null otherwise.
 */
export function getPostHog(): PostHog | null {
  return client
}

/**
 * Opt in to capturing (called after cookie consent acceptance).
 * Also loads PostHog if not yet loaded — handles page reload with existing consent.
 */
export async function optInCapturing(): Promise<void> {
  if (!client) {
    await initPostHog()
  }
  client?.opt_in_capturing()
}
