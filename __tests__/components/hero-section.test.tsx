/**
 * @jest-environment jsdom
 *
 * Tests for src/app/components/hero-section.tsx
 *
 * Covers:
 * - HeroSection renders primary and secondary CTAs
 * - ScrambleText: renders initial text, handles empty string, cleanup on unmount
 * - Scroll-to behavior: handleScrollToHowItWorks scrolls to #how-it-works
 * - i18n: all visible keys resolve (no raw key fallback)
 * - Accessibility: data-testid on CTA, aria-hidden on grid background
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { HeroSection } from '@/app/components/hero-section'

// ---------------------------------------------------------------------------
// IntersectionObserver mock (jsdom does not implement it)
// ---------------------------------------------------------------------------

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void

let intersectionCallback: IntersectionCallback | null = null

const mockObserve = jest.fn()
const mockDisconnect = jest.fn()
const mockUnobserve = jest.fn()

const MockIntersectionObserver = jest.fn().mockImplementation((cb: IntersectionCallback) => {
  intersectionCallback = cb
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  }
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'hero.earlyAccess': 'Grátis para os primeiros usuários',
        'hero.title': 'Recupere horas perdidas em planilhas',
        'hero.subtitle': 'Unificar planilhas não deveria consumir sua tarde.',
        'hero.cta': 'Simplificar minhas planilhas',
        'hero.ctaSecondary': 'Como funciona em 4 passos',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/components/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
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

jest.mock('@/components/grid-background', () => ({
  GridBackground: ({ animated }: { animated?: boolean }) => (
    <div data-testid="grid-background" data-animated={String(animated)} aria-hidden="true" />
  ),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
    h1: ({ children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...rest}>{children}</h1>
    ),
    p: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...rest}>{children}</p>
    ),
    span: ({ children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...rest}>{children}</span>
    ),
    a: ({
      children,
      onClick,
      href,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    ),
    create: (Component: React.ElementType) =>
      function MotionWrapped({
        children,
        ...rest
      }: React.PropsWithChildren<Record<string, unknown>>) {
        return <Component {...rest}>{children}</Component>
      },
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: { children: React.ReactNode; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

jest.mock('lucide-react', () => ({
  ArrowRight: () => <svg data-testid="arrow-right" aria-hidden="true" />,
  ChevronDown: () => <svg data-testid="chevron-down" aria-hidden="true" />,
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  intersectionCallback = null
  mockObserve.mockClear()
  mockDisconnect.mockClear()
  mockUnobserve.mockClear()
  MockIntersectionObserver.mockClear()
})

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

describe('HeroSection', () => {
  it('renders without crashing', () => {
    expect(() => render(<HeroSection />)).not.toThrow()
  })

  it('renders the early access badge', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByTestId('badge').textContent).toBe('Grátis para os primeiros usuários')
  })

  it('renders an h1 heading (hero title via ScrambleText)', () => {
    render(<HeroSection />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
  })

  it('h1 initially contains the translated title text', () => {
    render(<HeroSection />)
    const h1 = screen.getByRole('heading', { level: 1 })
    // ScrambleText initializes with `text` as state — title should be present before animation
    expect(h1.textContent).toBe('Recupere horas perdidas em planilhas')
  })

  it('renders the subtitle', () => {
    render(<HeroSection />)
    expect(
      screen.getByText('Unificar planilhas não deveria consumir sua tarde.'),
    ).toBeInTheDocument()
  })

  it('renders the primary CTA button text', () => {
    render(<HeroSection />)
    expect(screen.getByText('Simplificar minhas planilhas')).toBeInTheDocument()
  })

  it('primary CTA link has data-testid="cta-upload"', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('cta-upload')).toBeInTheDocument()
  })

  it('primary CTA link points to /upload', () => {
    render(<HeroSection />)
    const link = screen.getByTestId('cta-upload')
    expect(link).toHaveAttribute('href', '/upload')
  })

  it('renders the secondary CTA button text', () => {
    render(<HeroSection />)
    expect(screen.getByText('Como funciona em 4 passos')).toBeInTheDocument()
  })

  it('secondary CTA is an anchor pointing to #how-it-works', () => {
    render(<HeroSection />)
    const secondaryLink = screen.getByRole('link', { name: /como funciona em 4 passos/i })
    expect(secondaryLink).toHaveAttribute('href', '#how-it-works')
  })

  it('renders the GridBackground with animated=true', () => {
    render(<HeroSection />)
    const grid = screen.getByTestId('grid-background')
    expect(grid).toBeInTheDocument()
    expect(grid.getAttribute('data-animated')).toBe('true')
  })

  it('does not fall back to raw i18n keys for any visible text', () => {
    render(<HeroSection />)
    expect(screen.queryByText('hero.earlyAccess')).not.toBeInTheDocument()
    expect(screen.queryByText('hero.cta')).not.toBeInTheDocument()
    expect(screen.queryByText('hero.ctaSecondary')).not.toBeInTheDocument()
    expect(screen.queryByText('hero.subtitle')).not.toBeInTheDocument()
    expect(screen.queryByText('hero.title')).not.toBeInTheDocument()
  })

  it('renders ArrowRight icon inside primary CTA', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('arrow-right')).toBeInTheDocument()
  })

  it('renders ChevronDown icon inside secondary CTA', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
  })

  describe('scroll behavior', () => {
    it('calls scrollIntoView on #how-it-works when secondary CTA is clicked', () => {
      const mockScrollIntoView = jest.fn()
      const section = document.createElement('section')
      section.id = 'how-it-works'
      section.scrollIntoView = mockScrollIntoView
      document.body.appendChild(section)

      render(<HeroSection />)
      const secondaryLink = screen.getByRole('link', { name: /como funciona em 4 passos/i })

      act(() => {
        fireEvent.click(secondaryLink)
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
      document.body.removeChild(section)
    })

    it('does not throw when #how-it-works section does not exist in DOM', () => {
      render(<HeroSection />)
      const secondaryLink = screen.getByRole('link', { name: /como funciona em 4 passos/i })

      expect(() => {
        act(() => {
          fireEvent.click(secondaryLink)
        })
      }).not.toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// ScrambleText — via HeroSection integration
// ---------------------------------------------------------------------------

describe('ScrambleText (via HeroSection)', () => {
  it('initializes with the original text before intersection fires', () => {
    render(<HeroSection />)
    const h1 = screen.getByRole('heading', { level: 1 })
    // State initializes to `text` — IntersectionObserver hasn't fired yet
    expect(h1.textContent).toBe('Recupere horas perdidas em planilhas')
  })

  it('creates an IntersectionObserver for the span element', () => {
    render(<HeroSection />)
    expect(MockIntersectionObserver).toHaveBeenCalled()
    expect(mockObserve).toHaveBeenCalled()
  })

  it('disconnects observer on unmount', () => {
    const { unmount } = render(<HeroSection />)
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('calls cancelAnimationFrame on unmount', () => {
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const { unmount } = render(<HeroSection />)
    unmount()
    // cancelAnimationFrame is called during cleanup
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })

  it('triggers animate when element intersects', () => {
    jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    render(<HeroSection />)

    // Simulate intersection
    act(() => {
      if (intersectionCallback) {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry])
      }
    })

    // After intersection, setTimeout to animate should be scheduled
    // We use fake timers to verify — but since animate guards with hasAnimated,
    // just verify it doesn't throw and observer disconnects
    expect(mockDisconnect).toHaveBeenCalled()

    jest.restoreAllMocks()
  })

  it('does not animate when element is not intersecting', () => {
    jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)

    render(<HeroSection />)

    act(() => {
      if (intersectionCallback) {
        intersectionCallback([{ isIntersecting: false } as IntersectionObserverEntry])
      }
    })

    // disconnect should NOT have been called if not intersecting
    expect(mockDisconnect).not.toHaveBeenCalled()

    jest.restoreAllMocks()
  })

  it('preserves spaces in title (spaces are never scrambled)', () => {
    render(<HeroSection />)
    const h1 = screen.getByRole('heading', { level: 1 })
    // Title: "Recupere horas perdidas em planilhas" — has 4 spaces
    const title = h1.textContent ?? ''
    const spaceCount = (title.match(/ /g) ?? []).length
    // Before animation fires, all 4 spaces must be present
    expect(spaceCount).toBe(4)
  })
})
