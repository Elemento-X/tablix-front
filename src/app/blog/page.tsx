import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowRight } from 'lucide-react'
import { getServerLocale, getMessages, toOpenGraphLocale } from '@/lib/i18n/server'
import { buildAlternates, localizedUrl, localizedPath } from '@/lib/i18n/routing'
import { getAllPostsMeta } from '@/lib/blog/posts'
import { localizedBlogSlug } from '@/lib/blog/slugs'
import { formatBlogDate } from '@/lib/blog/format'
import { LandingHeader } from '@/components/landing-header'
import { LandingFooter } from '@/components/landing-footer'

const PATH = '/blog'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const { blog } = getMessages(locale)

  return {
    title: blog.meta.title,
    description: blog.meta.description,
    alternates: buildAlternates(locale, PATH),
    // openGraph/twitter aren't deep-merged with the root layout — re-declare the
    // shared fields (siteName/locale/type, large twitter card) so blog routes
    // don't silently drop them.
    openGraph: {
      type: 'website',
      title: blog.meta.title,
      description: blog.meta.description,
      url: localizedUrl(locale, PATH),
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.meta.title,
      description: blog.meta.description,
    },
  }
}

export default async function BlogIndexPage() {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()
  const { blog } = getMessages(locale)
  const posts = await getAllPostsMeta(locale)

  // Blog structured data: an itemized list of the published guides.
  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: blog.meta.title,
    description: blog.meta.description,
    inLanguage: locale,
    url: localizedUrl(locale, PATH),
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.frontmatter.title,
      description: p.frontmatter.description,
      datePublished: p.frontmatter.datePublished,
      dateModified: p.frontmatter.dateModified ?? p.frontmatter.datePublished,
      url: localizedUrl(locale, `/blog/${localizedBlogSlug(p.slug, locale)}`),
    })),
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
    ],
  }
  const escape = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')

  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(blogJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(breadcrumbJsonLd) }}
      />
      <LandingHeader />

      <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 sm:mb-14">
          <h1 className="text-foreground text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {blog.title}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg text-balance">{blog.subtitle}</p>
        </header>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">{blog.empty}</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={localizedPath(locale, `/blog/${localizedBlogSlug(post.slug, locale)}`)}
                  className="group border-border bg-card hover:border-foreground/20 block rounded-xl border p-5 transition-colors sm:p-6"
                >
                  <time
                    dateTime={post.frontmatter.datePublished}
                    className="text-muted-foreground text-xs"
                  >
                    {formatBlogDate(post.frontmatter.datePublished, locale)}
                  </time>
                  <h2 className="text-foreground mt-1 text-xl font-semibold tracking-tight">
                    {post.frontmatter.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {post.frontmatter.description}
                  </p>
                  <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
                    {blog.readMore}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <LandingFooter />
    </div>
  )
}
