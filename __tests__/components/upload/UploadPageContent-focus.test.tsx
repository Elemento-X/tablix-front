/**
 * @jest-environment jsdom
 *
 * Tests for focus management added in Card 9.3 — WCAG AA baseline.
 *
 * When the upload flow transitions between steps (upload → columns → result),
 * focus must move to the page heading (h1) so keyboard and screen-reader users
 * know they are in a new context.
 *
 * Covers:
 * - h1 has tabIndex={-1} (programmatically focusable without being in tab order)
 * - h1 has outline-none class (no default focus ring for mouse users)
 * - h1 does NOT receive focus on initial mount (isInitialMount guard)
 * - h1 receives focus when step changes from "upload" to "columns"
 * - The <main> element has id="main-content" (skip link target)
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { UploadPageContent } from '@/app/upload/components/UploadPageContent'
import { useUsage } from '@/hooks/use-usage'
import { mergeSpreadsheets, canProcessClientSide, downloadBlob } from '@/lib/spreadsheet-merge'

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock('@/hooks/use-usage', () => ({
  useUsage: jest.fn(),
  formatFileSize: (bytes: number) => `${bytes}B`,
}))

jest.mock('@/hooks/use-file-parser', () => ({
  useFileParser: () => ({
    parseFile: jest.fn().mockResolvedValue({
      columns: ['name', 'email'],
      rowCount: 10,
    }),
  }),
}))

jest.mock('@/lib/security', () => ({
  validateFile: jest.fn(() => ({ valid: true })),
  validateFileContent: jest.fn().mockResolvedValue({ valid: true }),
  sanitizeFileName: jest.fn((name: string) => name),
}))

jest.mock('@/lib/spreadsheet-merge', () => ({
  mergeSpreadsheets: jest.fn(),
  canProcessClientSide: jest.fn(),
  downloadBlob: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('next/link', () => {
  const LinkMock = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  LinkMock.displayName = 'Link'
  return LinkMock
})

jest.mock('@/components/language-selector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}))

jest.mock('@/components/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}))

jest.mock('@/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
  }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}))

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" />,
  ArrowRight: () => <svg data-testid="arrow-right" />,
  AlertTriangle: () => <svg data-testid="alert-triangle" />,
  Check: () => <svg data-testid="check" />,
  CheckCircle2: () => <svg data-testid="check-circle" />,
  Columns3: () => <svg data-testid="columns3" />,
  FileSpreadsheet: () => <svg data-testid="file-spreadsheet" />,
  Info: () => <svg data-testid="info" />,
  Lightbulb: () => <svg data-testid="lightbulb" />,
  Loader2: () => <svg data-testid="loader2" />,
  RotateCcw: () => <svg data-testid="rotate-ccw" />,
  Rows3: () => <svg data-testid="rows3" />,
  Upload: () => <svg data-testid="upload" />,
  X: () => <svg data-testid="x" />,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUsage = {
  plan: 'free' as const,
  unifications: { current: 0, max: 1, remaining: 1 },
  limits: {
    maxInputFiles: 3,
    maxFileSize: 2 * 1024 * 1024,
    maxTotalSize: 5 * 1024 * 1024,
    maxRows: 500,
    maxColumns: 3,
  },
}

function createSmallFile(name = 'test.csv'): File {
  return new File(['col1,col2\nval1,val2'], name, { type: 'text/csv' })
}

function setupDefaultMocks() {
  ;(useUsage as jest.Mock).mockReturnValue({
    usage: mockUsage,
    isLoading: false,
    refetch: jest.fn(),
  })
  ;(canProcessClientSide as jest.Mock).mockReturnValue(true)
  ;(mergeSpreadsheets as jest.Mock).mockResolvedValue({
    blob: new Blob(['result']),
    filename: 'merged.xlsx',
    rowCount: 10,
  })
  ;(downloadBlob as jest.Mock).mockImplementation(() => {})
}

function mockPreviewFetch() {
  return jest.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = input.toString()
    if (url === '/api/preview') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          unificationToken: 'token-focus-test',
          columns: ['name', 'email'],
          usage: { current: 0, max: 1, remaining: 1 },
        }),
      } as unknown as Response)
    }
    if (url === '/api/unification/complete') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as unknown as Response)
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    } as unknown as Response)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UploadPageContent — focus management (Card 9.3)', () => {
  let fetchSpy: jest.SpyInstance
  let originalFetch: typeof fetch

  beforeAll(() => {
    originalFetch = global.fetch
    if (typeof global.fetch === 'undefined') {
      global.fetch = jest.fn()
    }
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    setupDefaultMocks()
  })

  afterEach(() => {
    if (fetchSpy) fetchSpy.mockRestore()
  })

  describe('h1 element attributes', () => {
    it('h1 has tabIndex={-1} (programmatically focusable, not in tab order)', async () => {
      fetchSpy = mockPreviewFetch()
      render(<UploadPageContent />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveAttribute('tabindex', '-1')
    })

    it('h1 has outline-none class (no default focus ring for mouse users)', async () => {
      fetchSpy = mockPreviewFetch()
      render(<UploadPageContent />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.className).toContain('outline-none')
    })
  })

  describe('main landmark', () => {
    it('<main> has id="main-content" (skip link target)', () => {
      fetchSpy = mockPreviewFetch()
      const { container } = render(<UploadPageContent />)

      const main = container.querySelector('main')
      expect(main).not.toBeNull()
      expect(main).toHaveAttribute('id', 'main-content')
    })
  })

  describe('initial mount (no focus)', () => {
    it('h1 does NOT have focus on initial render (isInitialMount guard)', async () => {
      fetchSpy = mockPreviewFetch()
      render(<UploadPageContent />)

      // Allow effects to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(document.activeElement).not.toBe(h1)
    })
  })

  describe('step transition focus', () => {
    it('h1 receives focus when step changes from upload to columns', async () => {
      fetchSpy = mockPreviewFetch()
      render(<UploadPageContent />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [createSmallFile()] },
        })
      })

      await act(async () => {
        fireEvent.click(screen.getByText('upload.continue'))
      })

      // Wait for columns step to appear (preview fetch completes)
      await waitFor(
        () => {
          expect(screen.queryByText('columns.processAndDownload')).toBeTruthy()
        },
        { timeout: 3000 },
      )

      // After step change, h1 must be focused
      await waitFor(
        () => {
          const h1 = screen.getByRole('heading', { level: 1 })
          expect(document.activeElement).toBe(h1)
        },
        { timeout: 1000 },
      )
    })
  })
})
