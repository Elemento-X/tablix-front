/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { AnimatedList, AnimatedListItem } from '@/components/animated-list'

let mockReducedMotion = false

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      variants,
      ...rest
    }: {
      children: React.ReactNode
      className?: string
      variants?: Record<string, unknown>
      [key: string]: unknown
    }) => (
      <div
        data-testid="motion-div"
        className={className}
        data-variants={JSON.stringify(variants)}
        data-initial={rest.initial as string}
        data-animate={rest.animate as string}
      >
        {children}
      </div>
    ),
  },
}))

describe('AnimatedList', () => {
  beforeEach(() => {
    mockReducedMotion = false
  })

  it('renders children', () => {
    render(
      <AnimatedList>
        <span>Item 1</span>
      </AnimatedList>,
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <AnimatedList className="grid gap-2">
        <span>Item</span>
      </AnimatedList>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('grid gap-2')
  })

  it('uses motion.div when motion is enabled', () => {
    mockReducedMotion = false
    render(
      <AnimatedList>
        <span>Item</span>
      </AnimatedList>,
    )
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('renders static div when motion is reduced', () => {
    mockReducedMotion = true
    render(
      <AnimatedList>
        <span>Item</span>
      </AnimatedList>,
    )
    expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument()
    expect(screen.getByText('Item')).toBeInTheDocument()
  })

  it('passes stagger config via variants', () => {
    render(
      <AnimatedList staggerDelay={0.1}>
        <span>Item</span>
      </AnimatedList>,
    )
    const motionDiv = screen.getByTestId('motion-div')
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') ?? '{}')
    expect(variants.visible.transition.staggerChildren).toBe(0.1)
  })

  it('defaults staggerDelay to 0.05', () => {
    render(
      <AnimatedList>
        <span>Item</span>
      </AnimatedList>,
    )
    const motionDiv = screen.getByTestId('motion-div')
    const variants = JSON.parse(motionDiv.getAttribute('data-variants') ?? '{}')
    expect(variants.visible.transition.staggerChildren).toBe(0.05)
  })

  it('sets initial="hidden" and animate="visible"', () => {
    render(
      <AnimatedList>
        <span>Item</span>
      </AnimatedList>,
    )
    const motionDiv = screen.getByTestId('motion-div')
    expect(motionDiv.getAttribute('data-initial')).toBe('hidden')
    expect(motionDiv.getAttribute('data-animate')).toBe('visible')
  })
})

describe('AnimatedListItem', () => {
  beforeEach(() => {
    mockReducedMotion = false
  })

  it('renders children', () => {
    render(
      <AnimatedListItem>
        <span>Child</span>
      </AnimatedListItem>,
    )
    expect(screen.getByText('Child')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <AnimatedListItem className="border p-2">
        <span>Child</span>
      </AnimatedListItem>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('border p-2')
  })

  it('uses motion.div when motion is enabled', () => {
    mockReducedMotion = false
    render(
      <AnimatedListItem>
        <span>Child</span>
      </AnimatedListItem>,
    )
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('renders static div when motion is reduced', () => {
    mockReducedMotion = true
    render(
      <AnimatedListItem>
        <span>Child</span>
      </AnimatedListItem>,
    )
    expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument()
    expect(screen.getByText('Child')).toBeInTheDocument()
  })
})
