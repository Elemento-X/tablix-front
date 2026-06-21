/**
 * Tests for src/app/sitemap.ts
 * Validates sitemap output: marketing + legal + blog URLs, priorities,
 * frequencies, HTTPS, hreflang alternates and valid lastmod format.
 */

import sitemap from '@/app/sitemap'
import type { MetadataRoute } from 'next'

describe('sitemap()', () => {
  let result: MetadataRoute.Sitemap

  beforeAll(async () => {
    result = await sitemap()
  })

  it('returns an array', () => {
    expect(Array.isArray(result)).toBe(true)
  })

  it('includes the 3 static marketing/legal pairs plus pricing, blog index and 4 articles', () => {
    // home, pricing, blog, 4 articles, privacy, terms = 8 base + 4 articles? -> 12
    expect(result).toHaveLength(12)
  })

  it('includes the merge-excel use-case landing with hreflang alternates', () => {
    const landing = result.find((e) => e.url.endsWith('/juntar-planilhas-excel'))
    expect(landing).toBeDefined()
    expect(landing?.alternates?.languages).toBeDefined()
  })

  it('contains the blog index entry', () => {
    const blog = result.find((e) => e.url === 'https://tablix.me/blog')
    expect(blog).toBeDefined()
    expect(blog?.priority).toBe(0.7)
  })

  it('contains every published blog article', () => {
    const slugs = [
      'como-combinar-arquivos-csv',
      'como-juntar-planilhas-no-excel',
      'como-unir-varias-planilhas',
      'csv-ou-xlsx-qual-usar',
    ]
    slugs.forEach((slug) => {
      const entry = result.find((e) => e.url === `https://tablix.me/blog/${slug}`)
      expect(entry).toBeDefined()
      expect(entry?.priority).toBe(0.7)
      expect(entry?.alternates?.languages).toBeDefined()
    })
  })

  it('every entry has a non-empty url property', () => {
    result.forEach((entry) => {
      expect(typeof entry.url).toBe('string')
      expect(entry.url.length).toBeGreaterThan(0)
    })
  })

  it('every URL uses HTTPS and is on tablix.me', () => {
    result.forEach((entry) => {
      expect(entry.url).toMatch(/^https:\/\//)
      expect(entry.url).toContain('tablix.me')
    })
  })

  it('contains home page entry at root URL with priority 1', () => {
    const home = result.find((e) => e.url === 'https://tablix.me')
    expect(home).toBeDefined()
    expect(home?.priority).toBe(1)
  })

  it('contains /privacy-policy and /terms with priority 0.3', () => {
    expect(result.find((e) => e.url.endsWith('/privacy-policy'))?.priority).toBe(0.3)
    expect(result.find((e) => e.url.endsWith('/terms'))?.priority).toBe(0.3)
  })

  it('contains /pricing with priority 0.8 and weekly frequency', () => {
    const pricing = result.find((e) => e.url.endsWith('/pricing'))
    expect(pricing?.priority).toBe(0.8)
    expect(pricing?.changeFrequency).toBe('weekly')
  })

  it('every entry has lastModified as a stable ISO date string (not new Date() per build)', () => {
    result.forEach((entry) => {
      expect(typeof entry.lastModified).toBe('string')
      expect(entry.lastModified as string).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('lastModified dates are valid and not in the future', () => {
    const now = Date.now()
    result.forEach((entry) => {
      const ts = new Date(entry.lastModified as string).getTime()
      expect(Number.isNaN(ts)).toBe(false)
      expect(ts).toBeLessThanOrEqual(now)
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
    expect(new Set(urls).size).toBe(urls.length)
  })
})
