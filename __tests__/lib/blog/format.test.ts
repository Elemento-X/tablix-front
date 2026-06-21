import { formatBlogDate } from '@/lib/blog/format'

describe('formatBlogDate', () => {
  it('formats an ISO date including the year', () => {
    expect(formatBlogDate('2026-06-21', 'pt-BR')).toContain('2026')
    expect(formatBlogDate('2026-06-21', 'en')).toContain('2026')
  })

  it('does not shift the day across timezones (anchored at midday UTC)', () => {
    // June 21 must never render as June 20 regardless of the runner's TZ.
    expect(formatBlogDate('2026-06-21', 'en')).toMatch(/21/)
  })

  it('returns a non-empty string for every supported locale', () => {
    for (const loc of ['pt-BR', 'en', 'es', 'zh', 'fr', 'de'] as const) {
      expect(formatBlogDate('2026-01-15', loc).length).toBeGreaterThan(0)
    }
  })
})
