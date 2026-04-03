import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Strip cookies and sensitive headers
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

    // Strip user IP if somehow attached
    if (event.user) {
      delete event.user.ip_address
    }

    return event
  },

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      const url = breadcrumb.data?.url as string | undefined
      if (url && /token|fingerprint|unification/i.test(url)) {
        return null
      }
    }
    return breadcrumb
  },
})
