/**
 * Tests for src/lib/constants.ts
 * Validates that exported constants have the correct values and types.
 * These constants are used across legal pages, footer, pricing, and metadata.
 */

import { SITE_URL, CONTACT_EMAIL, LEGAL_LAST_UPDATED } from '@/lib/constants'

describe('SITE_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof SITE_URL).toBe('string')
    expect(SITE_URL.length).toBeGreaterThan(0)
  })

  it('starts with https://', () => {
    expect(SITE_URL.startsWith('https://')).toBe(true)
  })

  it('does not end with a trailing slash', () => {
    expect(SITE_URL.endsWith('/')).toBe(false)
  })

  it('equals the canonical production URL', () => {
    expect(SITE_URL).toBe('https://tablix.me')
  })
})

describe('CONTACT_EMAIL', () => {
  it('is a non-empty string', () => {
    expect(typeof CONTACT_EMAIL).toBe('string')
    expect(CONTACT_EMAIL.length).toBeGreaterThan(0)
  })

  it('is a valid email format', () => {
    expect(CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })

  it('equals the canonical contact address', () => {
    expect(CONTACT_EMAIL).toBe('contact@tablix.me')
  })

  it('does not contain the old Brazilian address', () => {
    expect(CONTACT_EMAIL).not.toBe('contato@tablix.me')
    expect(CONTACT_EMAIL).not.toContain('contato')
  })

  it('is safe to interpolate into an href attribute (no whitespace)', () => {
    expect(CONTACT_EMAIL).not.toMatch(/\s/)
  })
})

describe('LEGAL_LAST_UPDATED', () => {
  it('is a non-empty string', () => {
    expect(typeof LEGAL_LAST_UPDATED).toBe('string')
    expect(LEGAL_LAST_UPDATED.length).toBeGreaterThan(0)
  })

  it('matches ISO 8601 date format YYYY-MM-DD', () => {
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is a valid calendar date', () => {
    const date = new Date(LEGAL_LAST_UPDATED)
    expect(isNaN(date.getTime())).toBe(false)
  })

  it('is not in the future', () => {
    const date = new Date(LEGAL_LAST_UPDATED)
    expect(date.getTime()).toBeLessThanOrEqual(Date.now())
  })
})
