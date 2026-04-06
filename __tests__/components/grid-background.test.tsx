/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import { GridBackground } from '@/components/grid-background'

describe('GridBackground', () => {
  it('renders with aria-hidden="true"', () => {
    const { container } = render(<GridBackground />)
    const div = container.firstChild as HTMLElement
    expect(div.getAttribute('aria-hidden')).toBe('true')
  })

  it('has pointer-events-none class', () => {
    const { container } = render(<GridBackground />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('pointer-events-none')
  })

  it('renders with low opacity when inactive (default)', () => {
    const { container } = render(<GridBackground />)
    const grid = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(grid.className).toContain('opacity-[0.08]')
    expect(grid.className).not.toContain('opacity-40')
  })

  it('renders with higher opacity when active', () => {
    const { container } = render(<GridBackground active />)
    const grid = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(grid.className).toContain('opacity-40')
    expect(grid.className).not.toContain('opacity-[0.08]')
  })

  it('applies custom className', () => {
    const { container } = render(<GridBackground className="custom-class" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('custom-class')
  })

  it('has grid background style on inner element', () => {
    const { container } = render(<GridBackground />)
    const grid = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(grid.style.backgroundSize).toBe('24px 24px')
    expect(grid.style.backgroundImage).toContain('linear-gradient')
  })

  it('uses teal color when active', () => {
    const { container } = render(<GridBackground active />)
    const grid = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(grid.style.backgroundImage).toContain('#14b8a6')
  })

  it('uses currentColor when inactive', () => {
    const { container } = render(<GridBackground />)
    const grid = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(grid.style.backgroundImage).toContain('currentColor')
    expect(grid.style.backgroundImage).not.toContain('#14b8a6')
  })

  it('applies mask on container for fixed fade effect', () => {
    const { container } = render(<GridBackground />)
    const div = container.firstChild as HTMLElement
    expect(div.style.maskImage).toContain('radial-gradient')
  })

  it('does not render pulse dots when animated is false (default)', () => {
    const { container } = render(<GridBackground />)
    const dots = container.querySelectorAll('.animate-pulse')
    expect(dots.length).toBe(0)
  })

  it('renders 12 pulse dots when animated is true', () => {
    const { container } = render(<GridBackground animated />)
    const dots = container.querySelectorAll('.animate-pulse')
    expect(dots.length).toBe(12)
  })

  it('pulse dots have bg-teal-500 class', () => {
    const { container } = render(<GridBackground animated />)
    const dots = container.querySelectorAll('.animate-pulse')
    dots.forEach((dot) => {
      expect(dot.className).toContain('bg-teal-500')
    })
  })

  it('pulse dots have animationDelay style set from INTERSECTIONS', () => {
    const { container } = render(<GridBackground animated />)
    const dots = container.querySelectorAll('.animate-pulse')
    // First dot has delay 0s, second has 1.2s (from INTERSECTIONS fixture)
    expect((dots[0] as HTMLElement).style.animationDelay).toBe('0s')
    expect((dots[1] as HTMLElement).style.animationDelay).toBe('1.2s')
  })

  it('pulse dots have animationDuration of 3s', () => {
    const { container } = render(<GridBackground animated />)
    const dots = container.querySelectorAll('.animate-pulse')
    dots.forEach((dot) => {
      expect((dot as HTMLElement).style.animationDuration).toBe('3s')
    })
  })

  it('pulse dots are positioned with top/left percentage styles', () => {
    const { container } = render(<GridBackground animated />)
    const dots = container.querySelectorAll('.animate-pulse')
    // First intersection: { top: 12, left: 18 }
    expect((dots[0] as HTMLElement).style.top).toBe('12%')
    expect((dots[0] as HTMLElement).style.left).toBe('18%')
  })

  it('uses requestAnimationFrame when animated is true', () => {
    // Only invoke the first call to break the recursive rAF loop
    let called = false
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (!called) {
        called = true
        cb(0)
      }
      return 1
    })

    render(<GridBackground animated />)

    expect(rafSpy).toHaveBeenCalled()
    rafSpy.mockRestore()
  })

  it('cancels animation frame on unmount when animated is true', () => {
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame')
    jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)

    const { unmount } = render(<GridBackground animated />)
    unmount()

    expect(cancelSpy).toHaveBeenCalledWith(42)
    cancelSpy.mockRestore()
    jest.restoreAllMocks()
  })

  it('does not start animation when animated is false', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame')
    render(<GridBackground animated={false} />)
    expect(rafSpy).not.toHaveBeenCalled()
    rafSpy.mockRestore()
  })

  it('grid drift effect updates transform via requestAnimationFrame tick', () => {
    let savedCb: FrameRequestCallback | null = null
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      savedCb = cb
      return 1
    })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const { container } = render(<GridBackground animated />)
    const gridDiv = (container.firstChild as HTMLElement).firstChild as HTMLElement

    // Advance two ticks: first tick sets start, second tick computes translation
    if (savedCb) (savedCb as FrameRequestCallback)(0)
    if (savedCb) (savedCb as FrameRequestCallback)(500)

    // After a tick the transform should be set (translate3d)
    expect(gridDiv.style.transform).toMatch(/translate3d/)

    jest.restoreAllMocks()
  })
})
