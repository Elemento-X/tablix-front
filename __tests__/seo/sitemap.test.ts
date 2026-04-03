/**
 * Tests for src/app/sitemap.ts
 * Validates sitemap output: 3 URLs, correct priorities, frequencies, HTTPS, valid format
 */

import sitemap from '@/app/sitemap'

describe('sitemap()', () => {
  const result = sitemap()

  it('returns an array', () => {
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns exactly 4 entries', () => {
    expect(result).toHaveLength(4)
  })

  it('every entry has a url property', () => {
    result.forEach((entry) => {
      expect(typeof entry.url).toBe('string')
      expect(entry.url.length).toBeGreaterThan(0)
    })
  })

  it('every URL uses HTTPS', () => {
    result.forEach((entry) => {
      expect(entry.url).toMatch(/^https:\/\//)
    })
  })

  it('every URL is on tablix.me', () => {
    result.forEach((entry) => {
      expect(entry.url).toContain('tablix.me')
    })
  })

  it('contains home page entry at root URL', () => {
    const home = result.find((e) => e.url === 'https://tablix.me')
    expect(home).toBeDefined()
  })

  it('contains /privacy-policy entry', () => {
    const pp = result.find((e) => e.url.endsWith('/privacy-policy'))
    expect(pp).toBeDefined()
  })

  it('contains /terms entry', () => {
    const terms = result.find((e) => e.url.endsWith('/terms'))
    expect(terms).toBeDefined()
  })

  it('contains /pricing entry', () => {
    const pricing = result.find((e) => e.url.endsWith('/pricing'))
    expect(pricing).toBeDefined()
  })

  it('home page has priority 1', () => {
    const home = result.find((e) => e.url === 'https://tablix.me')
    expect(home?.priority).toBe(1)
  })

  it('/privacy-policy has priority 0.3', () => {
    const pp = result.find((e) => e.url.endsWith('/privacy-policy'))
    expect(pp?.priority).toBe(0.3)
  })

  it('/terms has priority 0.3', () => {
    const terms = result.find((e) => e.url.endsWith('/terms'))
    expect(terms?.priority).toBe(0.3)
  })

  it('/pricing has priority 0.8', () => {
    const pricing = result.find((e) => e.url.endsWith('/pricing'))
    expect(pricing?.priority).toBe(0.8)
  })

  it('home page has changeFrequency "weekly"', () => {
    const home = result.find((e) => e.url === 'https://tablix.me')
    expect(home?.changeFrequency).toBe('weekly')
  })

  it('/privacy-policy has changeFrequency "monthly"', () => {
    const pp = result.find((e) => e.url.endsWith('/privacy-policy'))
    expect(pp?.changeFrequency).toBe('monthly')
  })

  it('/terms has changeFrequency "monthly"', () => {
    const terms = result.find((e) => e.url.endsWith('/terms'))
    expect(terms?.changeFrequency).toBe('monthly')
  })

  it('/pricing has changeFrequency "weekly"', () => {
    const pricing = result.find((e) => e.url.endsWith('/pricing'))
    expect(pricing?.changeFrequency).toBe('weekly')
  })

  it('every entry has lastModified as a Date', () => {
    result.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date)
    })
  })

  it('lastModified dates are close to now (not in far past or future)', () => {
    const now = Date.now()
    const oneMinuteMs = 60 * 1000
    result.forEach((entry) => {
      const ts = (entry.lastModified as Date).getTime()
      expect(Math.abs(ts - now)).toBeLessThan(oneMinuteMs)
    })
  })

  it('all priorities are valid numbers between 0 and 1', () => {
    result.forEach((entry) => {
      if (entry.priority !== undefined) {
        expect(entry.priority).toBeGreaterThanOrEqual(0)
        expect(entry.priority).toBeLessThanOrEqual(1)
      }
    })
  })

  it('no duplicate URLs', () => {
    const urls = result.map((e) => e.url)
    const unique = new Set(urls)
    expect(unique.size).toBe(urls.length)
  })
})
