/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware, config } from '@/middleware'

describe('middleware', () => {
  const createRequest = (url = 'http://localhost:3000/') => {
    return new NextRequest(url)
  }

  describe('security headers', () => {
    it('should set X-DNS-Prefetch-Control header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('on')
    })

    it('should set Strict-Transport-Security header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=63072000; includeSubDomains; preload',
      )
    })

    it('should set X-Frame-Options header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })

    it('should set X-Content-Type-Options header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('should set Referrer-Policy header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('should set X-XSS-Protection header', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })

  describe('Permissions-Policy header', () => {
    it('should set Permissions-Policy header', () => {
      const request = createRequest()
      const response = middleware(request)

      const permissionsPolicy = response.headers.get('Permissions-Policy')
      expect(permissionsPolicy).toContain('camera=()')
      expect(permissionsPolicy).toContain('microphone=()')
      expect(permissionsPolicy).toContain('geolocation=()')
      expect(permissionsPolicy).toContain('interest-cohort=()')
    })

    it('should deny camera access', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Permissions-Policy')).toContain('camera=()')
    })

    it('should deny microphone access', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Permissions-Policy')).toContain('microphone=()')
    })

    it('should deny geolocation access', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Permissions-Policy')).toContain('geolocation=()')
    })

    it('should disable FLoC (interest-cohort)', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('Permissions-Policy')).toContain('interest-cohort=()')
    })
  })

  describe('Content-Security-Policy header', () => {
    it('should set Content-Security-Policy header', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toBeDefined()
      expect(csp).not.toBeNull()
    })

    it('should have default-src self directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
    })

    it('should have script-src directive without unsafe-inline', () => {
      const request = createRequest()
      const response = middleware(request)

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
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    })

    it('should have img-src directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("img-src 'self' data: blob: https:")
    })

    it('should have font-src directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("font-src 'self' data:")
    })

    it('should have connect-src directive for Vercel', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain('connect-src')
      expect(csp).toContain('https://vercel.live')
      expect(csp).toContain('https://*.vercel-insights.com')
    })

    it('should have frame-ancestors directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("frame-ancestors 'self'")
    })

    it('should have base-uri directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("base-uri 'self'")
    })

    it('should have form-action directive', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("form-action 'self'")
    })
  })

  describe('response handling', () => {
    it('should return a NextResponse', () => {
      const request = createRequest()
      const response = middleware(request)

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
        const response = middleware(request)

        expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
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

  describe('security best practices', () => {
    it('should prevent clickjacking with X-Frame-Options', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })

    it('should prevent MIME type sniffing', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('should enforce HTTPS with HSTS', () => {
      const request = createRequest()
      const response = middleware(request)

      const hsts = response.headers.get('Strict-Transport-Security')
      expect(hsts).toContain('max-age=63072000')
      expect(hsts).toContain('includeSubDomains')
      expect(hsts).toContain('preload')
    })

    it('should enable XSS protection', () => {
      const request = createRequest()
      const response = middleware(request)

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should restrict form submissions to same origin', () => {
      const request = createRequest()
      const response = middleware(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("form-action 'self'")
    })
  })
})
