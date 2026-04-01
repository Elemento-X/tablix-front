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
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('opacity-[0.08]')
    expect(div.className).not.toContain('opacity-40')
  })

  it('renders with higher opacity when active', () => {
    const { container } = render(<GridBackground active />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('opacity-40')
    expect(div.className).not.toContain('opacity-[0.08]')
  })

  it('applies custom className', () => {
    const { container } = render(<GridBackground className="custom-class" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('custom-class')
  })

  it('has grid background style', () => {
    const { container } = render(<GridBackground />)
    const div = container.firstChild as HTMLElement
    expect(div.style.backgroundSize).toBe('24px 24px')
    expect(div.style.backgroundImage).toContain('linear-gradient')
  })

  it('uses teal color when active', () => {
    const { container } = render(<GridBackground active />)
    const div = container.firstChild as HTMLElement
    expect(div.style.backgroundImage).toContain('#14b8a6')
  })

  it('uses currentColor when inactive', () => {
    const { container } = render(<GridBackground />)
    const div = container.firstChild as HTMLElement
    expect(div.style.backgroundImage).toContain('currentColor')
    expect(div.style.backgroundImage).not.toContain('#14b8a6')
  })
})
