/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '@/components/badge'

describe('Badge', () => {
  it('renders with children', () => {
    render(<Badge>Status</Badge>)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('has data-slot="badge"', () => {
    render(<Badge>Tag</Badge>)
    expect(screen.getByText('Tag')).toHaveAttribute('data-slot', 'badge')
  })

  it('renders as a span element', () => {
    render(<Badge>Tag</Badge>)
    expect(screen.getByText('Tag').tagName).toBe('SPAN')
  })

  it('applies default variant classes', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('bg-primary')
  })

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary').className).toContain('bg-secondary')
  })

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>)
    expect(screen.getByText('Error').className).toContain('bg-destructive')
  })

  it('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success').className).toContain('bg-success')
  })

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning').className).toContain('bg-warning')
  })

  it('applies info variant', () => {
    render(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info').className).toContain('bg-info')
  })

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline').className).toContain('text-foreground')
  })

  it('merges custom className', () => {
    render(<Badge className="my-badge">Custom</Badge>)
    expect(screen.getByText('Custom').className).toContain('my-badge')
  })

  it('exports badgeVariants function', () => {
    expect(typeof badgeVariants).toBe('function')
    const classes = badgeVariants({ variant: 'success' })
    expect(classes).toContain('bg-success')
  })
})
