/**
 * @jest-environment jsdom
 *
 * Tests for src/components/motion-provider.tsx
 *
 * MotionProvider wraps MotionConfig from framer-motion with
 * `reducedMotion="user"`, overriding framer-motion's default
 * auto-disable behavior. Tests verify: renders children,
 * passes the correct reducedMotion prop, and is a transparent wrapper.
 */

import { render, screen } from '@testing-library/react'
import { MotionProvider } from '@/components/motion-provider'

// Mock MotionConfig to capture the props it receives
let capturedProps: Record<string, unknown> = {}

jest.mock('framer-motion', () => ({
  MotionConfig: ({
    children,
    reducedMotion,
  }: {
    children: React.ReactNode
    reducedMotion?: string
  }) => {
    capturedProps = { reducedMotion }
    return <>{children}</>
  },
}))

describe('MotionProvider', () => {
  beforeEach(() => {
    capturedProps = {}
  })

  it('renders children', () => {
    render(
      <MotionProvider>
        <span data-testid="child">content</span>
      </MotionProvider>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders text children', () => {
    render(<MotionProvider>Hello</MotionProvider>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <MotionProvider>
        <span data-testid="child-1">one</span>
        <span data-testid="child-2">two</span>
      </MotionProvider>,
    )
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })

  it('passes reducedMotion="user" to MotionConfig', () => {
    render(
      <MotionProvider>
        <span>child</span>
      </MotionProvider>,
    )
    expect(capturedProps.reducedMotion).toBe('user')
  })

  it('does not pass reducedMotion="always" (would disable all animations)', () => {
    render(
      <MotionProvider>
        <span>child</span>
      </MotionProvider>,
    )
    expect(capturedProps.reducedMotion).not.toBe('always')
  })

  it('does not pass reducedMotion="never" (would ignore OS preference entirely)', () => {
    render(
      <MotionProvider>
        <span>child</span>
      </MotionProvider>,
    )
    expect(capturedProps.reducedMotion).not.toBe('never')
  })

  it('renders without crashing when no children are passed', () => {
    // TypeScript prevents this but runtime should not throw
    expect(() => {
      render(<MotionProvider>{null}</MotionProvider>)
    }).not.toThrow()
  })
})
