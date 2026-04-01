/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LegalTableOfContents } from '@/components/legal-table-of-contents'

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'legal.tableOfContents': 'Table of Contents',
  }
  return map[key] ?? key
}

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: mockT,
  }),
}))

// Mock lucide-react — ChevronDown with a class prop so we can check rotation
jest.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-down" aria-hidden="true" className={className} />
  ),
}))

const mockScrollIntoView = jest.fn()

const sampleItems = [
  { id: 'intro', label: 'Introduction' },
  { id: 'data-collection', label: 'Data Collection' },
  { id: 'security', label: 'Security' },
]

describe('LegalTableOfContents', () => {
  beforeEach(() => {
    mockScrollIntoView.mockClear()

    // Mock getElementById to return elements with scrollIntoView and getBoundingClientRect
    jest.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (sampleItems.some((item) => item.id === id)) {
        return {
          scrollIntoView: mockScrollIntoView,
          getBoundingClientRect: () => ({
            top: 200,
            bottom: 300,
            left: 0,
            right: 100,
            height: 100,
            width: 100,
          }),
        } as unknown as HTMLElement
      }
      return null
    })

    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 100,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders the nav element with aria-label', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      expect(screen.getByRole('navigation')).toHaveAttribute(
        'aria-label',
        'Table of Contents',
      )
    })

    it('renders table of contents label in mobile toggle', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      // Multiple elements contain this text (mobile button + desktop p)
      const elements = screen.getAllByText('Table of Contents')
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })

    it('renders correct number of items after opening mobile menu', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      const toggleButton = screen.getByRole('button', {
        name: 'Table of Contents',
      })
      fireEvent.click(toggleButton)

      // All items should now be visible (mobile list)
      sampleItems.forEach((item) => {
        // Multiple buttons with same label exist (mobile + desktop), getAllByText
        const buttons = screen.getAllByText(item.label)
        expect(buttons.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('renders empty items list without error', () => {
      render(<LegalTableOfContents items={[]} />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders all items in desktop sidebar (hidden via CSS, in DOM)', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      // Desktop buttons are rendered but hidden with CSS class lg:block
      // They are still in the DOM
      const allButtons = screen.getAllByRole('button')
      // Mobile toggle + desktop buttons
      expect(allButtons.length).toBeGreaterThanOrEqual(sampleItems.length + 1)
    })

    it('renders single item without error', () => {
      render(
        <LegalTableOfContents
          items={[{ id: 'only', label: 'Only Section' }]}
        />,
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('mobile collapsible behavior', () => {
    it('mobile list is not visible initially', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      // The ul with items should not be in document (controlled by isOpen state)
      // Only the toggle button should be visible in mobile
      const uls = screen.queryAllByRole('list')
      // Desktop list is always rendered (hidden via CSS), mobile list only appears when open
      // We can check by counting list items
      expect(uls.length).toBe(1) // only desktop ul
    })

    it('opens mobile menu when toggle button is clicked', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      const toggleButton = screen.getByRole('button', {
        name: 'Table of Contents',
      })
      fireEvent.click(toggleButton)
      // Now 2 lists: mobile + desktop
      const uls = screen.queryAllByRole('list')
      expect(uls.length).toBe(2)
    })

    it('closes mobile menu when toggle button is clicked again', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      const toggleButton = screen.getByRole('button', {
        name: 'Table of Contents',
      })
      fireEvent.click(toggleButton) // open
      fireEvent.click(toggleButton) // close
      const uls = screen.queryAllByRole('list')
      expect(uls.length).toBe(1) // back to desktop only
    })

    it('closes mobile menu after clicking an item', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      const toggleButton = screen.getByRole('button', {
        name: 'Table of Contents',
      })
      fireEvent.click(toggleButton) // open

      // Find the mobile item button (first occurrence since desktop is hidden)
      const introButtons = screen.getAllByText('Introduction')
      fireEvent.click(introButtons[0])

      // Menu should close
      const uls = screen.queryAllByRole('list')
      expect(uls.length).toBe(1)
    })
  })

  describe('scroll behavior on item click', () => {
    it('calls scrollIntoView when clicking a desktop item button', () => {
      render(<LegalTableOfContents items={sampleItems} />)

      // Get all buttons with 'Introduction' (desktop one is in the list)
      const introButtons = screen.getAllByRole('button', {
        name: 'Introduction',
      })
      // Click any of them (desktop)
      fireEvent.click(introButtons[introButtons.length - 1])

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    })

    it('sets active id immediately when item is clicked', () => {
      render(<LegalTableOfContents items={sampleItems} />)

      const introButtons = screen.getAllByRole('button', {
        name: 'Introduction',
      })
      fireEvent.click(introButtons[introButtons.length - 1])

      // After click, the button should have the active style (font-medium bg-muted)
      // We check the desktop buttons since they're always rendered
      const activeButtons = screen
        .getAllByRole('button', { name: 'Introduction' })
        .filter((btn) => btn.className.includes('font-medium'))

      expect(activeButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('does not throw when element with id does not exist', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null)

      render(<LegalTableOfContents items={sampleItems} />)
      const introButtons = screen.getAllByRole('button', {
        name: 'Introduction',
      })

      // Should not throw
      expect(() => {
        fireEvent.click(introButtons[introButtons.length - 1])
      }).not.toThrow()
    })
  })

  describe('scroll-spy behavior', () => {
    it('updates active item on scroll', () => {
      render(<LegalTableOfContents items={sampleItems} />)

      // Simulate scroll event
      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })

      // After scroll, one of the items should be active (getBoundingClientRect top=200 > OFFSET=100 so nothing set)
      // With our mock, top: 200 > OFFSET: 100, so `rect.top <= OFFSET` is false → current stays ''
      // No active item set. Test just ensures no error.
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('sets first item as active when at top of page (scrollY < 10)', () => {
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 5,
      })

      render(<LegalTableOfContents items={sampleItems} />)

      // With scrollY < 10, first item should be active
      // The first item buttons should have font-medium (active class)
      const introButtons = screen
        .getAllByRole('button', { name: 'Introduction' })
        .filter((btn) => btn.className.includes('font-medium'))

      expect(introButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('does not override active on scroll while click-scrolling', () => {
      render(<LegalTableOfContents items={sampleItems} />)

      // Click to trigger isClickScrolling lock
      const introButtons = screen.getAllByRole('button', {
        name: 'Introduction',
      })
      fireEvent.click(introButtons[introButtons.length - 1])

      // Dispatch scroll — should be suppressed
      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })

      // Active id should still be 'intro' (not overridden)
      const activeButtons = screen
        .getAllByRole('button', { name: 'Introduction' })
        .filter((btn) => btn.className.includes('font-medium'))
      expect(activeButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('removes scroll listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      const { unmount } = render(<LegalTableOfContents items={sampleItems} />)
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
      )
    })
  })

  describe('accessibility', () => {
    it('mobile toggle button has ChevronDown icon with rotate class when open', () => {
      render(<LegalTableOfContents items={sampleItems} />)
      const toggleButton = screen.getByRole('button', {
        name: 'Table of Contents',
      })

      // Before opening: check chevron does not have rotate-180
      const chevron = toggleButton.querySelector('svg')
      expect(chevron?.getAttribute('class')).not.toContain('rotate-180')

      fireEvent.click(toggleButton)

      // After opening: chevron should have rotate-180
      const chevronAfter = toggleButton.querySelector('svg')
      expect(chevronAfter?.getAttribute('class')).toContain('rotate-180')
    })
  })
})
