/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { CookieConsent } from '@/components/cookie-consent'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      onAnimationComplete,
      // consume animation-specific props so they don't bleed into the DOM
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & {
      onAnimationComplete?: () => void
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => (
      <div
        {...rest}
        // fire focus side-effect synchronously so tests can assert without waits
        ref={(el) => {
          if (el && onAnimationComplete) onAnimationComplete()
        }}
      >
        {children}
      </div>
    ),
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

jest.mock('lucide-react', () => ({
  Cookie: () => <svg data-testid="cookie-icon" />,
}))

const mockT = (key: string) => key

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({ t: mockT }),
}))

let mockReducedMotion = false

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

const mockOptInCapturing = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/analytics/posthog', () => ({
  optInCapturing: () => mockOptInCapturing(),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tablix-cookie-consent'

function renderConsent() {
  return render(<CookieConsent />)
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  mockReducedMotion = false
  mockOptInCapturing.mockClear()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CookieConsent — visibility', () => {
  it('does not render the dialog when localStorage already has consent', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    renderConsent()

    // Advance timers to ensure no late render
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not render the dialog immediately when no consent is stored', () => {
    renderConsent()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog after 1500 ms when no consent is stored', () => {
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render before the 1500 ms threshold', () => {
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(1499)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders immediately (0 ms delay) when prefers-reduced-motion is active', () => {
    mockReducedMotion = true
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('still requires 1500 ms when prefers-reduced-motion is false', () => {
    mockReducedMotion = false
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('CookieConsent — accept action', () => {
  function showBanner() {
    mockReducedMotion = true
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
  }

  it('hides the dialog after clicking the accept button', () => {
    showBanner()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('persists "accepted" in localStorage after clicking accept', () => {
    showBanner()
    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('accepted')
  })

  it('does NOT write to localStorage before the button is clicked', () => {
    showBanner()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('CookieConsent — accessibility', () => {
  function showBanner() {
    mockReducedMotion = true
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
  }

  it('dialog has role="dialog"', () => {
    showBanner()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog has aria-label from i18n key', () => {
    showBanner()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'cookieConsent.ariaLabel')
  })

  it('dialog has aria-describedby attribute', () => {
    showBanner()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-describedby')
  })

  it('aria-describedby points to the description paragraph', () => {
    showBanner()
    const dialog = screen.getByRole('dialog')
    const describedById = dialog.getAttribute('aria-describedby')!
    expect(describedById).toBeTruthy()

    const descEl = document.getElementById(describedById)
    expect(descEl).not.toBeNull()
    expect(descEl?.textContent).toBe('cookieConsent.message')
  })

  it('accept button receives focus after animation completes', () => {
    showBanner()
    // motion.div mock calls onAnimationComplete synchronously via ref callback
    const button = screen.getByRole('button', { name: 'cookieConsent.accept' })
    expect(document.activeElement).toBe(button)
  })
})

describe('CookieConsent — content', () => {
  function showBanner() {
    mockReducedMotion = true
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
  }

  it('renders the Cookie icon', () => {
    showBanner()
    expect(screen.getByTestId('cookie-icon')).toBeInTheDocument()
  })

  it('renders the title via i18n key', () => {
    showBanner()
    expect(screen.getByText('cookieConsent.title')).toBeInTheDocument()
  })

  it('renders the message via i18n key', () => {
    showBanner()
    expect(screen.getByText('cookieConsent.message')).toBeInTheDocument()
  })

  it('renders the accept button with i18n label', () => {
    showBanner()
    expect(screen.getByRole('button', { name: 'cookieConsent.accept' })).toBeInTheDocument()
  })

  it('renders the "learn more" link with i18n label', () => {
    showBanner()
    expect(screen.getByText('cookieConsent.learnMore')).toBeInTheDocument()
  })

  it('"learn more" link points to /privacy-policy', () => {
    showBanner()
    const link = screen.getByRole('link', { name: 'cookieConsent.learnMore' })
    expect(link).toHaveAttribute('href', '/privacy-policy')
  })
})

describe('CookieConsent — analytics integration', () => {
  function showBanner() {
    mockReducedMotion = true
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
  }

  it('calls optInCapturing when accept button is clicked', () => {
    showBanner()
    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.accept' }))
    expect(mockOptInCapturing).toHaveBeenCalledTimes(1)
  })

  it('re-applies consent on reload when localStorage has accepted', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(mockOptInCapturing).toHaveBeenCalledTimes(1)
  })

  it('does not call optInCapturing when no consent in localStorage', () => {
    renderConsent()
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(mockOptInCapturing).not.toHaveBeenCalled()
  })
})

describe('CookieConsent — timer cleanup', () => {
  it('does not show the banner if the component unmounts before the timer fires', () => {
    const { unmount } = renderConsent()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    unmount()
    // Advancing past the 1500 ms threshold after unmount must not throw
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    // No dialog in the document after unmount
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
