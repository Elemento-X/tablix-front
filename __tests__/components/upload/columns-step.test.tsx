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
        'processing.consumingQuota': 'processing.consumingQuota',
        'processing.mergingFiles': 'processing.mergingFiles',
        'processing.generatingFile': 'processing.generatingFile',
        'processing.downloading': 'processing.downloading',
        'onboarding.tipColumns': 'onboarding.tipColumns',
        'onboarding.gotIt': 'onboarding.gotIt',
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
  processingPhase: null as import('@/hooks/use-upload-flow').ProcessingPhase | null,
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

  describe('processingPhase prop', () => {
    it('shows consuming-quota label during consuming-quota phase', () => {
      render(
        <ColumnsStep
          {...defaultProps}
          isProcessing
          processingPhase="consuming-quota"
        />,
      )
      expect(screen.getByText('processing.consumingQuota')).toBeInTheDocument()
    })

    it('shows merging label during merging phase', () => {
      render(
        <ColumnsStep {...defaultProps} isProcessing processingPhase="merging" />,
      )
      expect(screen.getByText('processing.mergingFiles')).toBeInTheDocument()
    })

    it('shows generating label during generating phase', () => {
      render(
        <ColumnsStep
          {...defaultProps}
          isProcessing
          processingPhase="generating"
        />,
      )
      expect(screen.getByText('processing.generatingFile')).toBeInTheDocument()
    })

    it('shows downloading label during downloading phase', () => {
      render(
        <ColumnsStep
          {...defaultProps}
          isProcessing
          processingPhase="downloading"
        />,
      )
      expect(screen.getByText('processing.downloading')).toBeInTheDocument()
    })

    it('falls back to upload.processing label when isProcessing but no phase', () => {
      render(
        <ColumnsStep
          {...defaultProps}
          isProcessing
          processingPhase={null}
        />,
      )
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('shows default process button text when not processing', () => {
      render(<ColumnsStep {...defaultProps} isProcessing={false} processingPhase={null} />)
      expect(screen.getByText('Process & Download')).toBeInTheDocument()
    })
  })

  describe('onboarding tip', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('shows onboarding tip when not seen before', () => {
      render(<ColumnsStep {...defaultProps} />)
      expect(screen.getByText('onboarding.tipColumns')).toBeInTheDocument()
    })

    it('does not show onboarding tip when already seen', () => {
      localStorage.setItem('tablix-onboarding-columns-seen', '1')
      render(<ColumnsStep {...defaultProps} />)
      expect(screen.queryByText('onboarding.tipColumns')).toBeNull()
    })

    it('hides tip and sets localStorage when dismissed', () => {
      render(<ColumnsStep {...defaultProps} />)
      fireEvent.click(screen.getByText('onboarding.gotIt'))
      expect(screen.queryByText('onboarding.tipColumns')).toBeNull()
      expect(localStorage.getItem('tablix-onboarding-columns-seen')).toBe('1')
    })
  })
})
