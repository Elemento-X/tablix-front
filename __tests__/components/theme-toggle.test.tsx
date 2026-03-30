/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeToggle } from '@/components/theme-toggle'

const mockSetTheme = jest.fn()
let mockResolvedTheme = 'light'

jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'theme.switchToLight': 'Switch to light theme',
        'theme.switchToDark': 'Switch to dark theme',
      }
      return map[key] ?? key
    },
  }),
}))

function renderMounted() {
  let result: ReturnType<typeof render>
  act(() => {
    result = render(<ThemeToggle />)
  })
  return result!
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockResolvedTheme = 'light'
    mockSetTheme.mockClear()
  })

  it('renders a button', () => {
    renderMounted()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label for switching to dark when in light mode', () => {
    mockResolvedTheme = 'light'
    renderMounted()
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to dark theme',
    )
  })

  it('has aria-label for switching to light when in dark mode', () => {
    mockResolvedTheme = 'dark'
    renderMounted()
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to light theme',
    )
  })

  it('calls setTheme("dark") when clicked in light mode', () => {
    mockResolvedTheme = 'light'
    renderMounted()
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme("light") when clicked in dark mode', () => {
    mockResolvedTheme = 'dark'
    renderMounted()
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
