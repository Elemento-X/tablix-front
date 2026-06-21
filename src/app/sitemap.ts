import type { MetadataRoute } from 'next'
import { SITE_LAST_UPDATED, LEGAL_LAST_UPDATED } from '@/lib/constants'
import { locales, defaultLocale } from '@/lib/i18n/config'
import { localizedUrl } from '@/lib/i18n/routing'

/** hreflang language map for a path: every locale + x-default → default locale. */
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = localizedUrl(loc, path)
  }
  languages['x-default'] = localizedUrl(defaultLocale, path)
  return languages
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{
    path: string
    lastModified: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', lastModified: SITE_LAST_UPDATED, changeFrequency: 'weekly', priority: 1 },
    { path: '/pricing', lastModified: SITE_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    {
      path: '/juntar-planilhas-excel',
      lastModified: SITE_LAST_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      path: '/privacy-policy',
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    { path: '/terms', lastModified: LEGAL_LAST_UPDATED, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // One canonical entry per page (default locale URL) annotated with hreflang
  // alternates for all locales — the Google-recommended multilingual sitemap shape.
  return pages.map((p) => ({
    url: localizedUrl(defaultLocale, p.path),
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
    alternates: { languages: languagesFor(p.path) },
  }))
}
