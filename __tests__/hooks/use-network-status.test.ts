/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '@/hooks/use-network-status'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    writable: true,
    value,
  })
}

function dispatchNetworkEvent(type: 'online' | 'offline') {
  window.dispatchEvent(new Event(type))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset to online by default before each test
    setOnline(true)
  })

  // ── Initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns isOnline=true when navigator.onLine is true', () => {
      setOnline(true)
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current.isOnline).toBe(true)
    })

    it('returns isOnline=false when navigator.onLine is false', () => {
      setOnline(false)
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current.isOnline).toBe(false)
    })
  })

  // ── Event-driven updates ────────────────────────────────────────────────────

  describe('event-driven updates', () => {
    it('updates isOnline to false when "offline" event fires', () => {
      setOnline(true)
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(true)

      act(() => {
        dispatchNetworkEvent('offline')
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('updates isOnline to true when "online" event fires', () => {
      setOnline(false)
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(false)

      act(() => {
        dispatchNetworkEvent('online')
      })

      expect(result.current.isOnline).toBe(true)
    })

    it('reflects consecutive offline → online transitions', () => {
      setOnline(true)
      const { result } = renderHook(() => useNetworkStatus())

      act(() => {
        dispatchNetworkEvent('offline')
      })
      expect(result.current.isOnline).toBe(false)

      act(() => {
        dispatchNetworkEvent('online')
      })
      expect(result.current.isOnline).toBe(true)
    })

    it('handles multiple offline events gracefully (stays false)', () => {
      setOnline(true)
      const { result } = renderHook(() => useNetworkStatus())

      act(() => {
        dispatchNetworkEvent('offline')
      })
      act(() => {
        dispatchNetworkEvent('offline')
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('handles multiple online events gracefully (stays true)', () => {
      setOnline(false)
      const { result } = renderHook(() => useNetworkStatus())

      act(() => {
        dispatchNetworkEvent('online')
      })
      act(() => {
        dispatchNetworkEvent('online')
      })

      expect(result.current.isOnline).toBe(true)
    })
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('removes "online" listener on unmount — no state update after unmount', () => {
      setOnline(false)
      const { result, unmount } = renderHook(() => useNetworkStatus())

      unmount()

      // Dispatching after unmount must not cause state update (no error thrown)
      expect(() => {
        act(() => {
          dispatchNetworkEvent('online')
        })
      }).not.toThrow()

      // State remains as it was at unmount time
      expect(result.current.isOnline).toBe(false)
    })

    it('removes "offline" listener on unmount — no state update after unmount', () => {
      setOnline(true)
      const { result, unmount } = renderHook(() => useNetworkStatus())

      unmount()

      expect(() => {
        act(() => {
          dispatchNetworkEvent('offline')
        })
      }).not.toThrow()

      expect(result.current.isOnline).toBe(true)
    })

    it('uses removeEventListener to clean up listeners', () => {
      const addSpy = jest.spyOn(window, 'addEventListener')
      const removeSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useNetworkStatus())

      // Both listeners registered
      const onlineCalls = addSpy.mock.calls.filter(([event]) => event === 'online')
      const offlineCalls = addSpy.mock.calls.filter(([event]) => event === 'offline')
      expect(onlineCalls).toHaveLength(1)
      expect(offlineCalls).toHaveLength(1)

      unmount()

      // Both listeners removed
      const removedOnline = removeSpy.mock.calls.filter(([event]) => event === 'online')
      const removedOffline = removeSpy.mock.calls.filter(([event]) => event === 'offline')
      expect(removedOnline).toHaveLength(1)
      expect(removedOffline).toHaveLength(1)

      // Same handler reference used for add and remove
      expect(onlineCalls[0][1]).toBe(removedOnline[0][1])
      expect(offlineCalls[0][1]).toBe(removedOffline[0][1])

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })

  // ── Return shape ────────────────────────────────────────────────────────────

  describe('return shape', () => {
    it('returns an object with isOnline property', () => {
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current).toHaveProperty('isOnline')
      expect(typeof result.current.isOnline).toBe('boolean')
    })
  })

  // ── SSR / navigator undefined fallback ──────────────────────────────────────

  describe('SSR fallback when navigator is undefined', () => {
    it('defaults to isOnline=true when navigator is not available', () => {
      // Temporarily remove navigator to simulate SSR environment
      const originalNavigator = global.navigator
      // @ts-expect-error — intentionally removing navigator for SSR branch test
      delete global.navigator

      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current.isOnline).toBe(true)

      // Restore
      Object.defineProperty(global, 'navigator', {
        configurable: true,
        writable: true,
        value: originalNavigator,
      })
    })
  })
})
