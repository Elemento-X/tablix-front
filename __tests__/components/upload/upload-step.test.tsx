/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadStep } from '@/app/upload/components/upload-step'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'columns.of': 'of',
        'status.files': 'files',
        'status.clickToAddMore': 'Click to add more',
        'upload.securityNote': 'Your files are processed securely',
        'upload.processing': 'Processing...',
        'upload.continue': 'Continue',
        'upload.dropzone': 'Drop files here',
        'upload.maxSize': 'CSV or XLSX',
        'dropzone.dragActive': 'Drop!',
        'upload.dropzoneWithFiles': 'files selected',
        'onboarding.tipUpload': 'onboarding.tipUpload',
        'onboarding.gotIt': 'onboarding.gotIt',
        'a11y.removeFile': 'a11y.removeFile',
        'status.quotaExhausted': 'status.quotaExhausted',
        'status.quotaExhaustedHint': 'status.quotaExhaustedHint',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/lib/security', () => ({
  sanitizeFileName: (name: string) => name,
}))

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}))

function createFile(name: string, size: number): File {
  return new File(['x'.repeat(size)], name, { type: 'text/csv' })
}

describe('UploadStep', () => {
  const defaultProps = {
    files: [] as File[],
    isUploading: false,
    maxInputFiles: 5,
    maxTotalSize: 10485760,
    currentTotalSize: 0,
    quotaExhausted: false,
    onFilesAccepted: jest.fn(),
    onRemoveFile: jest.fn(),
    onUpload: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dropzone', () => {
    render(<UploadStep {...defaultProps} />)
    expect(screen.getByText('Drop files here')).toBeInTheDocument()
  })

  it('renders continue button disabled when no files', () => {
    render(<UploadStep {...defaultProps} />)
    const btn = screen.getByRole('button', { name: 'Continue' })
    expect(btn).toBeDisabled()
  })

  it('renders continue button enabled when files present', () => {
    const files = [createFile('test.csv', 100)]
    render(<UploadStep {...defaultProps} files={files} />)
    const btn = screen.getByRole('button', { name: 'Continue' })
    expect(btn).not.toBeDisabled()
  })

  it('calls onUpload when continue button is clicked', () => {
    const onUpload = jest.fn()
    const files = [createFile('test.csv', 100)]
    render(<UploadStep {...defaultProps} files={files} onUpload={onUpload} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it('disables continue button while uploading', () => {
    const files = [createFile('test.csv', 100)]
    render(<UploadStep {...defaultProps} files={files} isUploading />)
    const btn = screen.getByRole('button', { name: 'Processing...' })
    expect(btn).toBeDisabled()
  })

  it('shows file list when files are present', () => {
    const files = [createFile('data.csv', 1024)]
    render(<UploadStep {...defaultProps} files={files} />)
    expect(screen.getByText('data.csv')).toBeInTheDocument()
  })

  it('shows file count summary', () => {
    const files = [createFile('a.csv', 100), createFile('b.csv', 200)]
    render(<UploadStep {...defaultProps} files={files} />)
    expect(screen.getByText(/2 of 5 files/)).toBeInTheDocument()
  })

  it('calls onRemoveFile when remove button is clicked', () => {
    const onRemoveFile = jest.fn()
    const files = [createFile('test.csv', 100)]
    render(
      <UploadStep
        {...defaultProps}
        files={files}
        onRemoveFile={onRemoveFile}
      />,
    )
    fireEvent.click(screen.getByLabelText('a11y.removeFile test.csv'))
    expect(onRemoveFile).toHaveBeenCalledWith(0)
  })

  it('shows "click to add more" when under max files', () => {
    const files = [createFile('test.csv', 100)]
    render(<UploadStep {...defaultProps} files={files} />)
    expect(screen.getByText('Click to add more')).toBeInTheDocument()
  })

  it('does not show "click to add more" when at max files', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      createFile(`file${i}.csv`, 100),
    )
    render(<UploadStep {...defaultProps} files={files} />)
    expect(screen.queryByText('Click to add more')).not.toBeInTheDocument()
  })

  it('shows security note', () => {
    render(<UploadStep {...defaultProps} />)
    expect(
      screen.getByText('Your files are processed securely'),
    ).toBeInTheDocument()
  })

  describe('quotaExhausted prop', () => {
    it('disables continue button when quotaExhausted=true', () => {
      const files = [createFile('test.csv', 100)]
      render(<UploadStep {...defaultProps} files={files} quotaExhausted />)
      const btn = screen.getByRole('button', { name: 'Continue' })
      expect(btn).toBeDisabled()
    })

    it('disables dropzone visually when quotaExhausted=true', () => {
      render(<UploadStep {...defaultProps} quotaExhausted />)
      // FileDropzone uses pointer-events-none and opacity-50 when disabled
      // react-dropzone does not add HTML disabled attr to the hidden input
      const dropzone = screen.getByTestId('dropzone')
      expect(dropzone.className).toContain('pointer-events-none')
      expect(dropzone.className).toContain('opacity-50')
    })

    it('enables continue button when quotaExhausted=false and files present', () => {
      const files = [createFile('test.csv', 100)]
      render(<UploadStep {...defaultProps} files={files} quotaExhausted={false} />)
      const btn = screen.getByRole('button', { name: 'Continue' })
      expect(btn).not.toBeDisabled()
    })

    it('shows empty state quota block when quotaExhausted=true and no files', () => {
      render(<UploadStep {...defaultProps} quotaExhausted files={[]} />)
      expect(screen.getByText('status.quotaExhausted')).toBeInTheDocument()
      expect(screen.getByText('status.quotaExhaustedHint')).toBeInTheDocument()
    })

    it('does NOT show empty state quota when quotaExhausted=true but files are present', () => {
      const files = [createFile('data.csv', 100)]
      render(<UploadStep {...defaultProps} quotaExhausted files={files} />)
      expect(screen.queryByText('status.quotaExhausted')).not.toBeInTheDocument()
    })

    it('does NOT show empty state quota when quotaExhausted=false and no files', () => {
      render(<UploadStep {...defaultProps} quotaExhausted={false} files={[]} />)
      expect(screen.queryByText('status.quotaExhausted')).not.toBeInTheDocument()
    })
  })

  describe('onboarding tip', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('shows onboarding tip when not seen before', () => {
      render(<UploadStep {...defaultProps} />)
      expect(screen.getByText('onboarding.tipUpload')).toBeInTheDocument()
    })

    it('does not show onboarding tip when already seen', () => {
      localStorage.setItem('tablix-onboarding-upload-seen', '1')
      render(<UploadStep {...defaultProps} />)
      expect(screen.queryByText('onboarding.tipUpload')).toBeNull()
    })

    it('hides tip and sets localStorage when dismissed', () => {
      render(<UploadStep {...defaultProps} />)
      fireEvent.click(screen.getByText('onboarding.gotIt'))
      expect(screen.queryByText('onboarding.tipUpload')).toBeNull()
      expect(localStorage.getItem('tablix-onboarding-upload-seen')).toBe('1')
    })
  })
})
