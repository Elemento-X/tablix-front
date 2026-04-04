import type * as Sentry from '@sentry/nextjs'

/**
 * Shared Sentry sanitization callbacks.
 * Single source of truth — used by client, server, and edge configs.
 * Prevents drift when one config is updated but others are forgotten.
 */

type SentryEvent = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>
>[0]
type SentryBreadcrumb = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]['beforeBreadcrumb']>
>[0]

export function sanitizeEvent(event: SentryEvent): SentryEvent | null {
  if (event.request) {
    delete event.request.cookies

    if (event.request.headers) {
      delete event.request.headers.cookie
      delete event.request.headers.authorization
      delete event.request.headers['x-nonce']
      delete event.request.headers['x-health-secret']
      delete event.request.headers['x-forwarded-for']
    }

    if (event.request.query_string) {
      event.request.query_string = '[REDACTED]'
    }
  }

  if (event.user) {
    delete event.user.ip_address
  }

  return event
}

export function filterBreadcrumb(
  breadcrumb: SentryBreadcrumb,
): SentryBreadcrumb | null {
  if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
    const url = breadcrumb.data?.url as string | undefined
    if (url && /token|fingerprint|unification/i.test(url)) {
      return null
    }
  }
  return breadcrumb
}
