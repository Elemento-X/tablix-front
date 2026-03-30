/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepTransition } from '@/components/step-transition'

let mockReducedMotion = false

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    div: ({
      children,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onAnimationComplete,
      ...props
    }: {
      children: React.ReactNode
      onAnimationComplete?: () => void
      [key: string]: unknown
    }) => (
      <div data-testid="motion-div" data-props={JSON.stringify(props)}>
        {children}
      </div>
    ),
  },
}))

describe('StepTransition', () => {
  beforeEach(() => {
    mockReducedMotion = false
  })

  it('renders children', () => {
    render(
      <StepTransition stepKey="step1">
        <p>Hello</p>
      </StepTransition>,
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('uses AnimatePresence when motion is not reduced', () => {
    mockReducedMotion = false
    render(
      <StepTransition stepKey="step1">
        <p>Content</p>
      </StepTransition>,
    )
    expect(screen.getByTestId('animate-presence')).toBeInTheDocument()
    expect(screen.getByTestId('motion-div')).toBeInTheDocument()
  })

  it('renders static div when motion is reduced', () => {
    mockReducedMotion = true
    render(
      <StepTransition stepKey="step1">
        <p>Content</p>
      </StepTransition>,
    )
    expect(screen.queryByTestId('animate-presence')).not.toBeInTheDocument()
    expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders new children when stepKey changes', () => {
    const { rerender } = render(
      <StepTransition stepKey="step1">
        <p>Step 1</p>
      </StepTransition>,
    )
    rerender(
      <StepTransition stepKey="step2">
        <p>Step 2</p>
      </StepTransition>,
    )
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('defaults direction to forward', () => {
    render(
      <StepTransition stepKey="step1">
        <p>Content</p>
      </StepTransition>,
    )
    const motionDiv = screen.getByTestId('motion-div')
    const props = JSON.parse(motionDiv.getAttribute('data-props') ?? '{}')
    expect(props.initial).toEqual({ opacity: 0, x: 24 })
  })

  it('uses negative offset for backward direction', () => {
    render(
      <StepTransition stepKey="step1" direction="backward">
        <p>Content</p>
      </StepTransition>,
    )
    const motionDiv = screen.getByTestId('motion-div')
    const props = JSON.parse(motionDiv.getAttribute('data-props') ?? '{}')
    expect(props.initial).toEqual({ opacity: 0, x: -24 })
  })

  it('focuses first heading in reduced motion on initial render', () => {
    mockReducedMotion = true
    render(
      <StepTransition stepKey="step1">
        <h2>Step Heading</h2>
      </StepTransition>,
    )
    const heading = screen.getByText('Step Heading')
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(document.activeElement).toBe(heading)
  })

  it('focuses first heading in reduced motion when stepKey changes', () => {
    mockReducedMotion = true
    const { rerender } = render(
      <StepTransition stepKey="step1">
        <h2>Step 1 Heading</h2>
      </StepTransition>,
    )
    rerender(
      <StepTransition stepKey="step2">
        <h2>Step 2 Heading</h2>
      </StepTransition>,
    )
    const heading = screen.getByText('Step 2 Heading')
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(document.activeElement).toBe(heading)
  })

  it('does not attempt focus when no heading is present in reduced motion', () => {
    mockReducedMotion = true
    // Should not throw even without a heading in the container
    expect(() =>
      render(
        <StepTransition stepKey="step1">
          <p>No heading here</p>
        </StepTransition>,
      ),
    ).not.toThrow()
  })
})
