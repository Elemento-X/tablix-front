/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

describe('useReducedMotion', () => {
  let listeners: Map<string, (event: MediaQueryListEvent) => void>

  function setupMatchMedia(matches: boolean) {
    listeners = new Map()

    const mockFn = jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.set(event, handler)
        },
      ),
      removeEventListener: jest.fn((event: string) => {
        listeners.delete(event)
      }),
      dispatchEvent: jest.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockFn,
    })

    return mockFn
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns false when prefers-reduced-motion is not set', () => {
    setupMatchMedia(false)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion is reduce', () => {
    setupMatchMedia(true)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('queries the correct media query string', () => {
    const mockFn = setupMatchMedia(false)

    renderHook(() => useReducedMotion())
    expect(mockFn).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('updates when media query changes from false to true', () => {
    setupMatchMedia(false)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      const handler = listeners.get('change')
      handler?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current).toBe(true)
  })

  it('updates when media query changes from true to false', () => {
    setupMatchMedia(true)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)

    act(() => {
      const handler = listeners.get('change')
      handler?.({ matches: false } as MediaQueryListEvent)
    })

    expect(result.current).toBe(false)
  })

  it('registers a change event listener', () => {
    setupMatchMedia(false)

    renderHook(() => useReducedMotion())
    expect(listeners.has('change')).toBe(true)
  })

  it('cleans up the event listener on unmount', () => {
    setupMatchMedia(false)

    const { unmount } = renderHook(() => useReducedMotion())
    expect(listeners.has('change')).toBe(true)

    unmount()
    expect(listeners.has('change')).toBe(false)
  })
})
