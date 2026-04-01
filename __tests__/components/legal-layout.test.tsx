/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import LegalLayout from '@/app/(legal)/layout'

// Mock i18n
jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string>) => {
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

// Mock LanguageSelector
jest.mock('@/components/language-selector', () => ({
  LanguageSelector: () => (
    <div data-testid="language-selector">LanguageSelector</div>
  ),
}))

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>
  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock lucide-react icons used in LegalLayout
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" aria-hidden="true" />,
}))

describe('LegalLayout', () => {
  const renderWithChildren = () => {
    return render(
      <LegalLayout>
        <div data-testid="children-content">Page Content</div>
      </LegalLayout>,
    )
  }

  describe('header', () => {
    it('renders header element', () => {
      renderWithChildren()
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders back link pointing to home', () => {
      renderWithChildren()
      const backLink = screen.getByRole('link', { name: /legal\.backToHome/i })
      expect(backLink).toHaveAttribute('href', '/')
    })

    it('renders back link with correct i18n key text', () => {
      renderWithChildren()
      // t() returns the key since we mock it to return the key
      expect(screen.getByText('legal.backToHome')).toBeInTheDocument()
    })

    it('renders LanguageSelector in header', () => {
      renderWithChildren()
      expect(screen.getByTestId('language-selector')).toBeInTheDocument()
    })

    it('back link contains ArrowLeft icon (svg)', () => {
      renderWithChildren()
      const backLink = screen.getByRole('link', { name: /legal\.backToHome/i })
      const svg = backLink.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('main content area', () => {
    it('renders main element', () => {
      renderWithChildren()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('renders children inside main', () => {
      renderWithChildren()
      expect(screen.getByTestId('children-content')).toBeInTheDocument()
    })

    it('renders children text content', () => {
      renderWithChildren()
      expect(screen.getByText('Page Content')).toBeInTheDocument()
    })
  })

  describe('footer', () => {
    it('renders footer element', () => {
      renderWithChildren()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('renders privacy policy link', () => {
      renderWithChildren()
      const privacyLink = screen.getByRole('link', {
        name: 'footer.privacyPolicy',
      })
      expect(privacyLink).toHaveAttribute('href', '/privacy-policy')
    })

    it('renders terms link', () => {
      renderWithChildren()
      const termsLink = screen.getByRole('link', { name: 'footer.terms' })
      expect(termsLink).toHaveAttribute('href', '/terms')
    })

    it('renders copyright paragraph via t() with year param', () => {
      renderWithChildren()
      // t('footer.copyright', { year: '...' }) — mock returns the key since it
      // attempts to replace {year} in 'footer.copyright' but finds no placeholder.
      // This still validates the call path and that the paragraph renders.
      expect(screen.getByText('footer.copyright')).toBeInTheDocument()
    })

    it('footer has two cross-navigation links', () => {
      renderWithChildren()
      const footer = screen.getByRole('contentinfo')
      const links = footer.querySelectorAll('a')
      expect(links.length).toBe(2)
    })
  })

  describe('structure', () => {
    it('renders full layout with min-h-screen background wrapper', () => {
      renderWithChildren()
      // The outer div has bg-background min-h-screen
      const wrapper = screen.getByRole('banner').parentElement
      expect(wrapper?.className).toContain('min-h-screen')
    })
  })
})
