/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { UsageStatus } from '@/app/upload/components/usage-status'
import type { UsageInfo } from '@/hooks/use-usage'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'status.loading': 'Loading...',
        'status.plan': 'Plan',
        'status.unificationsRemaining': 'remaining',
        'status.maxFiles': 'Max',
        'status.files': 'files',
        'status.maxTotalSize': 'Total size',
        'status.maxRowsLabel': 'Max rows:',
        'status.maxRows': 'rows',
        'status.maxColumnsLabel': 'Max columns:',
        'status.maxColumns': 'columns',
        'a11y.usageProgress': 'Plan usage progress',
      }
      return map[key] ?? key
    },
  }),
}))

function createUsage(overrides: Partial<UsageInfo> = {}): UsageInfo {
  return {
    plan: 'free',
    unifications: { current: 1, remaining: 2, max: 3 },
    limits: {
      maxInputFiles: 5,
      maxFileSize: 10485760,
      maxTotalSize: 10485760,
      maxRows: 1000,
      maxColumns: 50,
    },
    ...overrides,
  }
}

describe('UsageStatus', () => {
  it('renders skeleton when loading', () => {
    render(<UsageStatus usage={null} isLoading />)
    expect(screen.getByLabelText('Loading...')).toBeInTheDocument()
  })

  it('renders nothing when not loading and no usage', () => {
    const { container } = render(<UsageStatus usage={null} isLoading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders plan name in uppercase', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    expect(screen.getByText(/FREE/)).toBeInTheDocument()
  })

  it('renders remaining/max unifications', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    expect(screen.getByText(/2\/3/)).toBeInTheDocument()
  })

  it('renders progress bar with correct ARIA attributes', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '2')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '3')
    expect(progressbar).toHaveAttribute('aria-label', 'Plan usage progress')
  })

  it('uses destructive color when remaining is 0', () => {
    const usage = createUsage({
      unifications: { current: 3, remaining: 0, max: 3 },
    })
    render(<UsageStatus usage={usage} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    const inner = progressbar.firstChild as HTMLElement
    expect(inner.className).toContain('bg-destructive')
  })

  it('uses warning color when remaining is 1', () => {
    const usage = createUsage({
      unifications: { current: 2, remaining: 1, max: 3 },
    })
    render(<UsageStatus usage={usage} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    const inner = progressbar.firstChild as HTMLElement
    expect(inner.className).toContain('bg-warning')
  })

  it('uses success color when remaining > 1', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    const inner = progressbar.firstChild as HTMLElement
    expect(inner.className).toContain('bg-success')
  })

  it('sets progress bar width based on remaining percentage', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    const inner = progressbar.firstChild as HTMLElement
    // 2/3 * 100 ≈ 66.67%
    expect(inner.style.width).toMatch(/66\.6/)
  })

  it('clamps progress bar width to 100% when remaining exceeds max', () => {
    // Covers the Math.min(100, ...) branch — remaining > max
    const usage = createUsage({
      unifications: { current: 0, remaining: 5, max: 3 },
    })
    render(<UsageStatus usage={usage} isLoading={false} />)
    const progressbar = screen.getByRole('progressbar')
    const inner = progressbar.firstChild as HTMLElement
    expect(inner.style.width).toBe('100%')
  })

  it('renders maxRowsLabel and maxColumnsLabel i18n keys', () => {
    render(<UsageStatus usage={createUsage()} isLoading={false} />)
    expect(screen.getByText(/Max rows:/)).toBeInTheDocument()
    expect(screen.getByText(/Max columns:/)).toBeInTheDocument()
  })
})
