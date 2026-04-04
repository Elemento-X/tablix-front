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
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid extension'))
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
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Zip bomb detected'))
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

      // Select both columns manually
      act(() => {
        hook.result.current.handleSelectAll()
      })

      await act(async () => {
        await hook.result.current.handleProcess()
      })

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
        rowCount: 0,
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

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('upload.error'))
    })

    it('handles content validation with no error message', async () => {
      mockValidateFileContent.mockResolvedValue({ valid: false })
      const { result } = renderHook(() => useUploadFlow())

      await act(async () => {
        await result.current.handleFilesAccepted([createFile('test.csv')])
      })

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('upload.error'))
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
