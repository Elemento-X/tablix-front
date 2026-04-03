/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useActiveSection } from '@/hooks/use-active-section'

// IntersectionObserver mock with callback control
type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void

let capturedCallback: IntersectionCallback | null = null
let observedElements: Element[] = []
let disconnectCalled = false

function createMockEntry(
  element: Element,
  isIntersecting: boolean,
  top = 0,
): IntersectionObserverEntry {
  return {
    target: element,
    isIntersecting,
    boundingClientRect: { top } as DOMRectReadOnly,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    time: 0,
  }
}

function setupIntersectionObserver() {
  capturedCallback = null
  observedElements = []
  disconnectCalled = false

  const MockIO = jest.fn().mockImplementation((callback: IntersectionCallback) => {
    capturedCallback = callback
    return {
      observe: jest.fn((el: Element) => {
        observedElements.push(el)
      }),
      unobserve: jest.fn(),
      disconnect: jest.fn(() => {
        disconnectCalled = true
      }),
    }
  })

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIO,
  })

  return MockIO
}

function createSection(id: string): HTMLElement {
  const el = document.createElement('section')
  el.id = id
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  // Clean up DOM elements
  document.body.innerHTML = ''
  jest.restoreAllMocks()
})

describe('useActiveSection', () => {
  describe('initial state', () => {
    it('returns null before any intersection occurs', () => {
      setupIntersectionObserver()
      createSection('section-a')

      const { result } = renderHook(() => useActiveSection(['section-a']))
      expect(result.current).toBeNull()
    })

    it('returns null when sectionIds array is empty', () => {
      setupIntersectionObserver()

      const { result } = renderHook(() => useActiveSection([]))
      expect(result.current).toBeNull()
    })
  })

  describe('element observation', () => {
    it('observes all sections that exist in the DOM', () => {
      const MockIO = setupIntersectionObserver()
      createSection('a')
      createSection('b')
      createSection('c')

      renderHook(() => useActiveSection(['a', 'b', 'c']))

      const instance = MockIO.mock.results[0].value
      expect(instance.observe).toHaveBeenCalledTimes(3)
    })

    it('skips section IDs that do not exist in the DOM', () => {
      const MockIO = setupIntersectionObserver()
      createSection('exists')
      // 'ghost' is not in DOM

      renderHook(() => useActiveSection(['exists', 'ghost']))

      const instance = MockIO.mock.results[0].value
      expect(instance.observe).toHaveBeenCalledTimes(1)
    })

    it('does not instantiate IntersectionObserver when no elements found', () => {
      const MockIO = setupIntersectionObserver()
      // No sections created in DOM
      renderHook(() => useActiveSection(['nonexistent']))

      expect(MockIO).not.toHaveBeenCalled()
    })

    it('disconnects observer on unmount', () => {
      const MockIO = setupIntersectionObserver()
      createSection('sec1')

      const { unmount } = renderHook(() => useActiveSection(['sec1']))
      unmount()

      const instance = MockIO.mock.results[0].value
      expect(instance.disconnect).toHaveBeenCalled()
    })
  })

  describe('active section detection', () => {
    it('sets activeSection when a single section becomes visible', () => {
      setupIntersectionObserver()
      const el = createSection('hero')

      const { result } = renderHook(() => useActiveSection(['hero']))

      act(() => {
        capturedCallback!([createMockEntry(el, true, 100)])
      })

      expect(result.current).toBe('hero')
    })

    it('selects the topmost visible section when multiple are intersecting', () => {
      setupIntersectionObserver()
      const elA = createSection('section-a')
      const elB = createSection('section-b')

      const { result } = renderHook(() =>
        useActiveSection(['section-a', 'section-b']),
      )

      // section-b is higher up (smaller top value)
      act(() => {
        capturedCallback!([
          createMockEntry(elA, true, 300),
          createMockEntry(elB, true, 50),
        ])
      })

      expect(result.current).toBe('section-b')
    })

    it('does not change activeSection when no entries are intersecting', () => {
      setupIntersectionObserver()
      const el = createSection('visible')

      const { result } = renderHook(() => useActiveSection(['visible']))

      // First make it active
      act(() => {
        capturedCallback!([createMockEntry(el, true, 0)])
      })
      expect(result.current).toBe('visible')

      // Then fire with nothing intersecting — state should remain
      act(() => {
        capturedCallback!([createMockEntry(el, false, 0)])
      })
      expect(result.current).toBe('visible')
    })

    it('updates activeSection as the user scrolls between sections', () => {
      setupIntersectionObserver()
      const elA = createSection('intro')
      const elB = createSection('features')

      const { result } = renderHook(() =>
        useActiveSection(['intro', 'features']),
      )

      act(() => {
        capturedCallback!([createMockEntry(elA, true, 100)])
      })
      expect(result.current).toBe('intro')

      act(() => {
        capturedCallback!([createMockEntry(elB, true, 50)])
      })
      expect(result.current).toBe('features')
    })
  })

  describe('edge cases', () => {
    it('handles sectionIds array with a single element correctly', () => {
      setupIntersectionObserver()
      const el = createSection('only-section')

      const { result } = renderHook(() => useActiveSection(['only-section']))

      act(() => {
        capturedCallback!([createMockEntry(el, true, 0)])
      })

      expect(result.current).toBe('only-section')
    })

    it('re-observes when sectionIds reference changes', () => {
      const MockIO = setupIntersectionObserver()
      createSection('sec1')

      const { rerender } = renderHook(
        ({ ids }: { ids: string[] }) => useActiveSection(ids),
        { initialProps: { ids: ['sec1'] } },
      )

      createSection('sec2')
      rerender({ ids: ['sec1', 'sec2'] })

      // Second observer instance should be created on sectionIds change
      expect(MockIO).toHaveBeenCalledTimes(2)
    })

    it('disconnects previous observer before creating a new one on sectionIds change', () => {
      const MockIO = setupIntersectionObserver()
      createSection('sec1')

      const { rerender } = renderHook(
        ({ ids }: { ids: string[] }) => useActiveSection(ids),
        { initialProps: { ids: ['sec1'] } },
      )

      createSection('sec2')
      rerender({ ids: ['sec1', 'sec2'] })

      const firstInstance = MockIO.mock.results[0].value
      expect(firstInstance.disconnect).toHaveBeenCalled()
    })

    it('handles empty sectionIds without throwing', () => {
      setupIntersectionObserver()

      expect(() => {
        renderHook(() => useActiveSection([]))
      }).not.toThrow()
    })

    it('handles intersection event with an empty entries array', () => {
      setupIntersectionObserver()
      createSection('target')

      const { result } = renderHook(() => useActiveSection(['target']))

      act(() => {
        capturedCallback!([])
      })

      expect(result.current).toBeNull()
    })

    it('sorts multiple visible entries by top position (ascending)', () => {
      setupIntersectionObserver()
      const el1 = createSection('top-section')
      const el2 = createSection('mid-section')
      const el3 = createSection('bottom-section')

      const { result } = renderHook(() =>
        useActiveSection(['top-section', 'mid-section', 'bottom-section']),
      )

      // Fire all three as intersecting, bottom-section has smallest top value
      act(() => {
        capturedCallback!([
          createMockEntry(el3, true, 10),
          createMockEntry(el1, true, 300),
          createMockEntry(el2, true, 150),
        ])
      })

      expect(result.current).toBe('bottom-section')
    })
  })

  describe('IntersectionObserver configuration', () => {
    it('creates observer with correct threshold and rootMargin', () => {
      const MockIO = setupIntersectionObserver()
      createSection('check-config')

      renderHook(() => useActiveSection(['check-config']))

      const [, options] = MockIO.mock.calls[0]
      expect(options.threshold).toBe(0.3)
      expect(options.rootMargin).toBe('-80px 0px -50% 0px')
    })
  })
})
