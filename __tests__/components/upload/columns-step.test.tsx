/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnsStep } from '@/app/upload/components/columns-step'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'columns.detected': 'Detected columns',
        'columns.of': 'of',
        'columns.selected': 'selected',
        'columns.max': 'max',
        'columns.startOver': 'Start over',
        'columns.deselectAll': 'Deselect all',
        'columns.selectAll': 'Select all',
        'columns.processAndDownload': 'Process & Download',
        'upload.processing': 'Processing...',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}))

const defaultProps = {
  detectedColumns: ['Name', 'Email', 'Phone'],
  selectedColumns: ['Name'],
  isProcessing: false,
  usage: null,
  onToggleColumn: jest.fn(),
  onSelectAll: jest.fn(),
  onDeselectAll: jest.fn(),
  onProcess: jest.fn(),
  onStartOver: jest.fn(),
}

describe('ColumnsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders detected columns count in heading', () => {
    render(<ColumnsStep {...defaultProps} />)
    expect(screen.getByText(/Detected columns \(3\)/)).toBeInTheDocument()
  })

  it('renders selected columns count', () => {
    render(<ColumnsStep {...defaultProps} />)
    expect(screen.getByText(/1 of 3 selected/)).toBeInTheDocument()
  })

  it('renders all column buttons', () => {
    render(<ColumnsStep {...defaultProps} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('sets aria-pressed on selected columns', () => {
    render(<ColumnsStep {...defaultProps} />)
    const nameBtn = screen.getByText('Name').closest('button')!
    const emailBtn = screen.getByText('Email').closest('button')!
    expect(nameBtn).toHaveAttribute('aria-pressed', 'true')
    expect(emailBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies selected styling to selected columns', () => {
    render(<ColumnsStep {...defaultProps} />)
    const nameBtn = screen.getByText('Name').closest('button')!
    expect(nameBtn.className).toContain('bg-teal-700')
  })

  it('calls onToggleColumn when a column is clicked', () => {
    const onToggleColumn = jest.fn()
    render(<ColumnsStep {...defaultProps} onToggleColumn={onToggleColumn} />)
    fireEvent.click(screen.getByText('Email').closest('button')!)
    expect(onToggleColumn).toHaveBeenCalledWith('Email')
  })

  it('calls onSelectAll when select all is clicked', () => {
    const onSelectAll = jest.fn()
    render(<ColumnsStep {...defaultProps} onSelectAll={onSelectAll} />)
    fireEvent.click(screen.getByText('Select all'))
    expect(onSelectAll).toHaveBeenCalledTimes(1)
  })

  it('calls onDeselectAll when deselect all is clicked', () => {
    const onDeselectAll = jest.fn()
    render(<ColumnsStep {...defaultProps} onDeselectAll={onDeselectAll} />)
    fireEvent.click(screen.getByText('Deselect all'))
    expect(onDeselectAll).toHaveBeenCalledTimes(1)
  })

  it('disables deselect all when no columns selected', () => {
    render(<ColumnsStep {...defaultProps} selectedColumns={[]} />)
    const btn = screen.getByText('Deselect all').closest('button')!
    expect(btn).toBeDisabled()
  })

  it('disables select all when all columns selected', () => {
    render(
      <ColumnsStep
        {...defaultProps}
        selectedColumns={['Name', 'Email', 'Phone']}
      />,
    )
    const btn = screen.getByText('Select all').closest('button')!
    expect(btn).toBeDisabled()
  })

  it('calls onProcess when process button is clicked', () => {
    const onProcess = jest.fn()
    render(<ColumnsStep {...defaultProps} onProcess={onProcess} />)
    fireEvent.click(screen.getByText('Process & Download'))
    expect(onProcess).toHaveBeenCalledTimes(1)
  })

  it('disables process button when no columns selected', () => {
    render(<ColumnsStep {...defaultProps} selectedColumns={[]} />)
    const btn = screen.getByText('Process & Download').closest('button')!
    expect(btn).toBeDisabled()
  })

  it('disables process button while processing', () => {
    render(<ColumnsStep {...defaultProps} isProcessing />)
    const btn = screen.getByText('Processing...').closest('button')!
    expect(btn).toBeDisabled()
  })

  it('calls onStartOver when start over is clicked', () => {
    const onStartOver = jest.fn()
    render(<ColumnsStep {...defaultProps} onStartOver={onStartOver} />)
    fireEvent.click(screen.getByText('Start over'))
    expect(onStartOver).toHaveBeenCalledTimes(1)
  })

  it('shows max columns from usage when available', () => {
    const usage = {
      plan: 'free' as const,
      unifications: { current: 0, remaining: 3, max: 3 },
      limits: {
        maxInputFiles: 5,
        maxFileSize: 10485760,
        maxTotalSize: 10485760,
        maxRows: 1000,
        maxColumns: 50,
      },
    }
    render(<ColumnsStep {...defaultProps} usage={usage} />)
    expect(screen.getByText(/max 50/)).toBeInTheDocument()
  })
})
