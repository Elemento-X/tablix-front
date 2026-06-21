/**
 * @jest-environment jsdom
 *
 * Tests for src/components/blog/mdx-components.tsx
 *
 * Covers:
 * - Anchor: internal link (/) → Next.js Link with localizedPath (pt-BR and en)
 * - Anchor: hash link (#) → plain <a>, no target/rel
 * - Anchor: external URL → <a target="_blank" rel="noopener noreferrer">
 * - Anchor: empty href (default) → treated as external
 * - Cta: renders localized Link with label text
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { getMdxComponents } from '@/components/blog/mdx-components'
import type { MDXComponents } from 'mdx/types'

// next/link renders as a plain <a> so tests can assert on href attributes.
jest.mock('next/link', () => {
  const LinkMock = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
  LinkMock.displayName = 'Link'
  return LinkMock
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnchorProps = React.ComponentPropsWithoutRef<'a'>
type CtaProps = { href: string; label: string }

function getAnchor(components: MDXComponents): React.ComponentType<AnchorProps> {
  return components.a as React.ComponentType<AnchorProps>
}

function getCta(components: MDXComponents): React.ComponentType<CtaProps> {
  return (components as Record<string, React.ComponentType<CtaProps>>).Cta
}

// ---------------------------------------------------------------------------
// Anchor — internal links
// ---------------------------------------------------------------------------

describe('getMdxComponents — Anchor (internal link, starts with /)', () => {
  it('renders as a link with the path unchanged for the default locale (pt-BR)', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    render(<Anchor href="/pricing">Preços</Anchor>)
    const link = screen.getByRole('link', { name: 'Preços' })
    expect(link).toHaveAttribute('href', '/pricing')
    // Internal links must NOT open in a new tab
    expect(link).not.toHaveAttribute('target')
    expect(link).not.toHaveAttribute('rel')
  })

  it('adds the locale prefix for non-default locales', () => {
    const Anchor = getAnchor(getMdxComponents('en'))
    render(<Anchor href="/pricing">Pricing</Anchor>)
    const link = screen.getByRole('link', { name: 'Pricing' })
    expect(link).toHaveAttribute('href', '/en/pricing')
  })

  it('localizes the root path correctly for a non-default locale', () => {
    const Anchor = getAnchor(getMdxComponents('fr'))
    render(<Anchor href="/">Accueil</Anchor>)
    const link = screen.getByRole('link', { name: 'Accueil' })
    expect(link).toHaveAttribute('href', '/fr')
  })
})

// ---------------------------------------------------------------------------
// Anchor — hash links
// ---------------------------------------------------------------------------

describe('getMdxComponents — Anchor (hash link, starts with #)', () => {
  it('renders as a plain <a> without target or rel', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    render(<Anchor href="#section-1">Seção 1</Anchor>)
    const link = screen.getByRole('link', { name: 'Seção 1' })
    expect(link).toHaveAttribute('href', '#section-1')
    expect(link).not.toHaveAttribute('target')
    expect(link).not.toHaveAttribute('rel')
  })
})

// ---------------------------------------------------------------------------
// Anchor — external links
// ---------------------------------------------------------------------------

describe('getMdxComponents — Anchor (external link)', () => {
  it('renders with target=_blank and rel=noopener noreferrer for https URLs', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    render(<Anchor href="https://example.com">External</Anchor>)
    const link = screen.getByRole('link', { name: 'External' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders an empty/absent href with NO href attribute (kept safe) but with target and rel', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    const { container } = render(<Anchor>No href</Anchor>)
    const el = container.querySelector('a')
    expect(el).not.toBeNull()
    // Unsafe/empty href is neutralized — no destination is emitted.
    expect(el).not.toHaveAttribute('href')
    expect(el).toHaveAttribute('target', '_blank')
    expect(el).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('allows mailto: links', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    const { container } = render(<Anchor href="mailto:hi@tablix.me">Email</Anchor>)
    const el = container.querySelector('a')
    expect(el).toHaveAttribute('href', 'mailto:hi@tablix.me')
  })

  it('neutralizes a javascript: scheme (no href emitted)', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    const { container } = render(<Anchor href="javascript:alert(1)">x</Anchor>)
    expect(container.querySelector('a')).not.toHaveAttribute('href')
  })

  it('neutralizes a protocol-relative //host (not treated as internal, no href)', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    const { container } = render(<Anchor href="//evil.com">x</Anchor>)
    const el = container.querySelector('a')
    // Must NOT become an internal Next link to //evil.com, and unsafe → no href.
    expect(el).not.toHaveAttribute('href')
  })
})

// ---------------------------------------------------------------------------
// Anchor — localized blog cross-links
// ---------------------------------------------------------------------------

describe('getMdxComponents — Anchor (blog cross-link slug remap)', () => {
  it('remaps a /blog/<canonical> cross-link to the localized slug for non-default locales', () => {
    const Anchor = getAnchor(getMdxComponents('en'))
    render(<Anchor href="/blog/csv-ou-xlsx-qual-usar">CSV vs XLSX</Anchor>)
    const link = screen.getByRole('link', { name: 'CSV vs XLSX' })
    expect(link).toHaveAttribute('href', '/en/blog/csv-vs-xlsx')
  })

  it('keeps the canonical slug for the default locale', () => {
    const Anchor = getAnchor(getMdxComponents('pt-BR'))
    render(<Anchor href="/blog/csv-ou-xlsx-qual-usar">CSV ou XLSX</Anchor>)
    const link = screen.getByRole('link', { name: 'CSV ou XLSX' })
    expect(link).toHaveAttribute('href', '/blog/csv-ou-xlsx-qual-usar')
  })
})

// ---------------------------------------------------------------------------
// Cta custom component
// ---------------------------------------------------------------------------

describe('getMdxComponents — Cta', () => {
  it('renders a link with the provided label text', () => {
    const Cta = getCta(getMdxComponents('pt-BR'))
    render(<Cta href="/upload" label="Começar agora" />)
    expect(screen.getByRole('link', { name: /Começar agora/i })).toBeInTheDocument()
  })

  it('localizes the Cta href for non-default locales', () => {
    const Cta = getCta(getMdxComponents('en'))
    render(<Cta href="/upload" label="Start now" />)
    const link = screen.getByRole('link', { name: /Start now/i })
    expect(link).toHaveAttribute('href', '/en/upload')
  })
})
