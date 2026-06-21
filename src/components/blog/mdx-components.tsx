import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { localizedPath, type Locale } from '@/lib/i18n'
import { localizeBlogHref } from '@/lib/blog/slugs'

/**
 * MDX element → styled component map for blog articles.
 *
 * The project doesn't use @tailwindcss/typography, so every prose element is
 * styled explicitly here to match the design system (stone + teal). Built as a
 * factory because internal links must be rewritten to the current locale's
 * prefixed path (e.g. `/juntar-planilhas-excel` → `/en/juntar-planilhas-excel`).
 */
export function getMdxComponents(locale: Locale): MDXComponents {
  function Anchor({ href = '', children, ...rest }: ComponentPropsWithoutRef<'a'>) {
    const className =
      'text-teal-700 underline decoration-teal-700/30 underline-offset-2 transition-colors hover:decoration-teal-700 dark:text-teal-500 dark:decoration-teal-500/30 dark:hover:decoration-teal-500'

    // Internal app links get the locale prefix. Reject "//host" and "/\host"
    // (browsers normalize "\"→"/", so both are protocol-relative open redirects).
    if (href.startsWith('/') && !/^\/[/\\]/.test(href)) {
      // Remap /blog/<canonical> cross-links to the locale's localized slug.
      const internalHref = localizeBlogHref(href, locale)
      return (
        <Link href={localizedPath(locale, internalHref)} className={className}>
          {children}
        </Link>
      )
    }
    if (href.startsWith('#')) {
      return (
        <a href={href} className={className}>
          {children}
        </a>
      )
    }
    // External: only allow http(s)/mailto. Anything else (javascript:, data:,
    // vbscript:, //host) renders without an href to neutralize click-XSS/redirect.
    const isSafeExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:')
    // Spread first so authored attributes can NEVER override rel/target below.
    return (
      <a
        {...rest}
        href={isSafeExternal ? href : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    )
  }

  /** In-article call-to-action that funnels to a (localized) tool page. */
  function Cta({ href, label }: { href: string; label: string }) {
    return (
      <div className="not-prose my-8">
        <Link
          href={localizedPath(locale, href)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors"
        >
          {label}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return {
    h2: (props) => (
      <h2 className="text-foreground mt-12 mb-4 text-2xl font-bold tracking-tight" {...props} />
    ),
    h3: (props) => (
      <h3 className="text-foreground mt-8 mb-3 text-xl font-semibold tracking-tight" {...props} />
    ),
    h4: (props) => <h4 className="text-foreground mt-6 mb-2 text-lg font-semibold" {...props} />,
    p: (props) => <p className="text-muted-foreground mb-4 leading-relaxed" {...props} />,
    ul: (props) => (
      <ul
        className="text-muted-foreground mb-4 list-disc space-y-2 pl-6 leading-relaxed"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="text-muted-foreground mb-4 list-decimal space-y-2 pl-6 leading-relaxed"
        {...props}
      />
    ),
    li: (props) => <li className="pl-1" {...props} />,
    a: Anchor,
    strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="border-border text-muted-foreground my-6 border-l-4 pl-4 italic"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.9em]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="bg-muted border-border my-6 overflow-x-auto rounded-xl border p-4 text-sm"
        {...props}
      />
    ),
    hr: () => <hr className="border-border my-10" />,
    table: (props) => (
      <div className="my-6 overflow-x-auto">
        <table className="border-border w-full border-collapse text-sm" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border-border text-foreground border px-3 py-2 text-left font-semibold"
        {...props}
      />
    ),
    td: (props) => (
      <td className="border-border text-muted-foreground border px-3 py-2" {...props} />
    ),
    Cta,
  }
}
