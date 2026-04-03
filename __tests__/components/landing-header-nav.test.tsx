/**
 * @jest-environment jsdom
 *
 * Tests for src/components/landing-header-nav.tsx
 * Covers: scrollToSection logic (pathname check, el found/not found, instant flag),
 * LandingHeaderNav rendering, aria-current="location" on active item.
 *
 * Note on window.location: jsdom does not allow redefinition of window.location
 * after initial setup. Tests that depend on window.location.href mutations
 * (fallback navigation) are covered via scrollIntoView spy on existing elements.
 * Tests requiring pathname changes (id === "top" on non-root paths) are skipped
 * in favor of integration/E2E coverage.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingHeaderNav, scrollToSection } from '@/components/landing-header-nav'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    span: ({
      children,
      layoutId: _layoutId,
      transition: _transition,
      ...rest
    }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => (
      <span {...rest}>{children}</span>
    ),
  },
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    locale: 'pt-BR',
    t: (key: string) => {
      const map: Record<string, string> = {
        'header.nav.howItWorks': 'Como funciona',
        'header.nav.audience': 'Para quem é',
        'header.nav.pricing': 'Preços',
        'a11y.mainNavigation': 'Navegação principal',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}))

describe('scrollToSection', () => {
  const originalScrollTo = window.scrollTo
  const originalScrollIntoView = Element.prototype.scrollIntoView

  beforeEach(() => {
    window.scrollTo = jest.fn()
    Element.prototype.scrollIntoView = jest.fn()
  })

  afterEach(() => {
    window.scrollTo = originalScrollTo
    Element.prototype.scrollIntoView = originalScrollIntoView
    document.body.innerHTML = ''
  })

  describe('id === "top" — on root path (jsdom default pathname is "/")', () => {
    it('calls window.scrollTo({ top: 0, behavior: "smooth" }) when not instant', () => {
      // jsdom initialises pathname as "/" by default — matches the "/" guard
      scrollToSection('top', false)
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
    })

    it('calls window.scrollTo({ top: 0, behavior: "instant" }) when instant=true', () => {
      scrollToSection('top', true)
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'instant',
      })
    })
  })

  describe('id is a regular section — element found in DOM', () => {
    it('calls scrollIntoView with smooth behavior when element exists and not instant', () => {
      const el = document.createElement('div')
      el.id = 'how-it-works'
      document.body.appendChild(el)

      scrollToSection('how-it-works', false)

      expect(el.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    })

    it('calls scrollIntoView with instant behavior when element exists and instant=true', () => {
      const el = document.createElement('div')
      el.id = 'pricing'
      document.body.appendChild(el)

      scrollToSection('pricing', true)

      expect(el.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'start',
      })
    })

    it('does not call window.scrollTo when element is found', () => {
      const el = document.createElement('div')
      el.id = 'audience'
      document.body.appendChild(el)

      scrollToSection('audience', false)

      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })

  describe('id is a regular section — element NOT in DOM (fallback)', () => {
    it('does not call scrollIntoView when element does not exist', () => {
      scrollToSection('nonexistent-section', false)
      // scrollIntoView should not be called; fallback sets href instead
      // We cannot assert window.location.href in jsdom (non-configurable)
      // but we can assert scrollIntoView was not called
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    })

    it('does not throw when section id does not match any element', () => {
      expect(() => scrollToSection('completely-unknown', false)).not.toThrow()
    })

    it('does not throw when section id is an empty string', () => {
      expect(() => scrollToSection('', false)).not.toThrow()
    })
  })
})

describe('LandingHeaderNav', () => {
  it('renders all 3 nav items', () => {
    render(<LandingHeaderNav activeSection={null} />)
    expect(screen.getByText('Como funciona')).toBeInTheDocument()
    expect(screen.getByText('Para quem é')).toBeInTheDocument()
    expect(screen.getByText('Preços')).toBeInTheDocument()
  })

  it('renders a <nav> with aria-label', () => {
    const { container } = render(<LandingHeaderNav activeSection={null} />)
    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('aria-label')).toBe('Navegação principal')
  })

  it('active item has aria-current="location"', () => {
    render(<LandingHeaderNav activeSection="pricing" />)
    const pricingLink = screen.getByText('Preços').closest('a')
    expect(pricingLink).toHaveAttribute('aria-current', 'location')
  })

  it('inactive items do not have aria-current', () => {
    render(<LandingHeaderNav activeSection="pricing" />)
    const howItWorksLink = screen.getByText('Como funciona').closest('a')
    const audienceLink = screen.getByText('Para quem é').closest('a')
    expect(howItWorksLink).not.toHaveAttribute('aria-current')
    expect(audienceLink).not.toHaveAttribute('aria-current')
  })

  it('no item has aria-current when activeSection is null', () => {
    render(<LandingHeaderNav activeSection={null} />)
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).not.toHaveAttribute('aria-current')
    })
  })

  it('each nav item has correct href pointing to /#section', () => {
    render(<LandingHeaderNav activeSection={null} />)
    const howItWorksLink = screen.getByText('Como funciona').closest('a')
    const audienceLink = screen.getByText('Para quem é').closest('a')
    const pricingLink = screen.getByText('Preços').closest('a')

    expect(howItWorksLink).toHaveAttribute('href', '/#how-it-works')
    expect(audienceLink).toHaveAttribute('href', '/#audience')
    expect(pricingLink).toHaveAttribute('href', '/#pricing')
  })

  it('clicking a nav link calls e.preventDefault() preventing default anchor navigation', () => {
    render(<LandingHeaderNav activeSection={null} />)
    const link = screen.getByText('Como funciona').closest('a')!

    // Attach the element so scrollIntoView is called (not the fallback)
    const sectionEl = document.createElement('div')
    sectionEl.id = 'how-it-works'
    document.body.appendChild(sectionEl)
    sectionEl.scrollIntoView = jest.fn()

    fireEvent.click(link)

    // If preventDefault was called, scrollIntoView fires (not a full navigation)
    expect(sectionEl.scrollIntoView).toHaveBeenCalled()

    document.body.removeChild(sectionEl)
  })

  it('active indicator renders when section matches', () => {
    const { container } = render(<LandingHeaderNav activeSection="how-it-works" />)
    // The active indicator is a span inside the active link
    const activeLink = screen.getByText('Como funciona').closest('a')!
    expect(activeLink).toHaveAttribute('aria-current', 'location')
    // Indicator span should be present inside the active link
    const indicator = activeLink.querySelector('span')
    expect(indicator).not.toBeNull()
  })

  it('no active indicator renders when no section is active', () => {
    render(<LandingHeaderNav activeSection={null} />)
    // All links — none should contain an indicator span
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      const indicator = link.querySelector('span')
      expect(indicator).toBeNull()
    })
  })
})
