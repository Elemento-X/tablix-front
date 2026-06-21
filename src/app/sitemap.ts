import type { MetadataRoute } from 'next'
import { SITE_LAST_UPDATED, LEGAL_LAST_UPDATED } from '@/lib/constants'
import { locales, defaultLocale } from '@/lib/i18n/config'
import { localizedUrl } from '@/lib/i18n/routing'
import { getAllPostsMeta } from '@/lib/blog/posts'
import { localizedBlogSlug } from '@/lib/blog/slugs'

/** hreflang language map for a path: every locale + x-default → default locale. */
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = localizedUrl(loc, path)
  }
  languages['x-default'] = localizedUrl(defaultLocale, path)
  return languages
}

/** hreflang map for a blog article: each locale points at its localized slug. */
function blogArticleLanguages(canonical: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = localizedUrl(loc, `/blog/${localizedBlogSlug(canonical, loc)}`)
  }
  languages['x-default'] = localizedUrl(defaultLocale, `/blog/${canonical}`)
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Blog articles are enumerated from the filesystem so new guides land in the
  // sitemap automatically. dateModified drives lastmod (stable, author-set).
  // Each locale's alternate uses its localized slug.
  const posts = await getAllPostsMeta(defaultLocale)
  const blogArticleEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: localizedUrl(defaultLocale, `/blog/${post.slug}`),
    lastModified: post.frontmatter.dateModified ?? post.frontmatter.datePublished,
    changeFrequency: 'monthly',
    priority: 0.7,
    alternates: { languages: blogArticleLanguages(post.slug) },
  }))

  const pages: Array<{
    path: string
    lastModified: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', lastModified: SITE_LAST_UPDATED, changeFrequency: 'weekly', priority: 1 },
    { path: '/pricing', lastModified: SITE_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    { path: '/blog', lastModified: SITE_LAST_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
    {
      path: '/juntar-planilhas-excel',
      lastModified: SITE_LAST_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      path: '/juntar-arquivos-csv',
      lastModified: SITE_LAST_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      path: '/unir-varias-planilhas',
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
  const staticEntries = pages.map((p) => ({
    url: localizedUrl(defaultLocale, p.path),
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
    alternates: { languages: languagesFor(p.path) },
  }))

  return [...staticEntries, ...blogArticleEntries]
}
