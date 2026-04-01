/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, buttonVariants } from '@/components/button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('has data-slot="button"', () => {
    render(<Button>Test</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button')
  })

  it('applies default variant classes', () => {
    render(<Button>Default</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary')
  })

  it('applies brand variant', () => {
    render(<Button variant="brand">Brand</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-teal-700')
  })

  it('applies destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-destructive')
  })

  it('applies outline variant', () => {
    render(<Button variant="outline">Outline</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-background')
  })

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('hover:bg-accent')
  })

  it('applies link variant', () => {
    render(<Button variant="link">Link</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-teal-700')
  })

  it('applies sm size', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-8')
  })

  it('applies lg size', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-10')
  })

  it('applies icon size', () => {
    render(<Button size="icon">I</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('size-9')
  })

  it('merges custom className', () => {
    render(<Button className="my-custom">Custom</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('my-custom')
  })

  it('forwards onClick handler', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('forwards type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('exports buttonVariants function', () => {
    expect(typeof buttonVariants).toBe('function')
    const classes = buttonVariants({ variant: 'secondary', size: 'sm' })
    expect(classes).toContain('bg-secondary')
    expect(classes).toContain('h-8')
  })
})
