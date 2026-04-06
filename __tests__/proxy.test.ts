/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { proxy, config } from '@/proxy'

describe('proxy', () => {
  const createRequest = (url = 'http://localhost:3000/') => {
    return new NextRequest(url)
  }

  describe('security headers', () => {
    it('should set X-DNS-Prefetch-Control header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('on')
    })

    it('should set Strict-Transport-Security header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=63072000; includeSubDomains; preload',
      )
    })

    it('should set X-Frame-Options header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('should set X-Content-Type-Options header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('should set Referrer-Policy header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('should not set deprecated X-XSS-Protection header', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-XSS-Protection')).toBeNull()
    })

    it('should set __csrf cookie on GET requests when not present', () => {
      const request = createRequest()
      const response = proxy(request)

      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('__csrf=')
      expect(setCookie?.toLowerCase()).toContain('samesite=strict')
      expect(setCookie).toContain('Path=/')
    })

    it('should not overwrite __csrf cookie when already present', () => {
      const request = new NextRequest('http://localhost:3000/', {
        headers: { cookie: '__csrf=existing-token' },
      })
      const response = proxy(request)

      const setCookie = response.headers.get('set-cookie')
      // Should not set a new __csrf cookie (null means no Set-Cookie header)
      expect(setCookie === null || !setCookie.includes('__csrf=')).toBe(true)
    })
  })

  describe('Permissions-Policy header', () => {
    it('should set comprehensive Permissions-Policy header', () => {
      const request = createRequest()
      const response = proxy(request)

      const permissionsPolicy = response.headers.get('Permissions-Policy')
      const requiredPolicies = [
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
      ]

      for (const policy of requiredPolicies) {
        expect(permissionsPolicy).toContain(policy)
      }
    })
  })

  describe('Content-Security-Policy header', () => {
    it('should set Content-Security-Policy header', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toBeDefined()
      expect(csp).not.toBeNull()
    })

    it('should have default-src self directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
    })

    it('should have script-src directive without unsafe-inline', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain('https://vercel.live')

      // Extract script-src directive and verify no unsafe-inline
      const scriptSrc = csp!.split(';').find((d) => d.trim().startsWith('script-src'))
      expect(scriptSrc).not.toContain('unsafe-inline')
      expect(scriptSrc).not.toContain('unsafe-eval')
    })

    it('should have style-src directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    })

    it('should have img-src directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("img-src 'self' data: blob: https:")
    })

    it('should have font-src directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("font-src 'self' data:")
    })

    it('should have connect-src directive for Vercel', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain('connect-src')
      expect(csp).toContain('https://vercel.live')
      expect(csp).toContain('https://*.vercel-insights.com')
    })

    it('should have worker-src self directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("worker-src 'self'")
    })

    it('should have frame-ancestors directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('should have base-uri directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("base-uri 'self'")
    })

    it('should have form-action directive', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("form-action 'self'")
    })
  })

  describe('response handling', () => {
    it('should return a NextResponse', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response).toBeDefined()
      expect(response.headers).toBeDefined()
    })

    it('should apply headers to all paths', () => {
      const paths = [
        'http://localhost:3000/',
        'http://localhost:3000/upload',
        'http://localhost:3000/api/usage',
        'http://localhost:3000/some/nested/path',
      ]

      for (const path of paths) {
        const request = createRequest(path)
        const response = proxy(request)

        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('Content-Security-Policy')).toBeDefined()
      }
    })
  })

  describe('config matcher', () => {
    it('should have matcher configuration', () => {
      expect(config).toBeDefined()
      expect(config.matcher).toBeDefined()
      expect(Array.isArray(config.matcher)).toBe(true)
    })

    it('should exclude static files from matching', () => {
      const matcherPattern = config.matcher[0]

      // These patterns should be excluded
      expect(matcherPattern).toContain('_next/static')
      expect(matcherPattern).toContain('_next/image')
      expect(matcherPattern).toContain('favicon.ico')
    })

    it('should exclude image files from matching', () => {
      const matcherPattern = config.matcher[0]

      // Image extensions should be excluded
      expect(matcherPattern).toContain('svg')
      expect(matcherPattern).toContain('png')
      expect(matcherPattern).toContain('jpg')
      expect(matcherPattern).toContain('jpeg')
      expect(matcherPattern).toContain('gif')
      expect(matcherPattern).toContain('webp')
    })
  })

  describe('CSRF protection', () => {
    const createPostRequest = (
      url: string,
      origin?: string | null,
      host?: string,
      options?: { csrfToken?: string },
    ) => {
      const headers: Record<string, string> = {}
      if (origin !== null && origin !== undefined) {
        headers.origin = origin
      }
      if (host) {
        headers.host = host
      }
      if (options?.csrfToken) {
        headers['X-CSRF-Token'] = options.csrfToken
        headers.cookie = `__csrf=${options.csrfToken}`
      }
      return new NextRequest(url, { method: 'POST', headers })
    }

    it('should block POST to /api/ without Origin header', () => {
      const request = new NextRequest('http://localhost:3000/api/preview', {
        method: 'POST',
      })
      const response = proxy(request)

      expect(response.status).toBe(403)
    })

    it('should block POST to /api/ with cross-origin Origin header', () => {
      const request = createPostRequest(
        'http://localhost:3000/api/preview',
        'http://evil.com',
        'localhost:3000',
      )
      const response = proxy(request)

      expect(response.status).toBe(403)
    })

    it('should allow POST to /api/ with same-origin Origin header and CSRF token', () => {
      const request = createPostRequest(
        'http://localhost:3000/api/preview',
        'http://localhost:3000',
        'localhost:3000',
        { csrfToken: 'test-csrf-token' },
      )
      const response = proxy(request)

      expect(response.status).not.toBe(403)
    })

    it('should block POST with valid origin but missing CSRF token', () => {
      const request = createPostRequest(
        'http://localhost:3000/api/preview',
        'http://localhost:3000',
        'localhost:3000',
      )
      const response = proxy(request)

      expect(response.status).toBe(403)
    })

    it('should block POST with mismatched CSRF cookie and header', () => {
      const headers: Record<string, string> = {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'X-CSRF-Token': 'token-a',
        cookie: '__csrf=token-b',
      }
      const request = new NextRequest('http://localhost:3000/api/preview', {
        method: 'POST',
        headers,
      })
      const response = proxy(request)

      expect(response.status).toBe(403)
    })

    it('should block POST with malformed Origin', () => {
      const headers = new Headers()
      headers.set('origin', 'not-a-valid-url')
      headers.set('host', 'localhost:3000')
      const request = new NextRequest('http://localhost:3000/api/process', {
        method: 'POST',
        headers,
      })
      const response = proxy(request)

      expect(response.status).toBe(403)
    })

    it('should not apply CSRF check to GET requests on /api/', () => {
      const request = new NextRequest('http://localhost:3000/api/usage')
      const response = proxy(request)

      expect(response.status).not.toBe(403)
    })

    it('should not apply CSRF check to non-API paths', () => {
      const request = new NextRequest('http://localhost:3000/upload', {
        method: 'POST',
      })
      const response = proxy(request)

      expect(response.status).not.toBe(403)
    })

    it('should not apply CSRF check to HEAD requests', () => {
      const request = new NextRequest('http://localhost:3000/api/usage', {
        method: 'HEAD',
      })
      const response = proxy(request)

      expect(response.status).not.toBe(403)
    })

    it('should not apply CSRF check to OPTIONS requests', () => {
      const request = new NextRequest('http://localhost:3000/api/preview', {
        method: 'OPTIONS',
      })
      const response = proxy(request)

      expect(response.status).not.toBe(403)
    })

    it('should return generic error message on CSRF failure', async () => {
      const request = createPostRequest(
        'http://localhost:3000/api/preview',
        'http://evil.com',
        'localhost:3000',
      )
      const response = proxy(request)
      const body = await response.json()

      expect(body.error).toBe('Forbidden')
      expect(body).not.toHaveProperty('details')
    })
  })

  describe('development mode CSP', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should include unsafe-eval and unsafe-inline in script-src in dev mode', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      const scriptSrc = csp!.split(';').find((d) => d.trim().startsWith('script-src'))
      expect(scriptSrc).toContain('unsafe-eval')
      expect(scriptSrc).toContain('unsafe-inline')
    })

    it('should include ws://localhost in connect-src in dev mode', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).toContain('ws://localhost:*')
    })

    it('should not include nonce or strict-dynamic in dev mode', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).not.toContain('strict-dynamic')
      expect(csp).not.toMatch(/nonce-/)
    })
  })

  describe('production mode CSP', () => {
    it('should include nonce and strict-dynamic in script-src', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      const scriptSrc = csp!.split(';').find((d) => d.trim().startsWith('script-src'))
      expect(scriptSrc).toContain('strict-dynamic')
      expect(scriptSrc).toMatch(/nonce-/)
    })

    it('should not include ws://localhost in connect-src in prod mode', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).not.toContain('ws://localhost')
    })

    it('should pass nonce via request headers (not response)', () => {
      const request = createRequest()
      const response = proxy(request)

      // Nonce should NOT be in response headers (security: not visible to client JS)
      expect(response.headers.get('x-nonce')).toBeNull()
    })
  })

  describe('X-Robots-Tag (preview/development environments)', () => {
    const originalVercelEnv = process.env.VERCEL_ENV

    afterEach(() => {
      if (originalVercelEnv === undefined) {
        delete process.env.VERCEL_ENV
      } else {
        process.env.VERCEL_ENV = originalVercelEnv
      }
    })

    it('should set X-Robots-Tag noindex when VERCEL_ENV is preview', () => {
      process.env.VERCEL_ENV = 'preview'

      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    })

    it('should set X-Robots-Tag noindex when VERCEL_ENV is development', () => {
      process.env.VERCEL_ENV = 'development'

      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    })

    it('should NOT set X-Robots-Tag when VERCEL_ENV is production', () => {
      process.env.VERCEL_ENV = 'production'

      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Robots-Tag')).toBeNull()
    })

    it('should NOT set X-Robots-Tag when VERCEL_ENV is undefined', () => {
      delete process.env.VERCEL_ENV

      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Robots-Tag')).toBeNull()
    })

    it('should apply X-Robots-Tag to all paths in preview', () => {
      process.env.VERCEL_ENV = 'preview'

      const paths = [
        'http://localhost:3000/',
        'http://localhost:3000/upload',
        'http://localhost:3000/api/usage',
      ]

      for (const path of paths) {
        const request = createRequest(path)
        const response = proxy(request)
        expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
      }
    })
  })

  describe('CSP connect-src includes Sentry ingest', () => {
    it('should include Sentry ingest domain in connect-src', () => {
      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).toContain('https://*.ingest.sentry.io')
    })

    it('should include Sentry ingest in connect-src in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const request = createRequest()
      const response = proxy(request)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).toContain('https://*.ingest.sentry.io')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('security best practices', () => {
    it('should prevent clickjacking with X-Frame-Options', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('should prevent MIME type sniffing', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('should enforce HTTPS with HSTS', () => {
      const request = createRequest()
      const response = proxy(request)

      const hsts = response.headers.get('Strict-Transport-Security')
      expect(hsts).toContain('max-age=63072000')
      expect(hsts).toContain('includeSubDomains')
      expect(hsts).toContain('preload')
    })

    it('should not set deprecated X-XSS-Protection header (CSP is sufficient)', () => {
      const request = createRequest()
      const response = proxy(request)

      expect(response.headers.get('X-XSS-Protection')).toBeNull()
    })

    it('should restrict form submissions to same origin', () => {
      const request = createRequest()
      const response = proxy(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("form-action 'self'")
    })
  })
})
