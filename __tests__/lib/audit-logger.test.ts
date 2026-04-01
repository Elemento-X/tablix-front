/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { audit } from '@/lib/audit-logger'

describe('audit-logger.ts', () => {
  const createRequest = (
    url = 'http://localhost:3000/api/preview',
    method = 'POST',
    headers: Record<string, string> = {},
  ) => {
    return new NextRequest(url, { method, headers: new Headers(headers) })
  }

  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('audit()', () => {
    it('should log with [AUDIT] prefix and JSON payload', () => {
      const request = createRequest()
      audit(request, { action: 'upload.preview' })

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const [prefix, jsonStr] = consoleSpy.mock.calls[0]
      expect(prefix).toBe('[AUDIT]')

      const log = JSON.parse(jsonStr)
      expect(log.action).toBe('upload.preview')
      expect(log.method).toBe('POST')
      expect(log.path).toBe('/api/preview')
    })

    it('should include ISO timestamp', () => {
      const request = createRequest()
      audit(request, { action: 'upload.process' })

      const jsonStr = consoleSpy.mock.calls[0][1]
      const log = JSON.parse(jsonStr)
      expect(log.t).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include masked IP from x-forwarded-for (IPv4)', () => {
      const request = createRequest(undefined, 'POST', {
        'x-forwarded-for': '203.0.113.45',
      })
      audit(request, { action: 'rate_limit.hit' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.ip).toBe('203.0.113.***')
    })

    it('should mask last octet of x-forwarded-for (first IP when multiple)', () => {
      const request = createRequest(undefined, 'POST', {
        'x-forwarded-for': '10.0.1.5, 172.16.0.1',
      })
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.ip).toBe('10.0.1.***')
    })

    it('should use *** when x-forwarded-for is not an IPv4 address', () => {
      const request = createRequest(undefined, 'POST', {
        'x-forwarded-for': '::1',
      })
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.ip).toBe('***')
    })

    it('should use *** when no x-forwarded-for header is present', () => {
      const request = createRequest()
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.ip).toBe('***')
    })

    it('should override IP with entry.ip when provided', () => {
      const request = createRequest(undefined, 'POST', {
        'x-forwarded-for': '203.0.113.45',
      })
      audit(request, { action: 'upload.preview', ip: 'custom-ip' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.ip).toBe('custom-ip')
    })

    it('should truncate fingerprint to first 8 chars followed by ...', () => {
      const request = createRequest()
      audit(request, {
        action: 'upload.preview',
        fingerprint: 'abcdef1234567890',
      })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.fp).toBe('abcdef12...')
    })

    it('should omit fp field when fingerprint is not provided', () => {
      const request = createRequest()
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log).not.toHaveProperty('fp')
    })

    it('should include plan field when provided', () => {
      const request = createRequest()
      audit(request, { action: 'quota.exceeded', plan: 'free' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.plan).toBe('free')
    })

    it('should omit plan field when not provided', () => {
      const request = createRequest()
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log).not.toHaveProperty('plan')
    })

    it('should include detail field when provided', () => {
      const request = createRequest()
      audit(request, {
        action: 'validation.failed',
        detail: 'invalid mime type',
      })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.detail).toBe('invalid mime type')
    })

    it('should omit detail field when not provided', () => {
      const request = createRequest()
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log).not.toHaveProperty('detail')
    })

    it('should handle all supported action types without throwing', () => {
      const actions = [
        'upload.preview',
        'upload.process',
        'unification.complete',
        'rate_limit.hit',
        'quota.exceeded',
        'validation.failed',
        'csrf.blocked',
        'auth.token_invalid',
      ] as const

      for (const action of actions) {
        const request = createRequest()
        expect(() => audit(request, { action })).not.toThrow()
      }

      expect(consoleSpy).toHaveBeenCalledTimes(actions.length)
    })

    it('should log correct method and path for GET requests on different routes', () => {
      const request = createRequest(
        'http://localhost:3000/api/unification/complete',
        'GET',
      )
      audit(request, { action: 'unification.complete' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      expect(log.method).toBe('GET')
      expect(log.path).toBe('/api/unification/complete')
    })

    it('should not include sensitive full IP — last octet always masked', () => {
      const request = createRequest(undefined, 'POST', {
        'x-forwarded-for': '192.168.1.100',
      })
      audit(request, { action: 'upload.preview' })

      const log = JSON.parse(consoleSpy.mock.calls[0][1])
      // Must not expose the last octet
      expect(log.ip).not.toContain('100')
      expect(log.ip).toBe('192.168.1.***')
    })
  })
})
