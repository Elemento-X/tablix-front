import type { Metadata } from 'next'
import { cache } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { ArrowRight } from 'lucide-react'
import { getServerLocale, getMessages, toOpenGraphLocale } from '@/lib/i18n/server'
import { localizedUrl, localizedPath } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/constants'
import { getPost } from '@/lib/blog/posts'
import {
  canonicalFromLocalizedSlug,
  localizedBlogSlug,
  blogArticleAlternates,
} from '@/lib/blog/slugs'
import { formatBlogDate } from '@/lib/blog/format'
import { getMdxComponents } from '@/components/blog/mdx-components'
import { LandingHeader } from '@/components/landing-header'
import { LandingFooter } from '@/components/landing-footer'

/** Absolute URL of the site OG image — reused as the BlogPosting schema image. */
const OG_IMAGE = `${SITE_URL}/opengraph-image`

interface PageProps {
  params: Promise<{ slug: string }>
}

// generateMetadata and the page both need the post — cache() dedupes the
// filesystem read + parse to a single call per request. Keyed by canonical slug.
const loadPost = cache((canonical: string, locale: Locale) => getPost(canonical, locale))

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getServerLocale()
  const canonical = canonicalFromLocalizedSlug(slug, locale)
  const post = canonical ? await loadPost(canonical, locale) : null
  if (!post || !canonical) return {}

  const path = `/blog/${localizedBlogSlug(canonical, locale)}`
  const { title, description, datePublished, dateModified } = post.frontmatter

  return {
    title: `${title} | Tablix`,
    description,
    alternates: blogArticleAlternates(canonical, locale),
    // openGraph/twitter are NOT deep-merged with the root layout in the App
    // Router — the segment replaces the whole object. Re-declare siteName/locale/
    // type and the large twitter card so they aren't lost on blog routes.
    openGraph: {
      type: 'article',
      title,
      description,
      url: localizedUrl(locale, path),
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
      publishedTime: datePublished,
      modifiedTime: dateModified ?? datePublished,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()
  const canonical = canonicalFromLocalizedSlug(slug, locale)
  const post = canonical ? await loadPost(canonical, locale) : null
  if (!post || !canonical) notFound()

  const { blog } = getMessages(locale)
  const path = `/blog/${localizedBlogSlug(canonical, locale)}`
  const { title, description, datePublished, dateModified, relatedLanding } = post.frontmatter
  // Per-article OG image (file-convention route under this segment) — used as the
  // BlogPosting image so the rich result matches the social card.
  const articleImage = `${localizedUrl(locale, path)}/opengraph-image`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    inLanguage: locale,
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': localizedUrl(locale, path) },
    image: articleImage,
    author: { '@type': 'Organization', name: 'Tablix', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Tablix',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: OG_IMAGE },
    },
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: blog.breadcrumb.home,
        item: localizedUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: blog.breadcrumb.blog,
        item: localizedUrl(locale, '/blog'),
      },
      { '@type': 'ListItem', position: 3, name: title, item: localizedUrl(locale, path) },
    ],
  }
  const escape = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')

  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(breadcrumbJsonLd) }}
      />
      <LandingHeader />

      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Visible breadcrumb mirrors the BreadcrumbList JSON-LD (Google recommends pairing them). */}
        <nav aria-label={blog.breadcrumb.blog} className="text-muted-foreground mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href={localizedPath(locale, '/')}
                className="hover:text-foreground transition-colors"
              >
                {blog.breadcrumb.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={localizedPath(locale, '/blog')}
                className="hover:text-foreground transition-colors"
              >
                {blog.breadcrumb.blog}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground line-clamp-1" aria-current="page">
              {title}
            </li>
          </ol>
        </nav>

        <article>
          <header className="mb-8">
            <h1 className="text-foreground text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-2 text-xs">
              <time dateTime={datePublished}>
                {blog.publishedOn} {formatBlogDate(datePublished, locale)}
              </time>
              {dateModified && dateModified !== datePublished && (
                <time dateTime={dateModified}>
                  · {blog.updatedOn} {formatBlogDate(dateModified, locale)}
                </time>
              )}
            </div>
          </header>

          <div className="text-base">
            <MDXRemote source={post.body} components={getMdxComponents(locale)} />
          </div>
        </article>

        {relatedLanding && (
          <aside className="border-border bg-muted/30 mt-12 rounded-xl border p-6 text-center">
            <p className="text-foreground text-lg font-semibold">{blog.cta.title}</p>
            <div className="mt-4">
              <Link
                href={localizedPath(locale, relatedLanding)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors"
              >
                {blog.cta.button}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        )}
      </main>

      <LandingFooter />
    </div>
  )
}
