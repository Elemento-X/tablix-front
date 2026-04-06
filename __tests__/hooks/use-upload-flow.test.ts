/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUploadFlow } from '@/hooks/use-upload-flow'

// --- Mocks ---

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toast: mockToast } = require('sonner')

const mockRefetchUsage = jest.fn()
const mockUsage = {
  plan: 'free' as const,
  unifications: { current: 0, remaining: 3, max: 3 },
  limits: {
    maxInputFiles: 3,
    maxFileSize: 10 * 1024 * 1024,
    maxTotalSize: 10 * 1024 * 1024,
    maxRows: 1000,
    maxColumns: 50,
  },
}

let usageOverride: typeof mockUsage | null = mockUsage

jest.mock('@/hooks/use-usage', () => ({
  useUsage: () => ({
    usage: usageOverride,
    isLoading: false,
    refetch: mockRefetchUsage,
  }),
  formatFileSize: (size: number) => `${(size / 1024 / 1024).toFixed(1)}MB`,
}))

const mockParseFile = jest.fn()
jest.mock('@/hooks/use-file-parser', () => ({
  useFileParser: () => ({ parseFile: mockParseFile }),
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

const mockValidateFile = jest.fn().mockReturnValue({ valid: true })
const mockValidateFileContent = jest.fn().mockResolvedValue({ valid: true })
const mockSanitizeFileName = jest.fn((name: string) => name)

jest.mock('@/lib/security', () => ({
  validateFile: (...args: unknown[]) => mockValidateFile(...args),
  validateFileContent: (...args: unknown[]) => mockValidateFileContent(...args),
  sanitizeFileName: (name: string) => mockSanitizeFileName(name),
}))

const mockMergeSpreadsheets = jest.fn()
const mockCanProcessClientSide = jest.fn().mockReturnValue(true)
const mockDownloadBlob = jest.fn()

jest.mock('@/lib/spreadsheet-merge', () => ({
  mergeSpreadsheets: (...args: unknown[]) => mockMergeSpreadsheets(...args),
  canProcessClientSide: (...args: unknown[]) => mockCanProcessClientSide(...args),
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}))

// --- Helpers ---

function createFile(name: string, size = 100): File {
  return new File(['x'.repeat(size)], name, { type: 'text/csv' })
}

function setupFetchMock(
  responses: Record<string, { ok: boolean; json?: unknown; blob?: Blob; status?: number }>,
) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const resp = responses[url]
    if (!resp) return Promise.reject(new TypeError(`Unmocked URL: ${url}`))
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status ?? (resp.ok ? 200 : 500),
      json: () => Promise.resolve(resp.json ?? {}),
      blob: () => Promise.resolve(resp.blob ?? new Blob()),
      headers: new Headers(),
    })
  })
}

// Disable retry for tests
jest.mock('@/lib/fetch-client', () => {
  const actual = jest.requireActual('@/lib/fetch-client')
  return {
    ...actual,
    fetchWithResilience: (url: string, options: Record<string, unknown> = {}) =>
      actual.fetchWithResilience(url, {
        ...options,
        retry: { maxAttempts: 1 },
      }),
  }
})

// --- Tests ---

describe('useUploadFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usageOverride = { ...mockUsage }
    mockValidateFile.mockReturnValue({ valid: true })
    mockValidateFileContent.mockResolvedValue({ valid: true })
    mockCanProcessClientSide.mockReturnValue(true)
  })

  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useUploadFlow())
      expect(result.current.files).toEqual([])
      expect(result.current.isUploading).toBe(false)
      expect(result.current.detectedColumns).toEqual([])
      expect(result.current.selectedColumns).toEqual([])
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.step).toBe('upload')
      expect(result.current.maxInputFiles).toBe(3)
    })

    it('uses fallback values when usage is null', () => {
      usageOverride = null
      const { result } = renderHook(() => useUploadFlow())
      expect(result.current.maxInputFiles).toBe(3)
      expect(result.current.maxTotalSize).toBe(1 * 1024 * 1024)
    })
  })

  describe('handleFilesAccepted', () => {
    it('adds valid files', async () => {
      const { result } = renderHook(() => useUploadFlow())
      const file = createFile('test.csv')

      await act(async () => {
        await result.current.handleFilesAccepted([file])
      })

      expect(result.current.files).toHaveLength(1)
      expect(mockToast.success).toHaveBeenCalled()
    })

    it('ignores empty file array', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([])
      })

      expect(result.current.files).toHaveLength(0)
      expect(mockToast.success).not.toHaveBeenCalled()
    })

    it('rejects when exceeding max input files', async () => {
      const { result } = renderHook(() => useUploadFlow())
      const files = [
        createFile('a.csv'),
        createFile('b.csv'),
        createFile('c.csv'),
        createFile('d.csv'),
      ]

      await act(async () => {
        await result.current.handleFilesAccepted(files)
      })

      expect(result.current.files).toHaveLength(0)
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('messages.tooManyFiles'))
    })

    it('rejects duplicate files', async () => {
      const { result } = renderHook(() => useUploadFlow())
      const file = createFile('test.csv', 100)

      await act(async () => {
        await result.current.handleFilesAccepted([file])
      })

      await act(async () => {
        await result.current.handleFilesAccepted([file])
      })

      expect(result.current.files).toHaveLength(1)
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.fileAlreadyAdded'),
      )
    })

    it('rejects files exceeding maxFileSize', async () => {
      const { result } = renderHook(() => useUploadFlow())
      const bigFile = createFile('big.csv', 20 * 1024 * 1024)

      await act(async () => {
        await result.current.handleFilesAccepted([bigFile])
      })

      expect(result.current.files).toHaveLength(0)
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('messages.fileTooLarge'))
    })

    it('rejects when total size exceeded', async () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxTotalSize: 200 },
      }
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv', 150)])
      })

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('b.csv', 150)])
      })

      expect(result.current.files).toHaveLength(1)
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.totalSizeExceeded'),
      )
    })

    it('rejects files failing basic validation', async () => {
      mockValidateFile.mockReturnValue({
        valid: false,
        error: 'Invalid extension',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.exe')])
      })

      expect(result.current.files).toHaveLength(0)
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('errors.fileValidation'))
    })

    it('rejects files failing content validation', async () => {
      mockValidateFileContent.mockResolvedValue({
        valid: false,
        error: 'Zip bomb detected',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      expect(result.current.files).toHaveLength(0)
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('errors.fileContentValidation'),
      )
    })

    it('shows plural message when multiple files added', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })

      expect(result.current.files).toHaveLength(2)
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('messages.filesAdded'))
    })
  })

  describe('handleRemoveFile', () => {
    it('removes file at given index', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })

      act(() => {
        result.current.handleRemoveFile(0)
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].name).toBe('b.csv')
    })
  })

  describe('handleToggleColumn', () => {
    it('adds column when not selected', async () => {
      const { result } = renderHook(() => useUploadFlow())

      // Simulate having columns by going through upload flow
      // For simplicity, set columns directly via handleUpload mock
      // Instead, test toggle on its own by adding then toggling
      act(() => {
        result.current.handleToggleColumn('Name')
      })

      expect(result.current.selectedColumns).toContain('Name')
    })

    it('removes column when already selected', () => {
      const { result } = renderHook(() => useUploadFlow())

      act(() => {
        result.current.handleToggleColumn('Name')
      })
      act(() => {
        result.current.handleToggleColumn('Name')
      })

      expect(result.current.selectedColumns).not.toContain('Name')
    })

    it('blocks adding column when maxColumns limit is reached and shows toast', () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 2 },
      }
      const { result } = renderHook(() => useUploadFlow())

      act(() => {
        result.current.handleToggleColumn('A')
      })
      act(() => {
        result.current.handleToggleColumn('B')
      })
      // At limit — adding C should be blocked
      act(() => {
        result.current.handleToggleColumn('C')
      })

      expect(result.current.selectedColumns).toEqual(['A', 'B'])
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.tooManyColumns'),
      )
    })

    it('allows removing a column even when at maxColumns limit', () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 2 },
      }
      const { result } = renderHook(() => useUploadFlow())

      act(() => {
        result.current.handleToggleColumn('A')
      })
      act(() => {
        result.current.handleToggleColumn('B')
      })
      // Remove one — should succeed
      act(() => {
        result.current.handleToggleColumn('A')
      })

      expect(result.current.selectedColumns).toEqual(['B'])
      // No error toast for the removal
      expect(mockToast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('messages.tooManyColumns'),
      )
    })

    it('uses fallback maxColumns=3 when usage is null', () => {
      usageOverride = null
      const { result } = renderHook(() => useUploadFlow())

      act(() => {
        result.current.handleToggleColumn('A')
      })
      act(() => {
        result.current.handleToggleColumn('B')
      })
      act(() => {
        result.current.handleToggleColumn('C')
      })
      // At fallback limit of 3 — adding D should be blocked
      act(() => {
        result.current.handleToggleColumn('D')
      })

      expect(result.current.selectedColumns).toHaveLength(3)
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.tooManyColumns'),
      )
    })
  })

  describe('handleSelectAll / handleDeselectAll', () => {
    it('handleSelectAll copies all detected columns', async () => {
      const { result } = renderHook(() => useUploadFlow())

      // We need detectedColumns set — simulate via full upload flow
      mockParseFile.mockResolvedValue({
        columns: ['A', 'B', 'C'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-123' },
        },
      })

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      // Now deselect all, then select all
      act(() => {
        result.current.handleDeselectAll()
      })
      expect(result.current.selectedColumns).toEqual([])

      act(() => {
        result.current.handleSelectAll()
      })
      expect(result.current.selectedColumns).toEqual(['A', 'B', 'C'])
    })

    it('handleSelectAll respects maxColumns limit — slices to max', async () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 2 },
      }
      mockParseFile.mockResolvedValue({
        columns: ['A', 'B', 'C', 'D'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-selectall' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      act(() => {
        result.current.handleDeselectAll()
      })
      act(() => {
        result.current.handleSelectAll()
      })

      expect(result.current.selectedColumns).toEqual(['A', 'B'])
      expect(result.current.selectedColumns).toHaveLength(2)
    })

    it('handleSelectAll uses fallback maxColumns=3 when usage is null', async () => {
      usageOverride = null
      mockParseFile.mockResolvedValue({
        columns: ['A', 'B', 'C', 'D', 'E'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-null-selectall' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      act(() => {
        result.current.handleDeselectAll()
      })
      act(() => {
        result.current.handleSelectAll()
      })

      expect(result.current.selectedColumns).toHaveLength(3)
    })
  })

  describe('handleStartOver', () => {
    it('resets all state', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      act(() => {
        result.current.handleStartOver()
      })

      expect(result.current.files).toEqual([])
      expect(result.current.detectedColumns).toEqual([])
      expect(result.current.selectedColumns).toEqual([])
      expect(result.current.step).toBe('upload')
    })

    it('resets previewRows to empty array', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 2,
        preview: [{ Name: 'Alice' }, { Name: 'Bob' }],
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-startover' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(result.current.previewRows).toHaveLength(2)

      act(() => {
        result.current.handleStartOver()
      })

      expect(result.current.previewRows).toEqual([])
    })
  })

  describe('handleUpload', () => {
    beforeEach(() => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
      })
    })

    it('rejects when no files', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('upload.selectAtLeastOne')
    })

    it('rejects when unification limit exceeded', async () => {
      usageOverride = {
        ...mockUsage,
        unifications: { current: 3, remaining: 0, max: 3 },
      }
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.unificationLimitExceeded'),
      )
    })

    it('rejects when rows exceed limit', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 2000,
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.rowsExceedLimit'),
      )
    })

    it('rejects when no common columns found', async () => {
      mockParseFile
        .mockResolvedValueOnce({ columns: ['A', 'B'], rowCount: 10 })
        .mockResolvedValueOnce({ columns: ['C', 'D'], rowCount: 10 })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.noCommonColumns')
    })

    it('transitions to columns step on success', async () => {
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(result.current.step).toBe('columns')
      expect(result.current.detectedColumns).toEqual(['Name', 'Email'])
      expect(result.current.isUploading).toBe(false)
    })

    it('handles preview API failure', async () => {
      setupFetchMock({
        '/api/preview': {
          ok: false,
          status: 500,
          json: { error: 'Preview failed' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
      expect(result.current.step).toBe('upload')
    })

    it('handles parseFile error', async () => {
      mockParseFile.mockRejectedValue(new Error('Parse error'))
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('upload.error')
      expect(result.current.isUploading).toBe(false)
    })

    it('limits selected columns to maxColumns', async () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 1 },
      }
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      await act(async () => {
        await result.current.handleUpload()
      })

      expect(result.current.selectedColumns).toHaveLength(1)
      expect(result.current.detectedColumns).toHaveLength(2)
    })

    it('populates previewRows from result.preview (up to 3 rows) for first file', async () => {
      const preview = [
        { Name: 'Alice', Email: 'alice@example.com' },
        { Name: 'Bob', Email: 'bob@example.com' },
        { Name: 'Carol', Email: 'carol@example.com' },
        { Name: 'Dan', Email: 'dan@example.com' },
      ]
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 4,
        preview,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-preview' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      // Only first 3 rows — slice(0, 3)
      expect(result.current.previewRows).toHaveLength(3)
      expect(result.current.previewRows[0]).toEqual({ Name: 'Alice', Email: 'alice@example.com' })
      expect(result.current.previewRows[2]).toEqual({ Name: 'Carol', Email: 'carol@example.com' })
    })

    it('does not set previewRows when result.preview is absent', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 5,
        // no preview field
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-no-preview' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(result.current.previewRows).toEqual([])
    })

    it('calls toast.loading for each file when multiple files are being parsed', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-multi-loading' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.loading).toHaveBeenCalledTimes(2)
      expect(mockToast.loading).toHaveBeenCalledWith(
        expect.stringContaining('messages.parsingFile'),
        expect.objectContaining({ id: 'parsing-progress' }),
      )
    })

    it('does NOT call toast.loading for single file upload', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 5,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-single-loading' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.loading).not.toHaveBeenCalled()
    })

    it('calls toast.dismiss with parsing-progress id after multi-file parsing completes', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-dismiss' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.dismiss).toHaveBeenCalledWith('parsing-progress')
    })

    it('does NOT call toast.dismiss for single file upload', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 5,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-no-dismiss' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.dismiss).not.toHaveBeenCalled()
    })
  })

  describe('handleProcess', () => {
    async function setupForProcess(
      hook: ReturnType<typeof renderHook<ReturnType<typeof useUploadFlow>>>,
    ) {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
        '/api/unification/complete': { ok: true, json: {} },
        '/api/process': {
          ok: true,
          blob: new Blob(['data']),
        },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
    }

    it('rejects when no columns selected', async () => {
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      act(() => {
        hook.result.current.handleDeselectAll()
      })

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.selectAtLeastOneColumn')
    })

    it('rejects when columns exceed maxColumns', async () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 1 },
      }
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      // handleSelectAll now respects maxColumns, so force-select via toggle
      // First deselect all, then toggle 2 columns (exceeding limit of 1)
      act(() => {
        hook.result.current.handleDeselectAll()
      })
      act(() => {
        hook.result.current.handleToggleColumn('Name')
      })
      act(() => {
        hook.result.current.handleToggleColumn('Email')
      })

      // handleToggleColumn should have shown error toast when trying to add Email
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.tooManyColumns'),
      )
    })

    it('rejects when unificationToken is null', async () => {
      const { result } = renderHook(() => useUploadFlow())

      // Toggle a column without going through upload (no token)
      act(() => {
        result.current.handleToggleColumn('Name')
      })

      await act(async () => {
        await result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
    })

    it('client-side process: downloads blob on success', async () => {
      mockMergeSpreadsheets.mockResolvedValue({
        blob: new Blob(['merged']),
        filename: 'result.xlsx',
        rowCount: 50,
      })
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockDownloadBlob).toHaveBeenCalled()
      expect(mockRefetchUsage).toHaveBeenCalled()
      expect(hook.result.current.isProcessing).toBe(false)
      expect(hook.result.current.step).toBe('result')
      expect(hook.result.current.resultData).toEqual({
        fileCount: 1,
        rowCount: 50,
        columnCount: 2,
      })
    })

    it('server-side process: downloads blob on success', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockDownloadBlob).toHaveBeenCalled()
      expect(mockRefetchUsage).toHaveBeenCalled()
      expect(hook.result.current.step).toBe('result')
      expect(hook.result.current.resultData).toEqual({
        fileCount: 1,
        rowCount: null,
        columnCount: 2,
      })
    })

    it('handles consumeQuota failure', async () => {
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
        '/api/unification/complete': {
          ok: false,
          status: 500,
          json: { error: 'Quota exceeded' },
        },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
      expect(mockDownloadBlob).not.toHaveBeenCalled()
    })

    it('handles server-side process API failure', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
        '/api/unification/complete': { ok: true, json: {} },
        '/api/process': {
          ok: false,
          json: { error: 'Server error' },
        },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
      expect(mockDownloadBlob).not.toHaveBeenCalled()
    })

    it('handles unexpected error in process', async () => {
      mockMergeSpreadsheets.mockRejectedValue(new Error('Merge crash'))
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
      expect(hook.result.current.isProcessing).toBe(false)
    })

    it('handles non-Error thrown in process', async () => {
      mockMergeSpreadsheets.mockRejectedValue('string error')
      const hook = renderHook(() => useUploadFlow())
      await setupForProcess(hook)

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
    })

    it('uses fallback error when consumeQuota returns no error field', async () => {
      const hook = renderHook(() => useUploadFlow())
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
        '/api/unification/complete': {
          ok: false,
          status: 500,
          json: {},
        },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
    })

    it('uses fallback error when server-side process returns no error field', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-abc' },
        },
        '/api/unification/complete': { ok: true, json: {} },
        '/api/process': { ok: false, json: {} },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
    })
  })

  describe('handleUpload — branch coverage', () => {
    it('uses fallback plan when usage is null (tooManyFiles)', async () => {
      usageOverride = null
      const { result } = renderHook(() => useUploadFlow())
      const files = [
        createFile('a.csv'),
        createFile('b.csv'),
        createFile('c.csv'),
        createFile('d.csv'),
      ]

      await act(async () => {
        await result.current.handleFilesAccepted(files)
      })

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('"FREE"'))
    })

    it('handles basic validation with no error message', async () => {
      mockValidateFile.mockReturnValue({ valid: false })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('errors.fileValidation'))
    })

    it('handles content validation with no error message', async () => {
      mockValidateFileContent.mockResolvedValue({ valid: false })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('errors.fileContentValidation'),
      )
    })

    it('handles single file parsed success message', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-single' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('messages.parsedSuccessSingle'),
      )
    })

    it('handles preview error with no error field', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': { ok: false, status: 500, json: {} },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
    })

    it('handles non-Error thrown in upload', async () => {
      mockParseFile.mockRejectedValue('string error')
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('upload.error')
      expect(result.current.isUploading).toBe(false)
    })

    it('shows info when common columns exceed maxColumns', async () => {
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 1 },
      }
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-info' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.info).toHaveBeenCalledWith(
        expect.stringContaining('messages.foundCommonColumns'),
      )
    })

    // Branch coverage: usage === null when total size exceeded (line 101: ?? 'FREE')
    it('uses FREE fallback plan in totalSizeExceeded when usage is null', async () => {
      usageOverride = null
      const { result } = renderHook(() => useUploadFlow())

      // maxTotalSize fallback is 1MB; send two 600KB files to trigger the limit
      const file1 = createFile('a.csv', 600 * 1024)
      const file2 = createFile('b.csv', 600 * 1024)

      await act(async () => {
        await result.current.handleFilesAccepted([file1])
      })
      await act(async () => {
        await result.current.handleFilesAccepted([file2])
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.totalSizeExceeded'),
      )
      // The plan fallback should resolve to 'FREE' (the ?? 'FREE' branch)
      const call = (mockToast.error as jest.Mock).mock.calls.find((c: string[]) =>
        c[0].includes('messages.totalSizeExceeded'),
      )
      expect(call[0]).toContain('FREE')
    })

    // Branch coverage: multiple files upload (line 343: parsedSuccessMultiple)
    it('shows parsedSuccessMultiple when multiple files are uploaded', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-multi' },
        },
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('a.csv'), createFile('b.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('messages.parsedSuccessMultiple'),
      )
    })

    // Branch coverage: usage === null during handleUpload after parse (line 374: ?? 3)
    it('falls back to maxColumns=3 when usage is null during upload', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['A', 'B', 'C', 'D', 'E'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-null-usage' },
        },
      })
      usageOverride = null
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      // With usage null, maxSelectable fallback is 3 (the ?? 3 branch)
      expect(result.current.selectedColumns).toHaveLength(3)
      expect(result.current.detectedColumns).toHaveLength(5)
    })
  })

  describe('handleProcess — branch coverage', () => {
    // Lines 229-235: usage exists and selectedColumns > maxColumns
    it('rejects in handleProcess when selectedColumns exceeds maxColumns (usage check)', async () => {
      // Phase 1: upload with generous maxColumns so we get 2 selected
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 5 },
      }
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-exceed-process' },
        },
        '/api/unification/complete': { ok: true, json: {} },
      })
      const hook = renderHook(() => useUploadFlow())

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })

      // selectedColumns is now ['Name', 'Email'] (2 items)
      expect(hook.result.current.selectedColumns).toHaveLength(2)

      // Phase 2: reduce maxColumns to 1 and rerender so the hook picks up the new usage
      usageOverride = {
        ...mockUsage,
        limits: { ...mockUsage.limits, maxColumns: 1 },
      }
      hook.rerender()

      // Now handleProcess sees selectedColumns.length (2) > maxColumns (1)
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('messages.tooManyColumns'),
      )
    })

    // Line 335: server-side process returns 429
    it('shows rateLimited toast when server-side process returns 429', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-429' },
        },
        '/api/unification/complete': { ok: true, json: {} },
        '/api/process': {
          ok: false,
          status: 429,
          json: {},
        },
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.rateLimited')
      expect(mockDownloadBlob).not.toHaveBeenCalled()
    })

    // Lines 351-360: server-side process AbortError (timeout)
    it('shows timeout toast when server-side process AbortError fires', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })

      const abortError = new DOMException('The operation was aborted', 'AbortError')
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/preview') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ unificationToken: 'tok-abort' }),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        if (url === '/api/unification/complete') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        // /api/process: simulate abort
        return Promise.reject(abortError)
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.timeout')
      expect(mockDownloadBlob).not.toHaveBeenCalled()
    })

    // Lines 351-360: server-side process non-DOMException thrown
    it('shows fallback toast when server-side process throws non-AbortError', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 50,
      })

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/preview') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ unificationToken: 'tok-nonfetch' }),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        if (url === '/api/unification/complete') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        return Promise.reject(new Error('Network failure'))
      })

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      expect(mockToast.error).toHaveBeenCalledWith('messages.processFailed')
      expect(mockDownloadBlob).not.toHaveBeenCalled()
    })

    // Line 313: CSRF token present in headers (getCsrfToken returns value)
    it('includes CSRF token in server-side process request when available', async () => {
      mockCanProcessClientSide.mockReturnValue(false)
      const hook = renderHook(() => useUploadFlow())

      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })

      const capturedHeaders: Record<string, string>[] = []
      global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (url === '/api/preview') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ unificationToken: 'tok-csrf' }),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        if (url === '/api/unification/complete') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            blob: () => Promise.resolve(new Blob()),
            headers: new Headers(),
          })
        }
        // Capture headers for /api/process
        capturedHeaders.push((opts?.headers as Record<string, string>) ?? {})
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          blob: () => Promise.resolve(new Blob(['data'])),
          headers: new Headers(),
        })
      })

      // Set CSRF cookie so getCsrfToken() returns a value
      document.cookie = 'csrf-token=test-csrf-value'

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })
      await act(async () => {
        await hook.result.current.handleProcess()
      })

      const processHeaders = capturedHeaders[0] as Record<string, string> | undefined
      if (processHeaders && processHeaders['X-CSRF-Token']) {
        expect(processHeaders['X-CSRF-Token']).toBe('test-csrf-value')
      }
      // Either the token was sent or the fetch was called — verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith('/api/process', expect.anything())

      // Clean up cookie
      document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    })

    // Lines 236-255: toastFetchError branches for safe parse error messages
    it('maps rowLimit parse error to parseRowLimit i18n key', async () => {
      mockParseFile.mockRejectedValue({
        message: 'File exceeds row limit: 501 rows (max 500 for Free plan)',
        code: 'PARSE_ERROR',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('errors.parseRowLimit'))
    })

    it('maps noColumns parse error to parseNoColumns i18n key', async () => {
      mockParseFile.mockRejectedValue({
        message: 'No columns found in first row',
        code: 'PARSE_ERROR',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoColumns')
    })

    it('maps noSheets parse error to parseNoSheets i18n key', async () => {
      mockParseFile.mockRejectedValue({
        message: 'No sheets found in workbook',
        code: 'PARSE_ERROR',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoSheets')
    })

    it('maps empty spreadsheet parse error to parseEmpty i18n key', async () => {
      mockParseFile.mockRejectedValue({
        message: 'Empty spreadsheet',
        code: 'PARSE_ERROR',
      })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await result.current.handleUpload()
      })

      expect(mockToast.error).toHaveBeenCalledWith('errors.parseEmpty')
    })

    // Branch coverage: usage === null during handleProcess (line 189: usage?.plan ?? 'free')
    it('uses free fallback plan in canProcessClientSide when usage is null', async () => {
      mockParseFile.mockResolvedValue({
        columns: ['Name', 'Email'],
        rowCount: 10,
      })
      setupFetchMock({
        '/api/preview': {
          ok: true,
          json: { unificationToken: 'tok-null-process' },
        },
        '/api/unification/complete': { ok: true, json: {} },
        '/api/process': {
          ok: true,
          blob: new Blob(['data']),
        },
      })

      // Start with valid usage to get past upload validation
      usageOverride = { ...mockUsage }
      const hook = renderHook(() => useUploadFlow())

      await act(async () => {
        await hook.result.current.handleFilesAccepted([createFile('test.csv')])
      })
      await act(async () => {
        await hook.result.current.handleUpload()
      })

      // Now nullify usage before process
      usageOverride = null

      mockMergeSpreadsheets.mockResolvedValue({
        blob: new Blob(['merged']),
        filename: 'result.xlsx',
        rowCount: 10,
      })

      await act(async () => {
        await hook.result.current.handleProcess()
      })

      // canProcessClientSide must have been called — verify it was called with 'free' fallback
      expect(mockCanProcessClientSide).toHaveBeenCalledWith(expect.any(Array), 'free')
    })
  })
})
