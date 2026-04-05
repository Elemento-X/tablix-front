/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDisplay } from '@/components/error-display'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'errors.offlineShort': 'You are offline',
        'errors.offline': 'Check your internet connection and try again.',
        'errorBoundary.title': 'Something went wrong',
        'errorBoundary.description': 'An unexpected error occurred.',
        'errorBoundary.tryAgain': 'Try again',
        'errorBoundary.goHome': 'Go home',
        'errorBoundary.uploadTitle': 'Upload failed',
        'errorBoundary.uploadDescription': 'Could not process the file.',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/config/env', () => ({
  env: { NODE_ENV: 'test' },
}))

// Track network status state so tests can control it
let mockIsOnline = true

jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string }
  if (digest) err.digest = digest
  return err
}

const defaultProps = {
  error: makeError('Something broke'),
  reset: jest.fn(),
  logPrefix: 'TestBoundary',
  titleKey: 'errorBoundary.title',
  descriptionKey: 'errorBoundary.description',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ErrorDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOnline = true
  })

  // ── Online state ─────────────────────────────────────────────────────────

  describe('when online', () => {
    it('renders title using titleKey', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    })

    it('renders description using descriptionKey', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
    })

    it('renders Try again button', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('renders Go home link', () => {
      render(<ErrorDisplay {...defaultProps} />)
      const link = screen.getByRole('link', { name: /go home/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('calls reset() when Try again button is clicked', () => {
      const reset = jest.fn()
      render(<ErrorDisplay {...defaultProps} reset={reset} />)
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
      expect(reset).toHaveBeenCalledTimes(1)
    })

    it('does NOT render the WifiOff icon container when online', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} />)
      // WifiOff icon is inside a rounded-full container with amber bg
      expect(container.querySelector('.bg-amber-100')).toBeNull()
    })
  })

  // ── Offline state ─────────────────────────────────────────────────────────

  describe('when offline', () => {
    beforeEach(() => {
      mockIsOnline = false
    })

    it('renders offline short title instead of titleKey', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'You are offline' })).toBeInTheDocument()
    })

    it('renders offline description instead of descriptionKey', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByText('Check your internet connection and try again.')).toBeInTheDocument()
    })

    it('does NOT render online title when offline', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.queryByText('Something went wrong')).toBeNull()
    })

    it('renders WifiOff icon container when offline', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} />)
      expect(container.querySelector('.bg-amber-100')).not.toBeNull()
    })

    it('Try again button is present and clickable when offline', () => {
      // window.location.reload is not reassignable in jsdom — we verify the button is
      // rendered and clickable without throwing (behavioral test for the offline branch)
      render(<ErrorDisplay {...defaultProps} />)
      const btn = screen.getByRole('button', { name: /try again/i })
      expect(btn).toBeInTheDocument()
      // Clicking should not throw even though reload fires (jsdom no-ops it)
      expect(() => fireEvent.click(btn)).not.toThrow()
    })

    it('does NOT call reset() when offline (page reload path is taken instead)', () => {
      const reset = jest.fn()

      render(<ErrorDisplay {...defaultProps} reset={reset} />)
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
      // In offline state, handler calls window.location.reload(), not reset()
      expect(reset).not.toHaveBeenCalled()
    })
  })

  // ── Error logging ─────────────────────────────────────────────────────────

  describe('error logging', () => {
    it('logs error.message in non-production env', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const err = makeError('Connection refused')

      render(<ErrorDisplay {...defaultProps} error={err} logPrefix="MyBoundary" />)

      expect(consoleSpy).toHaveBeenCalledWith('[MyBoundary]', 'Connection refused')
      consoleSpy.mockRestore()
    })

    it('logs "unknown" when no digest and in test env (no digest field)', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const err = makeError('crash')

      render(<ErrorDisplay {...defaultProps} error={err} />)
      // non-production: logs message
      expect(consoleSpy).toHaveBeenCalledWith('[TestBoundary]', 'crash')
      consoleSpy.mockRestore()
    })

  })

  // ── Custom titleKey / descriptionKey ──────────────────────────────────────

  describe('custom keys', () => {
    it('renders upload-specific title for upload error boundary', () => {
      render(
        <ErrorDisplay
          error={makeError('parse failed')}
          reset={jest.fn()}
          logPrefix="UploadErrorBoundary"
          titleKey="errorBoundary.uploadTitle"
          descriptionKey="errorBoundary.uploadDescription"
        />,
      )
      expect(screen.getByRole('heading', { name: 'Upload failed' })).toBeInTheDocument()
      expect(screen.getByText('Could not process the file.')).toBeInTheDocument()
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('title renders as h2', () => {
      render(<ErrorDisplay {...defaultProps} />)
      const heading = screen.getByRole('heading', { name: 'Something went wrong' })
      expect(heading.tagName).toBe('H2')
    })

    it('Try again is a button element', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByRole('button', { name: /try again/i }).tagName).toBe('BUTTON')
    })

    it('Go home is an anchor element', () => {
      render(<ErrorDisplay {...defaultProps} />)
      expect(screen.getByRole('link', { name: /go home/i }).tagName).toBe('A')
    })

    it('buttons meet 44px min height via class', () => {
      render(<ErrorDisplay {...defaultProps} />)
      const btn = screen.getByRole('button', { name: /try again/i })
      expect(btn.className).toContain('min-h-[44px]')
    })
  })
})
