/**
 * Tests for src/app/robots.ts
 * Validates robots.txt output: correct format, user-agent rules, disallow paths, sitemap URL
 */

import robots from '@/app/robots'

describe('robots()', () => {
  const result = robots()

  it('returns an object', () => {
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('has rules array', () => {
    expect(Array.isArray(result.rules)).toBe(true)
    expect(result.rules).toHaveLength(1)
  })

  it('applies rules to all user agents', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    expect(rule.userAgent).toBe('*')
  })

  it('allows root path', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    expect(rule.allow).toBe('/')
  })

  it('disallows /api/ path', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]
    expect(disallow).toContain('/api/')
  })

  it('disallows /upload path', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]
    expect(disallow).toContain('/upload')
  })

  it('disallows /_next/ path', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]
    expect(disallow).toContain('/_next/')
  })

  it('includes sitemap URL', () => {
    expect(result.sitemap).toBeDefined()
    expect(typeof result.sitemap).toBe('string')
    expect(result.sitemap).toContain('sitemap.xml')
  })

  it('sitemap URL points to tablix.me', () => {
    expect(result.sitemap).toContain('tablix.me')
  })

  it('sitemap URL uses HTTPS', () => {
    expect(result.sitemap).toMatch(/^https:\/\//)
  })

  it('is deterministic — same output on every call', () => {
    const a = robots()
    const b = robots()
    expect(JSON.stringify(a.rules)).toBe(JSON.stringify(b.rules))
    expect(a.sitemap).toBe(b.sitemap)
  })
})
