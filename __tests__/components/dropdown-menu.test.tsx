/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/dropdown-menu'

function renderMenu(itemClick?: jest.Mock) {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={itemClick}>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
}

describe('DropdownMenu', () => {
  it('renders the trigger button', () => {
    renderMenu()
    expect(
      screen.getByRole('button', { name: 'Open Menu' }),
    ).toBeInTheDocument()
  })

  it('does not show content initially', () => {
    renderMenu()
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('shows content when trigger is clicked', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('hides content when trigger is clicked again', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Open Menu' })
    fireEvent.click(trigger)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('sets aria-expanded on trigger', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Open Menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('sets data-state on trigger', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Open Menu' })
    expect(trigger).toHaveAttribute('data-state', 'closed')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('data-state', 'open')
  })

  it('closes on Escape key', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('closes on click outside', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('calls onClick on DropdownMenuItem and closes menu', () => {
    const handleClick = jest.fn()
    renderMenu(handleClick)
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    fireEvent.click(screen.getByText('Item 1'))
    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('renders DropdownMenuLabel', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Actions').getAttribute('data-slot')).toBe(
      'dropdown-menu-label',
    )
  })

  it('renders DropdownMenuSeparator', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }))
    const separator = document.querySelector(
      '[data-slot="dropdown-menu-separator"]',
    )
    expect(separator).toBeInTheDocument()
  })

  it('renders data-slot attributes on all parts', () => {
    renderMenu()
    expect(
      document.querySelector('[data-slot="dropdown-menu"]'),
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="dropdown-menu-trigger"]'),
    ).toBeInTheDocument()
  })
})

describe('DropdownMenuTrigger with asChild', () => {
  it('renders child element instead of button when asChild is true', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span data-testid="custom-trigger">Custom</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    const trigger = screen.getByTestId('custom-trigger')
    expect(trigger.tagName).toBe('SPAN')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens menu when asChild trigger is clicked', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span data-testid="custom-trigger">Custom</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByTestId('custom-trigger'))
    expect(screen.getByText('Item')).toBeInTheDocument()
  })

  it('calls original onClick of child element', () => {
    const childClick = jest.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span data-testid="custom-trigger" onClick={childClick}>
            Custom
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByTestId('custom-trigger'))
    expect(childClick).toHaveBeenCalledTimes(1)
  })
})

describe('useDropdownMenu guard', () => {
  it('throws when DropdownMenuItem is rendered outside DropdownMenu', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    expect(() => {
      render(<DropdownMenuItem>Orphan</DropdownMenuItem>)
    }).toThrow('useDropdownMenu must be used within DropdownMenu')
    consoleError.mockRestore()
  })
})

describe('DropdownMenuContent alignment', () => {
  it('applies start alignment', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent align="start" data-testid="content">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const content = screen.getByTestId('content')
    expect(content.className).toContain('left-0')
  })

  it('applies end alignment', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid="content">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const content = screen.getByTestId('content')
    expect(content.className).toContain('right-0')
  })

  it('applies custom sideOffset', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={10} data-testid="content">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const content = screen.getByTestId('content')
    expect(content.style.top).toBe('calc(100% + 10px)')
  })

  it('applies custom className to content', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent className="my-content" data-testid="content">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('content').className).toContain('my-content')
  })
})
