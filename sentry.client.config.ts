import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  ignoreErrors: [
    'AbortError',
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Load failed',
    'Failed to fetch',
    'NetworkError',
    'ChunkLoadError',
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /vercel\.live/,
    /vercel-scripts\.com/,
    /vercel-insights\.com/,
  ],

  beforeSend(event) {
    // Strip cookies
    if (event.request) {
      delete event.request.cookies

      if (event.request.headers) {
        delete event.request.headers.cookie
        delete event.request.headers.authorization
        delete event.request.headers['x-nonce']
        delete event.request.headers['x-health-secret']
        delete event.request.headers['x-forwarded-for']
      }

      // Redact query params (may contain tokens)
      if (event.request.query_string) {
        event.request.query_string = '[REDACTED]'
      }
    }

    // Strip user IP if attached by SDK
    if (event.user) {
      delete event.user.ip_address
    }

    return event
  },

  beforeBreadcrumb(breadcrumb) {
    // Filter breadcrumbs that may contain sensitive URLs
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      const url = breadcrumb.data?.url as string | undefined
      if (url && /token|fingerprint|unification/i.test(url)) {
        return null
      }
    }
    return breadcrumb
  },
})
