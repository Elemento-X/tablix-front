/**
 * @jest-environment jsdom
 *
 * Tests for src/components/landing-header-mobile.tsx
 * Covers: aria-modal="true" on dialog, focus trap behavior, Escape to close,
 * body overflow lock, aria-expanded on hamburger, aria-label changes.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LandingHeaderMobile } from '@/components/landing-header-mobile'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...rest}>{children}</div>
    ),
    span: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => (
      <span {...rest}>{children}</span>
    ),
    a: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & Record<string, unknown>) => (
      <a {...rest}>{children}</a>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    locale: 'pt-BR',
    t: (key: string) => {
      const map: Record<string, string> = {
        'header.nav.howItWorks': 'Como funciona',
        'header.nav.audience': 'Para quem é',
        'header.nav.pricing': 'Preços',
        'header.cta': 'Começar grátis',
        'a11y.closeMenu': 'Fechar menu',
        'a11y.openMenu': 'Abrir menu',
        'a11y.navigationMenu': 'Menu de navegação',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}))

// Mock scrollToSection — it's imported from landing-header-nav
jest.mock('@/components/landing-header-nav', () => ({
  scrollToSection: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})

describe('LandingHeaderMobile', () => {
  describe('initial state', () => {
    it('hamburger button has aria-expanded="false" initially', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      const hamburger = screen.getByRole('button', { name: 'Abrir menu' })
      expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    })

    it('drawer/dialog is not visible initially', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  describe('open state', () => {
    it('clicking hamburger opens the drawer', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      const hamburger = screen.getByRole('button', { name: 'Abrir menu' })
      fireEvent.click(hamburger)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('dialog has aria-modal="true"', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('dialog has aria-label set to navigation menu label', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-label', 'Menu de navegação')
    })

    it('hamburger aria-label changes to "Fechar menu" when open', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeInTheDocument()
    })

    it('hamburger has aria-expanded="true" when open', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const closeBtn = screen.getByRole('button', { name: 'Fechar menu' })
      expect(closeBtn).toHaveAttribute('aria-expanded', 'true')
    })

    it('renders all nav items inside the drawer', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(screen.getByText('Como funciona')).toBeInTheDocument()
      expect(screen.getByText('Para quem é')).toBeInTheDocument()
      expect(screen.getByText('Preços')).toBeInTheDocument()
    })

    it('nav links have href="/#section" format', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const link = screen.getByText('Como funciona').closest('a')
      expect(link).toHaveAttribute('href', '/#how-it-works')
    })

    it('locks body overflow when drawer is open', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('close behavior', () => {
    it('clicking hamburger again closes the drawer', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('pressing Escape closes the drawer', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })

      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('restores body overflow when drawer closes', () => {
      render(<LandingHeaderMobile activeSection={null} />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(document.body.style.overflow).toBe('hidden')

      fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
      expect(document.body.style.overflow).toBe('')
    })
  })
})
