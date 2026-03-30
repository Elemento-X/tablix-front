/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile hook', () => {
  const MOBILE_BREAKPOINT = 768

  // Helper to mock window.innerWidth and matchMedia
  const mockWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: width < MOBILE_BREAKPOINT,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return false for desktop width (>= 768px)', () => {
      mockWindowWidth(1024)

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
    })

    it('should return true for mobile width (< 768px)', () => {
      mockWindowWidth(375)

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)
    })

    it('should return false for exactly 768px (breakpoint)', () => {
      mockWindowWidth(768)

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)
    })

    it('should return true for 767px (just under breakpoint)', () => {
      mockWindowWidth(767)

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)
    })
  })

  describe('responsive behavior', () => {
    it('should update when window is resized to mobile', () => {
      mockWindowWidth(1024)

      let changeHandler: (() => void) | null = null

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: window.innerWidth < MOBILE_BREAKPOINT,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change') {
            changeHandler = handler
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(false)

      // Simulate resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375 })
        if (changeHandler) {
          changeHandler()
        }
      })

      expect(result.current).toBe(true)
    })

    it('should update when window is resized to desktop', () => {
      mockWindowWidth(375)

      let changeHandler: (() => void) | null = null

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: window.innerWidth < MOBILE_BREAKPOINT,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change') {
            changeHandler = handler
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { result } = renderHook(() => useIsMobile())

      expect(result.current).toBe(true)

      // Simulate resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024 })
        if (changeHandler) {
          changeHandler()
        }
      })

      expect(result.current).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      mockWindowWidth(1024)

      const removeEventListenerMock = jest.fn()
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: jest.fn(),
      }))

      const { unmount } = renderHook(() => useIsMobile())

      unmount()

      expect(removeEventListenerMock).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      )
    })
  })

  describe('edge cases', () => {
    it('should handle common mobile device widths', () => {
      // iPhone SE
      mockWindowWidth(375)
      let { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(true)

      // iPhone 12/13
      mockWindowWidth(390)
      result = renderHook(() => useIsMobile()).result
      expect(result.current).toBe(true)

      // iPad Mini
      mockWindowWidth(768)
      result = renderHook(() => useIsMobile()).result
      expect(result.current).toBe(false)
    })

    it('should handle common desktop widths', () => {
      // Small laptop
      mockWindowWidth(1280)
      let { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)

      // Full HD
      mockWindowWidth(1920)
      result = renderHook(() => useIsMobile()).result
      expect(result.current).toBe(false)

      // 4K
      mockWindowWidth(3840)
      result = renderHook(() => useIsMobile()).result
      expect(result.current).toBe(false)
    })
  })
})
