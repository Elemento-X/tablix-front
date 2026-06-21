import type { Locale } from '@/lib/i18n/config'

/**
 * Format an ISO date (YYYY-MM-DD) for display in the reader's locale.
 * Anchored at midday UTC to avoid the date shifting a day across timezones.
 */
export function formatBlogDate(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T12:00:00Z`)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
