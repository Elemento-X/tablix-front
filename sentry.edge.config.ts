import * as Sentry from '@sentry/nextjs'
import { sanitizeEvent, filterBreadcrumb } from './sentry.shared'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  beforeSend: sanitizeEvent,
  beforeBreadcrumb: filterBreadcrumb,
})
