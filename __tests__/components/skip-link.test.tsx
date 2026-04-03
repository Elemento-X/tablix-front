/**
 * @jest-environment jsdom
 *
 * Tests for src/components/skip-link.tsx (Card 9.3 — WCAG AA baseline)
 *
 * Covers:
 * - Renders with correct href (#main-content)
 * - Text is driven by i18n t('a11y.skipToContent')
 * - Link is focusable (tabIndex not -1)
 * - CSS class -translate-y-full is present (visually hidden when not focused)
 * - focus:translate-y-0 class is present (visible on focus via CSS)
 * - Edge cases: missing useLocale translation falls back gracefully
 */
import { render, screen } from '@testing-library/react'
import { SkipLink } from '@/components/skip-link'

// ── Mock i18n ─────────────────────────────────────────────────────────────────

const mockT = jest.fn()

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    locale: 'pt-BR',
    t: mockT,
  }),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkipLink', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockT.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'a11y.skipToContent': 'Pular para conteúdo principal',
      }
      return map[key] ?? key
    })
  })

  describe('href and target', () => {
    it('renders an anchor element pointing to #main-content', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '#main-content')
    })
  })

  describe('i18n text', () => {
    it('calls t() with "a11y.skipToContent"', () => {
      render(<SkipLink />)
      expect(mockT).toHaveBeenCalledWith('a11y.skipToContent')
    })

    it('renders the translated label from t()', () => {
      render(<SkipLink />)
      expect(screen.getByText('Pular para conteúdo principal')).toBeInTheDocument()
    })

    it('renders translated text for English locale', () => {
      mockT.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'a11y.skipToContent': 'Skip to main content',
        }
        return map[key] ?? key
      })
      render(<SkipLink />)
      expect(screen.getByText('Skip to main content')).toBeInTheDocument()
    })

    it('renders translated text for Spanish locale', () => {
      mockT.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'a11y.skipToContent': 'Saltar al contenido principal',
        }
        return map[key] ?? key
      })
      render(<SkipLink />)
      expect(screen.getByText('Saltar al contenido principal')).toBeInTheDocument()
    })

    it('falls back to key string when translation is missing', () => {
      mockT.mockImplementation((key: string) => key)
      render(<SkipLink />)
      expect(screen.getByText('a11y.skipToContent')).toBeInTheDocument()
    })
  })

  describe('CSS classes (visually hidden + focus visible)', () => {
    it('has -translate-y-full class (visually hidden off-screen by default)', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      expect(link.className).toContain('-translate-y-full')
    })

    it('has focus:translate-y-0 class (becomes visible on keyboard focus)', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      expect(link.className).toContain('focus:translate-y-0')
    })

    it('has fixed positioning and high z-index class', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      expect(link.className).toContain('fixed')
      expect(link.className).toContain('z-[9999]')
    })

    it('has transition-transform class for smooth animation', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      expect(link.className).toContain('transition-transform')
    })
  })

  describe('keyboard accessibility', () => {
    it('is reachable via keyboard (no tabIndex=-1)', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link')
      // Default anchor element has no tabIndex attribute, which means it IS focusable.
      // Presence of tabIndex="-1" would break skip-link accessibility.
      expect(link).not.toHaveAttribute('tabindex', '-1')
    })

    it('receives focus when programmatically focused', () => {
      render(<SkipLink />)
      const link = screen.getByRole('link') as HTMLAnchorElement
      link.focus()
      expect(document.activeElement).toBe(link)
    })
  })

  describe('landmark target contract', () => {
    it('href matches the id added to <main> elements across the app', () => {
      // The href must exactly match id="main-content" on all <main> elements.
      // If this changes, the skip link silently breaks — keep both in sync.
      render(<SkipLink />)
      const href = screen.getByRole('link').getAttribute('href')
      expect(href).toBe('#main-content')
    })
  })
})
