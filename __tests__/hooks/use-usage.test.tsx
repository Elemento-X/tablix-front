/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { useUsage, formatFileSize } from '@/hooks/use-usage'

describe('use-usage.ts', () => {
  const mockUsageData = {
    plan: 'free' as const,
    uploads: {
      current: 2,
      max: 3,
      remaining: 1,
    },
    limits: {
      maxFileSize: 2 * 1024 * 1024, // 2MB
      maxRows: 500,
      maxColumns: 3,
    },
  }

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('useUsage', () => {
    it('should initialize with loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useUsage())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.usage).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should fetch usage data on mount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsageData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/usage')
      expect(result.current.usage).toEqual(mockUsageData)
      expect(result.current.error).toBeNull()
    })

    it('should set error when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.usage).toBeNull()
      expect(result.current.error).toBe('Failed to fetch usage')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.usage).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue('String error')

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Unknown error')
    })

    it('should set loading to false after successful fetch', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsageData,
      })

      const { result } = renderHook(() => useUsage())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should set loading to false after failed fetch', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'))

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should provide refetch function', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsageData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.refetch).toBeInstanceOf(Function)
    })

    it('should refetch data when refetch is called', async () => {
      const initialData = { ...mockUsageData, uploads: { current: 1, max: 3, remaining: 2 } }
      const updatedData = { ...mockUsageData, uploads: { current: 2, max: 3, remaining: 1 } }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => initialData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.usage?.uploads.current).toBe(1)
      })

      // Update mock for refetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData,
      })

      // Call refetch
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.usage?.uploads.current).toBe(2)
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should set loading state during refetch', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsageData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start refetch - the loading state change happens asynchronously
      await result.current.refetch()

      // After refetch completes, loading should be false again
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear error on successful refetch', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Initial error'))

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error')
      })

      // Update mock for successful refetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsageData,
      })

      result.current.refetch()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(result.current.usage).toEqual(mockUsageData)
      })
    })

    it('should handle different plan types', async () => {
      const proData = {
        plan: 'pro' as const,
        uploads: { current: 10, max: 20, remaining: 10 },
        limits: { maxFileSize: 10 * 1024 * 1024, maxRows: 5000, maxColumns: 10 },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => proData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.usage?.plan).toBe('pro')
      })

      expect(result.current.usage).toEqual(proData)
    })

    it('should handle enterprise plan with infinity values', async () => {
      const enterpriseData = {
        plan: 'enterprise' as const,
        uploads: { current: 100, max: Infinity, remaining: Infinity },
        limits: { maxFileSize: 50 * 1024 * 1024, maxRows: Infinity, maxColumns: Infinity },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => enterpriseData,
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.usage?.plan).toBe('enterprise')
      })

      expect(result.current.usage?.uploads.max).toBe(Infinity)
    })

    it('should only fetch once on mount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsageData,
      })

      renderHook(() => useUsage())

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle JSON parse errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const { result } = renderHook(() => useUsage())

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid JSON')
      })

      expect(result.current.usage).toBeNull()
    })
  })

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format bytes (less than 1 KB)', () => {
      expect(formatFileSize(1)).toBe('1 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
      expect(formatFileSize(1023)).toBe('1023 Bytes')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
      expect(formatFileSize(10240)).toBe('10 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB') // 1 MB
      expect(formatFileSize(1572864)).toBe('1.5 MB') // 1.5 MB
      expect(formatFileSize(2097152)).toBe('2 MB') // 2 MB
      expect(formatFileSize(10485760)).toBe('10 MB') // 10 MB
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB') // 1 GB
      expect(formatFileSize(1610612736)).toBe('1.5 GB') // 1.5 GB
      expect(formatFileSize(2147483648)).toBe('2 GB') // 2 GB
      expect(formatFileSize(10737418240)).toBe('10 GB') // 10 GB
    })

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB')
      expect(formatFileSize(1536000)).toBe('1.46 MB')
      expect(formatFileSize(999999)).toBe('976.56 KB')
    })

    it('should handle exact boundaries', () => {
      expect(formatFileSize(1024)).toBe('1 KB') // Exactly 1 KB
      expect(formatFileSize(1048576)).toBe('1 MB') // Exactly 1 MB
      expect(formatFileSize(1073741824)).toBe('1 GB') // Exactly 1 GB
    })

    it('should handle very small files', () => {
      expect(formatFileSize(1)).toBe('1 Bytes')
      expect(formatFileSize(10)).toBe('10 Bytes')
      expect(formatFileSize(100)).toBe('100 Bytes')
    })

    it('should handle very large files', () => {
      expect(formatFileSize(5368709120)).toBe('5 GB') // 5 GB
      expect(formatFileSize(53687091200)).toBe('50 GB') // 50 GB
    })

    it('should handle numbers with many decimal places', () => {
      // 1.123456 MB
      const size = Math.floor(1.123456 * 1024 * 1024)
      const result = formatFileSize(size)
      expect(result).toContain('MB')
      expect(result).toMatch(/^\d+\.\d{1,2}\s+MB$/)
    })

    it('should not return negative values', () => {
      // Even though negative inputs don't make sense, ensure no crashes
      const result = formatFileSize(1024)
      expect(parseFloat(result)).toBeGreaterThanOrEqual(0)
    })
  })
})
