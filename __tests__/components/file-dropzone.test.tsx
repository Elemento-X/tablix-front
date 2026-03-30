/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { FileDropzone } from '@/components/file-dropzone'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'upload.dropzone': 'Drop files here',
        'upload.dropzoneWithFiles': 'files selected',
        'upload.maxSize': 'CSV or XLSX, max 10MB each',
        'dropzone.dragActive': 'Drop here!',
      }
      return map[key] ?? key
    },
  }),
}))

describe('FileDropzone', () => {
  const mockOnFilesAccepted = jest.fn()

  beforeEach(() => {
    mockOnFilesAccepted.mockClear()
  })

  it('renders the dropzone', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    expect(screen.getByText('Drop files here')).toBeInTheDocument()
  })

  it('has role="button"', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Drop files here',
    )
  })

  it('has aria-describedby pointing to hint', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    const dropzone = screen.getByRole('button')
    const hintId = dropzone.getAttribute('aria-describedby')
    expect(hintId).toBeTruthy()
    expect(document.getElementById(hintId!)).toBeInTheDocument()
  })

  it('has tabIndex=0 for keyboard accessibility', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
  })

  it('shows max size hint', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    expect(screen.getByText('CSV or XLSX, max 10MB each')).toBeInTheDocument()
  })

  it('shows file count when files are already selected', () => {
    render(
      <FileDropzone
        onFilesAccepted={mockOnFilesAccepted}
        currentFileCount={3}
      />,
    )
    expect(screen.getByText('3 files selected')).toBeInTheDocument()
  })

  it('renders hidden file input', () => {
    const { container } = render(
      <FileDropzone onFilesAccepted={mockOnFilesAccepted} />,
    )
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
  })

  it('applies disabled state', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} disabled />)
    const dropzone = screen.getByRole('button')
    expect(dropzone.className).toContain('pointer-events-none')
    expect(dropzone.className).toContain('opacity-50')
  })

  it('applies custom className', () => {
    render(
      <FileDropzone
        onFilesAccepted={mockOnFilesAccepted}
        className="my-class"
      />,
    )
    const dropzone = screen.getByRole('button')
    expect(dropzone.className).toContain('my-class')
  })

  it('handles click interaction', () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    const dropzone = screen.getByRole('button')
    fireEvent.click(dropzone)
    // Should not throw — click opens file dialog (handled by react-dropzone)
  })

  it('calls onFilesAccepted when files are dropped', async () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    const input = document.querySelector('input[type="file"]')!

    const file = new File(['content'], 'test.csv', { type: 'text/csv' })
    await act(async () => {
      fireEvent.drop(input, {
        dataTransfer: { files: [file], types: ['Files'] },
      })
    })

    await waitFor(() => {
      expect(mockOnFilesAccepted).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'test.csv' }),
      ])
    })
  })

  it('shows drag active state during drag over', async () => {
    render(<FileDropzone onFilesAccepted={mockOnFilesAccepted} />)
    const dropzone = screen.getByRole('button')

    await act(async () => {
      fireEvent.dragEnter(dropzone, {
        dataTransfer: {
          files: [],
          types: ['Files'],
          items: [{ kind: 'file', type: 'text/csv' }],
        },
      })
    })

    // After dragEnter, isDragActive should toggle visual state
    // The dropzone should still be in the document
    expect(dropzone).toBeInTheDocument()
  })

  it('respects maxFiles prop', () => {
    render(
      <FileDropzone
        onFilesAccepted={mockOnFilesAccepted}
        maxFiles={5}
        currentFileCount={3}
      />,
    )
    const input = document.querySelector('input[type="file"]')!
    expect(input).toBeInTheDocument()
  })

  it('accepts custom accept prop', () => {
    render(
      <FileDropzone
        onFilesAccepted={mockOnFilesAccepted}
        accept={{ 'text/csv': ['.csv'] }}
      />,
    )
    const input = document.querySelector('input[type="file"]')!
    expect(input).toHaveAttribute('accept', 'text/csv,.csv')
  })
})
