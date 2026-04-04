import * as Sentry from '@sentry/nextjs'
import { sanitizeEvent, filterBreadcrumb } from './sentry.shared'

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

  beforeSend: sanitizeEvent,
  beforeBreadcrumb: filterBreadcrumb,
})
