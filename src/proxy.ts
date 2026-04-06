import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/config/env'

export function proxy(request: NextRequest) {
  const isStateChanging =
    request.nextUrl.pathname.startsWith('/api/') &&
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.method !== 'OPTIONS'

  // CSRF protection layer 1: validate Origin header on state-changing API requests
  if (isStateChanging) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (!origin || !host) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // CSRF protection layer 2: double-submit cookie validation
  if (isStateChanging) {
    const csrfCookie = request.cookies.get('__csrf')?.value
    const csrfHeader = request.headers.get('X-CSRF-Token')

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = env.NODE_ENV === 'development'

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live https://*.vercel-scripts.com`

  // unsafe-inline is required because:
  // 1. Framer Motion applies inline style attributes (transform, opacity) at runtime — nonce cannot cover these
  // 2. Components use dynamic style={} for computed values (grid-background, dropdown-menu, usage-status)
  // 3. Nonce-based CSP only works with <style> tags, not inline style attributes
  // Removing unsafe-inline would require replacing all Framer Motion animations with pure CSS,
  // which is disproportionate to the security gain (CSS injection is low-severity vs XSS).
  // Investigated 2026-04-04 — decision: keep unsafe-inline, document justification.
  const styleSrc = "style-src 'self' 'unsafe-inline'"

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${isDev ? 'ws://localhost:* ws://127.0.0.1:* ws://0.0.0.0:* ' : ''}https://vercel.live https://*.vercel-insights.com https://*.vercel-scripts.com https://*.ingest.sentry.io`,
    "worker-src 'self'",
    "frame-src 'self' https://vercel.live",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  if (!isDev) {
    cspDirectives.push('upgrade-insecure-requests')
  }

  const cspHeader = cspDirectives.join('; ')

  // Pass nonce via request headers (invisible to browser, accessible in server components)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'serial=()',
      'midi=()',
      'display-capture=()',
      'xr-spatial-tracking=()',
      'browsing-topics=()',
    ].join(', '),
  )

  response.headers.set('Content-Security-Policy', cspHeader)

  // CSRF double-submit cookie: set if not present
  if (!request.cookies.get('__csrf')?.value) {
    const csrfToken = crypto.randomUUID()
    const isProduction = env.NODE_ENV === 'production'
    response.cookies.set('__csrf', csrfToken, {
      httpOnly: false, // Must be readable by JS for double-submit pattern
      sameSite: 'strict',
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })
  }

  // Prevent search engines from indexing preview/non-production deploys
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
