/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { useUsage, formatFileSize, type UsageInfo } from '@/hooks/use-usage'

// Mock fetch — fetchWithResilience calls global.fetch internally
global.fetch = jest.fn()

// Disable retry for tests (1 attempt = no retry)
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

describe('use-usage.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useUsage hook', () => {
    const mockUsageData: UsageInfo = {
      plan: 'free',
      unifications: {
        current: 0,
        max: 1,
        remaining: 1,
      },
      limits: {
        maxInputFiles: 3,
        maxFileSize: 1048576,
        maxTotalSize: 1048576,
        maxRows: 500,
        maxColumns: 3,
      },
    }

    describe('initial fetch', () => {
      it('should fetch usage data on mount', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUsageData),
        })

        const { result } = renderHook(() => useUsage())

        // Initial loading state
        expect(result.current.isLoading).toBe(true)
        expect(result.current.usage).toBeNull()
        expect(result.current.error).toBeNull()

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        // After fetch completes
        expect(result.current.usage).toEqual(mockUsageData)
        expect(result.current.error).toBeNull()
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/usage',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })

      it('should handle fetch error', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
        })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage).toBeNull()
        expect(result.current.error).toBe('Server error (500)')
        expect(result.current.errorType).toBe('server')
      })

      it('should handle network error', async () => {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'))

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage).toBeNull()
        expect(result.current.error).toBe('Network request failed')
        expect(result.current.errorType).toBe('offline')
      })

      it('should handle non-Error thrown', async () => {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce('Unknown error')

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.error).toBe('Unknown error')
        expect(result.current.errorType).toBe('unknown')
      })
    })

    describe('refetch functionality', () => {
      it('should refetch usage data when refetch is called', async () => {
        const initialData: UsageInfo = { ...mockUsageData }
        const updatedData: UsageInfo = {
          ...mockUsageData,
          unifications: { current: 1, max: 1, remaining: 0 },
        }

        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(initialData),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(updatedData),
          })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage?.unifications.current).toBe(0)

        // Trigger refetch
        await act(async () => {
          await result.current.refetch()
        })

        expect(result.current.usage?.unifications.current).toBe(1)
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      it('should set loading state during refetch', async () => {
        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockUsageData),
          })
          .mockImplementationOnce(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () =>
                    resolve({
                      ok: true,
                      json: () => Promise.resolve(mockUsageData),
                    }),
                  100,
                ),
              ),
          )

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        // Start refetch
        act(() => {
          result.current.refetch()
        })

        // Should be loading during refetch
        expect(result.current.isLoading).toBe(true)

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })
      })

      it('should clear error on successful refetch', async () => {
        ;(global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            headers: new Headers(),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockUsageData),
          })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.error).toBe('Server error (500)')

        // Successful refetch
        await act(async () => {
          await result.current.refetch()
        })

        expect(result.current.error).toBeNull()
        expect(result.current.usage).toEqual(mockUsageData)
      })
    })

    describe('different plan types', () => {
      it('should handle Free plan data', async () => {
        const freePlanData: UsageInfo = {
          plan: 'free',
          unifications: { current: 0, max: 1, remaining: 1 },
          limits: {
            maxInputFiles: 3,
            maxFileSize: 1048576,
            maxTotalSize: 1048576,
            maxRows: 500,
            maxColumns: 3,
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(freePlanData),
        })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage?.plan).toBe('free')
        expect(result.current.usage?.limits.maxInputFiles).toBe(3)
      })

      it('should handle Pro plan data', async () => {
        const proPlanData: UsageInfo = {
          plan: 'pro',
          unifications: { current: 5, max: 40, remaining: 35 },
          limits: {
            maxInputFiles: 15,
            maxFileSize: 2097152,
            maxTotalSize: 31457280,
            maxRows: 5000,
            maxColumns: 10,
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(proPlanData),
        })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage?.plan).toBe('pro')
        expect(result.current.usage?.limits.maxInputFiles).toBe(15)
      })

      it('should handle Enterprise plan data', async () => {
        const enterprisePlanData: UsageInfo = {
          plan: 'enterprise',
          unifications: { current: 100, max: Infinity, remaining: Infinity },
          limits: {
            maxInputFiles: Infinity,
            maxFileSize: 52428800,
            maxTotalSize: Infinity,
            maxRows: Infinity,
            maxColumns: Infinity,
          },
        }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(enterprisePlanData),
        })

        const { result } = renderHook(() => useUsage())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.usage?.plan).toBe('enterprise')
      })
    })
  })

  describe('formatFileSize utility', () => {
    describe('bytes', () => {
      it('should format 0 bytes', () => {
        expect(formatFileSize(0)).toBe('0 Bytes')
      })

      it('should format small byte values', () => {
        expect(formatFileSize(1)).toBe('1 Bytes')
        expect(formatFileSize(100)).toBe('100 Bytes')
        expect(formatFileSize(500)).toBe('500 Bytes')
        expect(formatFileSize(1023)).toBe('1023 Bytes')
      })
    })

    describe('kilobytes', () => {
      it('should format kilobytes', () => {
        expect(formatFileSize(1024)).toBe('1 KB')
        expect(formatFileSize(2048)).toBe('2 KB')
        expect(formatFileSize(1536)).toBe('1.5 KB')
      })

      it('should round to 2 decimal places', () => {
        expect(formatFileSize(1234)).toBe('1.21 KB')
        expect(formatFileSize(5678)).toBe('5.54 KB')
      })
    })

    describe('megabytes', () => {
      it('should format megabytes', () => {
        expect(formatFileSize(1048576)).toBe('1 MB')
        expect(formatFileSize(2097152)).toBe('2 MB')
        expect(formatFileSize(10485760)).toBe('10 MB')
      })

      it('should handle fractional megabytes', () => {
        expect(formatFileSize(1572864)).toBe('1.5 MB')
        expect(formatFileSize(3145728)).toBe('3 MB')
      })
    })

    describe('gigabytes', () => {
      it('should format gigabytes', () => {
        expect(formatFileSize(1073741824)).toBe('1 GB')
        expect(formatFileSize(2147483648)).toBe('2 GB')
      })

      it('should handle fractional gigabytes', () => {
        expect(formatFileSize(1610612736)).toBe('1.5 GB')
      })
    })

    describe('edge cases', () => {
      it('should handle exact boundary values', () => {
        expect(formatFileSize(1024)).toBe('1 KB')
        expect(formatFileSize(1048576)).toBe('1 MB')
        expect(formatFileSize(1073741824)).toBe('1 GB')
      })

      it('should handle large values', () => {
        expect(formatFileSize(5368709120)).toBe('5 GB')
      })

      it('should handle decimal precision correctly', () => {
        // 1.234 MB
        expect(formatFileSize(1294139)).toBe('1.23 MB')
      })
    })
  })
})
