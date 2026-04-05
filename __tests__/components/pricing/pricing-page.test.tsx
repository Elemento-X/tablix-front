/**
 * @jest-environment jsdom
 *
 * Tests for:
 *   - src/app/pricing/constants.ts (FAQ_KEYS)
 *   - src/app/pricing/components/PricingPageContent.tsx (layout, CTA, dynamic imports, i18n)
 *   - src/app/pricing/page.tsx (generateMetadata, JSON-LD, XSS escape)
 *
 * Covers: FAQ_KEYS contract, PricingPageContent rendering and CTA, i18n key resolution,
 * JSON-LD shape, all 7 FAQ items in schema, XSS escape of '<',
 * metadata fields (title, description, canonical, OG, Twitter).
 */
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Shared mocks (apply to all describes in this file)
// ---------------------------------------------------------------------------

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'pricingPage.ctaText': 'Pronto para simplificar suas planilhas?',
        'pricingPage.ctaSubtext': 'Comece em segundos, sem cadastro e sem cartão de crédito.',
        'pricingPage.cta': 'Começar grátis',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/components/landing-header', () => ({
  LandingHeader: () => <header data-testid="landing-header" />,
}))

jest.mock('@/components/landing-footer', () => ({
  LandingFooter: () => <footer data-testid="landing-footer" />,
}))

jest.mock('@/components/pricing-section', () => ({
  PricingSection: (props: { id?: string; headingLevel?: string }) => (
    <section data-testid="pricing-section" data-id={props.id} data-heading={props.headingLevel} />
  ),
}))

jest.mock('@/components/button', () => ({
  Button: ({
    children,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    size?: string
    className?: string
  }) => (
    <button data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}))

jest.mock('@/app/pricing/components/ComparisonTable', () => ({
  ComparisonTable: () => <div data-testid="comparison-table" />,
}))

jest.mock('@/app/pricing/components/PricingFAQ', () => ({
  PricingFAQ: () => <div data-testid="pricing-faq" />,
}))

// next/dynamic — PricingPageContent uses dynamic() to lazy-load ComparisonTable
// and PricingFAQ. Since both are already mocked via jest.mock above, we can
// intercept next/dynamic calls by mapping known module paths to their mocks.
// This avoids async Promise resolution issues in Jest.
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_fn: unknown, _opts?: object) => {
    // PricingPageContent calls dynamic() twice:
    //   1. import('./ComparisonTable').then(mod => mod.ComparisonTable)
    //   2. import('./PricingFAQ').then(mod => mod.PricingFAQ)
    // We cannot inspect the factory closure directly. Instead we return
    // a stable stub that renders nothing — the tests for ComparisonTable
    // and PricingFAQ have their own dedicated suites. What matters here
    // is that PricingPageContent renders its static structure and CTA.
    const Stub = () => null
    Stub.displayName = 'DynamicStub'
    return Stub
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
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
  ),
}))

jest.mock('lucide-react', () => ({
  ArrowRight: () => <svg data-testid="arrow-right" aria-hidden="true" />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
}))

// Mocks needed for page.tsx (server component)
jest.mock('@/lib/i18n/server', () => ({
  getServerLocale: jest.fn().mockResolvedValue('pt-BR'),
  getMessages: jest.fn().mockReturnValue({
    pricingPage: {
      metaTitle: 'Planos | Tablix',
      metaDescription: 'Compare os planos Free, Pro e Enterprise do Tablix.',
      faq: {
        items: {
          q1: { question: 'Q1 pergunta', answer: 'Q1 resposta' },
          q2: { question: 'Q2 pergunta', answer: 'Q2 resposta' },
          q3: { question: 'Q3 pergunta', answer: 'Q3 resposta' },
          q4: { question: 'Q4 pergunta', answer: 'Q4 resposta' },
          q5: { question: 'Q5 pergunta', answer: 'Q5 resposta' },
          q6: { question: 'Q6 pergunta', answer: 'Q6 resposta' },
          q7: { question: 'Q7 pergunta', answer: 'Q7 resposta' },
        },
      },
    },
  }),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(null),
  }),
}))

jest.mock('@/lib/constants', () => ({
  SITE_URL: 'https://tablix.me',
}))

// ---------------------------------------------------------------------------
// Imports (after all jest.mock declarations)
// ---------------------------------------------------------------------------

import { FAQ_KEYS } from '@/app/pricing/constants'
import { PricingPageContent } from '@/app/pricing/components/PricingPageContent'
import { generateMetadata, default as PricingPage } from '@/app/pricing/page'
import { getMessages, getServerLocale } from '@/lib/i18n/server'

// ---------------------------------------------------------------------------
// Tests: constants.ts
// ---------------------------------------------------------------------------

describe('FAQ_KEYS (constants.ts)', () => {
  it('exports exactly 7 keys', () => {
    expect(FAQ_KEYS).toHaveLength(7)
  })

  it('contains q1 through q7 in order', () => {
    expect(FAQ_KEYS).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'])
  })

  it('includes q7 (recently added item)', () => {
    expect(FAQ_KEYS).toContain('q7')
  })

  it('does not include q8 or beyond', () => {
    expect(FAQ_KEYS).not.toContain('q8')
  })

  it('all entries are strings', () => {
    FAQ_KEYS.forEach((key) => {
      expect(typeof key).toBe('string')
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: PricingPageContent.tsx
// ---------------------------------------------------------------------------

describe('PricingPageContent', () => {
  describe('structural elements', () => {
    it('renders the landing header', () => {
      render(<PricingPageContent />)
      expect(screen.getByTestId('landing-header')).toBeInTheDocument()
    })

    it('renders the landing footer', () => {
      render(<PricingPageContent />)
      expect(screen.getByTestId('landing-footer')).toBeInTheDocument()
    })

    it('renders a <main> element with id="main-content"', () => {
      const { container } = render(<PricingPageContent />)
      const main = container.querySelector('main#main-content')
      expect(main).not.toBeNull()
    })

    it('renders the pricing section', () => {
      render(<PricingPageContent />)
      expect(screen.getByTestId('pricing-section')).toBeInTheDocument()
    })

    it('contains placeholders for dynamic ComparisonTable and PricingFAQ regions', () => {
      // ComparisonTable and PricingFAQ are loaded via next/dynamic; their
      // detailed rendering is covered in comparison-table.test.tsx and
      // pricing-faq.test.tsx. Here we only assert that PricingPageContent
      // renders without error when those regions are stubbed out.
      const { container } = render(<PricingPageContent />)
      expect(container.querySelector('main#main-content')).not.toBeNull()
    })
  })

  describe('CTA section', () => {
    it('renders the CTA heading text', () => {
      render(<PricingPageContent />)
      expect(screen.getByText('Pronto para simplificar suas planilhas?')).toBeInTheDocument()
    })

    it('renders the CTA subtext', () => {
      render(<PricingPageContent />)
      expect(
        screen.getByText('Comece em segundos, sem cadastro e sem cartão de crédito.'),
      ).toBeInTheDocument()
    })

    it('renders the CTA button with correct text', () => {
      render(<PricingPageContent />)
      expect(screen.getByText('Começar grátis')).toBeInTheDocument()
    })

    it('CTA link points to /upload', () => {
      render(<PricingPageContent />)
      const link = screen.getByRole('link', { name: /Começar grátis/i })
      expect(link).toHaveAttribute('href', '/upload')
    })
  })

  describe('i18n key resolution', () => {
    it('ctaText does not fall back to raw key', () => {
      render(<PricingPageContent />)
      expect(screen.queryByText('pricingPage.ctaText')).not.toBeInTheDocument()
    })

    it('ctaSubtext does not fall back to raw key', () => {
      render(<PricingPageContent />)
      expect(screen.queryByText('pricingPage.ctaSubtext')).not.toBeInTheDocument()
    })

    it('cta button does not fall back to raw key', () => {
      render(<PricingPageContent />)
      expect(screen.queryByText('pricingPage.cta')).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: page.tsx — generateMetadata
// ---------------------------------------------------------------------------

describe('generateMetadata (page.tsx)', () => {
  it('returns the correct title from messages', async () => {
    const metadata = await generateMetadata()
    expect(metadata.title).toBe('Planos | Tablix')
  })

  it('returns the correct description from messages', async () => {
    const metadata = await generateMetadata()
    expect(metadata.description).toBe('Compare os planos Free, Pro e Enterprise do Tablix.')
  })

  it('sets canonical URL to SITE_URL/pricing', async () => {
    const metadata = await generateMetadata()
    expect(metadata.alternates?.canonical).toBe('https://tablix.me/pricing')
  })

  it('sets openGraph.url to SITE_URL/pricing', async () => {
    const metadata = await generateMetadata()
    expect((metadata.openGraph as { url?: string })?.url).toBe('https://tablix.me/pricing')
  })

  it('sets openGraph.title equal to metadata title', async () => {
    const metadata = await generateMetadata()
    expect((metadata.openGraph as { title?: string })?.title).toBe('Planos | Tablix')
  })

  it('sets openGraph.description equal to metadata description', async () => {
    const metadata = await generateMetadata()
    expect((metadata.openGraph as { description?: string })?.description).toBe(
      'Compare os planos Free, Pro e Enterprise do Tablix.',
    )
  })

  it('sets twitter.title equal to metadata title', async () => {
    const metadata = await generateMetadata()
    expect((metadata.twitter as { title?: string })?.title).toBe('Planos | Tablix')
  })

  it('sets twitter.description equal to metadata description', async () => {
    const metadata = await generateMetadata()
    expect((metadata.twitter as { description?: string })?.description).toBe(
      'Compare os planos Free, Pro e Enterprise do Tablix.',
    )
  })
})

// ---------------------------------------------------------------------------
// Tests: page.tsx — PricingPage (JSON-LD)
// ---------------------------------------------------------------------------

describe('PricingPage (JSON-LD)', () => {
  it('renders a <script type="application/ld+json"> tag', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('JSON-LD has @type FAQPage', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script!.innerHTML)
    expect(data['@type']).toBe('FAQPage')
  })

  it('JSON-LD has @context schema.org', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script!.innerHTML)
    expect(data['@context']).toBe('https://schema.org')
  })

  it('JSON-LD mainEntity contains exactly 7 Question items (one per FAQ_KEY)', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script!.innerHTML)
    expect(data.mainEntity).toHaveLength(7)
  })

  it('every mainEntity item has @type Question with name and acceptedAnswer', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script!.innerHTML)
    data.mainEntity.forEach(
      (item: {
        '@type': string
        name: string
        acceptedAnswer: { '@type': string; text: string }
      }) => {
        expect(item['@type']).toBe('Question')
        expect(typeof item.name).toBe('string')
        expect(item.acceptedAnswer['@type']).toBe('Answer')
        expect(typeof item.acceptedAnswer.text).toBe('string')
      },
    )
  })

  it('JSON-LD questions and answers come from i18n messages', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script!.innerHTML)
    // q7 is the recently added item — verify it appears in the schema
    const q7Item = data.mainEntity[6]
    expect(q7Item.name).toBe('Q7 pergunta')
    expect(q7Item.acceptedAnswer.text).toBe('Q7 resposta')
  })

  it('JSON-LD escapes "<" as \\u003c to prevent XSS injection', async () => {
    const mockGetMessages = getMessages as jest.Mock
    mockGetMessages.mockReturnValueOnce({
      pricingPage: {
        metaTitle: 'Test',
        metaDescription: 'Test',
        faq: {
          items: {
            q1: { question: '<script>alert(1)</script>', answer: 'safe answer' },
            q2: { question: 'Q2', answer: 'A2' },
            q3: { question: 'Q3', answer: 'A3' },
            q4: { question: 'Q4', answer: 'A4' },
            q5: { question: 'Q5', answer: 'A5' },
            q6: { question: 'Q6', answer: 'A6' },
            q7: { question: 'Q7', answer: 'A7' },
          },
        },
      },
    })
    const jsx = await PricingPage()
    const { container } = render(jsx)
    const script = container.querySelector('script[type="application/ld+json"]')
    // Raw innerHTML must not contain unescaped "<"
    expect(script!.innerHTML).not.toContain('<script>')
    // The \u003c escape must be present
    expect(script!.innerHTML).toContain('\\u003c')
  })

  it('renders PricingPageContent inside the page', async () => {
    const jsx = await PricingPage()
    const { container } = render(jsx)
    // PricingPageContent renders real output (header, footer, main, etc.)
    // At minimum the main element from PricingPageContent must exist
    expect(container.querySelector('main#main-content')).not.toBeNull()
  })
})
