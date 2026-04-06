/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultStep } from '@/app/upload/components/result-step'
import type { ResultData } from '@/hooks/use-upload-flow'
import type { UsageInfo } from '@/hooks/use-usage'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

jest.mock('next/link', () => {
  const LinkMock = ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
  LinkMock.displayName = 'Link'
  return LinkMock
})

jest.mock('@/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...rest}>
      {children}
    </button>
  ),
  buttonVariants: () => 'mock-button-class',
}))

jest.mock('@/components/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('lucide-react', () => ({
  CircleCheckBig: () => <svg data-testid="check-circle2" />,
  FileSpreadsheet: () => <svg data-testid="file-spreadsheet" />,
  Rows3: () => <svg data-testid="rows3" />,
  Columns3: () => <svg data-testid="columns3" />,
  ArrowRight: () => <svg data-testid="arrow-right" />,
  RotateCcw: () => <svg data-testid="rotate-ccw" />,
}))

const defaultResultData: ResultData = {
  fileCount: 2,
  rowCount: 150,
  columnCount: 3,
}

const freeUsage: UsageInfo = {
  plan: 'free',
  unifications: { current: 1, remaining: 2, max: 3 },
  limits: {
    maxInputFiles: 3,
    maxFileSize: 10 * 1024 * 1024,
    maxTotalSize: 10 * 1024 * 1024,
    maxRows: 500,
    maxColumns: 3,
  },
}

const proUsage: UsageInfo = {
  plan: 'pro',
  unifications: { current: 1, remaining: 39, max: 40 },
  limits: {
    maxInputFiles: 10,
    maxFileSize: 50 * 1024 * 1024,
    maxTotalSize: 100 * 1024 * 1024,
    maxRows: 5000,
    maxColumns: 10,
  },
}

describe('ResultStep', () => {
  const defaultProps = {
    resultData: defaultResultData,
    usage: freeUsage,
    onStartOver: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders success title and subtitle', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText('result.title')).toBeInTheDocument()
    expect(screen.getByText('result.subtitle')).toBeInTheDocument()
  })

  it('renders check circle icon', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByTestId('check-circle2')).toBeInTheDocument()
  })

  it('renders file count stat', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/result\.filesUnified/)).toBeInTheDocument()
  })

  it('renders row count stat when rowCount > 0', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/result\.rowsProcessed/)).toBeInTheDocument()
  })

  it('does NOT render row count stat when rowCount is null (server-side path)', () => {
    const serverData: ResultData = { fileCount: 2, rowCount: null, columnCount: 3 }
    render(<ResultStep {...defaultProps} resultData={serverData} />)
    expect(screen.queryByTestId('rows3')).toBeNull()
    expect(screen.queryByText(/result\.rowsProcessed/)).toBeNull()
  })

  it('renders column count stat', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/result\.columnsSelected/)).toBeInTheDocument()
  })

  it('renders remaining quota text when usage is provided', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/result\.remainingQuota/)).toBeInTheDocument()
  })

  it('does NOT render remaining quota text when usage is null', () => {
    render(<ResultStep {...defaultProps} usage={null} />)
    expect(screen.queryByText(/result\.remainingQuota/)).toBeNull()
  })

  it('shows upgrade Pro banner for free plan users', () => {
    render(<ResultStep {...defaultProps} usage={freeUsage} />)
    // upgradePro key appears both in the banner title and the button text
    const upgradeTexts = screen.getAllByText('result.upgradePro')
    expect(upgradeTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('shows upgrade message for free plan users', () => {
    render(<ResultStep {...defaultProps} usage={freeUsage} />)
    expect(screen.getByText('result.upgradeMessage')).toBeInTheDocument()
  })

  it('does NOT show upgrade Pro banner for Pro plan users', () => {
    render(<ResultStep {...defaultProps} usage={proUsage} />)
    expect(screen.queryByText('result.upgradePro')).toBeNull()
    expect(screen.queryByText('result.upgradeMessage')).toBeNull()
  })

  it('does NOT show upgrade Pro banner when usage is null', () => {
    render(<ResultStep {...defaultProps} usage={null} />)
    expect(screen.queryByText('result.upgradePro')).toBeNull()
  })

  it('calls onStartOver when new unification button is clicked', () => {
    const onStartOver = jest.fn()
    render(<ResultStep {...defaultProps} onStartOver={onStartOver} />)
    fireEvent.click(screen.getByText('result.newUnification').closest('button')!)
    expect(onStartOver).toHaveBeenCalledTimes(1)
  })

  it('renders new unification button with rotate icon', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByTestId('rotate-ccw')).toBeInTheDocument()
    expect(screen.getByText('result.newUnification')).toBeInTheDocument()
  })

  it('passes correct fileCount to i18n key', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/filesUnified.*"count":2/)).toBeInTheDocument()
  })

  it('passes correct rowCount to i18n key', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/rowsProcessed.*"count":150/)).toBeInTheDocument()
  })

  it('passes correct columnCount to i18n key', () => {
    render(<ResultStep {...defaultProps} />)
    expect(screen.getByText(/columnsSelected.*"count":3/)).toBeInTheDocument()
  })

  it('passes correct remaining and max quota values', () => {
    render(<ResultStep {...defaultProps} usage={freeUsage} />)
    expect(screen.getByText(/remainingQuota.*"remaining":2.*"max":3/)).toBeInTheDocument()
  })

  it('renders with single file count', () => {
    const singleFile: ResultData = { fileCount: 1, rowCount: 50, columnCount: 1 }
    render(<ResultStep {...defaultProps} resultData={singleFile} />)
    expect(screen.getByText(/filesUnified.*"count":1/)).toBeInTheDocument()
  })

  it('renders with zero columns edge case', () => {
    const zeroColumns: ResultData = { fileCount: 2, rowCount: 50, columnCount: 0 }
    render(<ResultStep {...defaultProps} resultData={zeroColumns} />)
    expect(screen.getByText(/columnsSelected.*"count":0/)).toBeInTheDocument()
  })
})
