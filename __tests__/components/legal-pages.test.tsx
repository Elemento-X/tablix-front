/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import PrivacyPolicyPage from '@/app/(legal)/privacy-policy/page'
import TermsPage from '@/app/(legal)/terms/page'

// Mock i18n
jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string>) => {
      // Return a human-readable mock based on the key
      if (params) {
        let result = key
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, v)
        })
        return result
      }
      return key
    },
  }),
}))

// Mock LegalTableOfContents to avoid dealing with scroll/DOM complexities
jest.mock('@/components/legal-table-of-contents', () => ({
  LegalTableOfContents: ({
    items,
  }: {
    items: { id: string; label: string }[]
  }) => (
    <nav aria-label="toc-mock" data-testid="toc">
      {items.map((item) => (
        <button key={item.id} data-testid={`toc-item-${item.id}`}>
          {item.label}
        </button>
      ))}
    </nav>
  ),
}))

describe('PrivacyPolicyPage', () => {
  beforeEach(() => {
    render(<PrivacyPolicyPage />)
  })

  it('renders without crashing', () => {
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
  })

  it('renders the main h1 title key', () => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'legal.privacy.title',
    )
  })

  it('renders the lastUpdated text with date', () => {
    expect(screen.getByText(/legal\.lastUpdated/)).toBeInTheDocument()
  })

  it('renders all 10 section headings', () => {
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBe(10)
  })

  it('renders all expected section ids', () => {
    const sectionIds = [
      'intro',
      'data-collection',
      'spreadsheet-processing',
      'cookies',
      'storage',
      'security',
      'rights',
      'third-party',
      'changes',
      'contact',
    ]
    sectionIds.forEach((id) => {
      expect(document.getElementById(id)).toBeInTheDocument()
    })
  })

  it('renders TOC with correct number of items', () => {
    const tocs = screen.getAllByTestId('toc')
    // Mobile + Desktop TOC
    expect(tocs.length).toBe(2)
  })

  it('renders 10 TOC items matching sections', () => {
    const tocItems = screen.getAllByTestId(/^toc-item-/)
    // 10 items x 2 TOCs (mobile + desktop)
    expect(tocItems.length).toBe(20)
  })

  it('TOC item ids match section ids', () => {
    const expectedIds = [
      'intro',
      'data-collection',
      'spreadsheet-processing',
      'cookies',
      'storage',
      'security',
      'rights',
      'third-party',
      'changes',
      'contact',
    ]
    expectedIds.forEach((id) => {
      expect(screen.getAllByTestId(`toc-item-${id}`).length).toBeGreaterThan(0)
    })
  })

  it('renders TOC item labels using t() keys', () => {
    // Since t() returns the key, the labels should contain the key strings
    expect(screen.getAllByTestId('toc-item-intro')[0]).toHaveTextContent(
      'legal.privacy.intro.title',
    )
  })

  it('renders article element with prose-legal class', () => {
    const article = document.querySelector('article.prose-legal')
    expect(article).toBeInTheDocument()
  })

  it('renders aside sticky TOC on desktop', () => {
    const aside = document.querySelector('aside')
    expect(aside).toBeInTheDocument()
  })
})

describe('TermsPage', () => {
  beforeEach(() => {
    render(<TermsPage />)
  })

  it('renders without crashing', () => {
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
  })

  it('renders the main h1 title key', () => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'legal.terms.title',
    )
  })

  it('renders the lastUpdated text with date', () => {
    expect(screen.getByText(/legal\.lastUpdated/)).toBeInTheDocument()
  })

  it('renders all 12 section headings', () => {
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBe(12)
  })

  it('renders all expected section ids', () => {
    const sectionIds = [
      'acceptance',
      'service-description',
      'plans',
      'acceptable-use',
      'user-content',
      'ip',
      'liability',
      'availability',
      'suspension',
      'changes',
      'governing-law',
      'contact',
    ]
    sectionIds.forEach((id) => {
      expect(document.getElementById(id)).toBeInTheDocument()
    })
  })

  it('renders plans section with h3 subheadings', () => {
    const h3s = screen.getAllByRole('heading', { level: 3 })
    expect(h3s.length).toBe(2) // freeTitle + proTitle
  })

  it('renders freeTitle h3 heading', () => {
    const h3s = screen.getAllByRole('heading', { level: 3 })
    expect(h3s[0]).toHaveTextContent('legal.terms.plans.freeTitle')
  })

  it('renders proTitle h3 heading', () => {
    const h3s = screen.getAllByRole('heading', { level: 3 })
    expect(h3s[1]).toHaveTextContent('legal.terms.plans.proTitle')
  })

  it('renders 12 TOC items matching sections', () => {
    const tocItems = screen.getAllByTestId(/^toc-item-/)
    // 12 items x 2 TOCs (mobile + desktop)
    expect(tocItems.length).toBe(24)
  })

  it('TOC item ids match section ids', () => {
    const expectedIds = [
      'acceptance',
      'service-description',
      'plans',
      'acceptable-use',
      'user-content',
      'ip',
      'liability',
      'availability',
      'suspension',
      'changes',
      'governing-law',
      'contact',
    ]
    expectedIds.forEach((id) => {
      expect(screen.getAllByTestId(`toc-item-${id}`).length).toBeGreaterThan(0)
    })
  })

  it('renders TOC item labels using t() keys', () => {
    expect(screen.getAllByTestId('toc-item-acceptance')[0]).toHaveTextContent(
      'legal.terms.acceptance.title',
    )
  })

  it('renders article element with prose-legal class', () => {
    const article = document.querySelector('article.prose-legal')
    expect(article).toBeInTheDocument()
  })

  it('renders aside sticky TOC on desktop', () => {
    const aside = document.querySelector('aside')
    expect(aside).toBeInTheDocument()
  })
})
