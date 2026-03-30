/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '@/components/theme-toggle'

const mockSetTheme = jest.fn()
let mockTheme = 'light'

jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
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

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme = 'light'
    mockSetTheme.mockClear()
  })

  it('renders a button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label for switching to dark when in light mode', () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to dark theme',
    )
  })

  it('has aria-label for switching to light when in dark mode', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to light theme',
    )
  })

  it('calls setTheme("dark") when clicked in light mode', () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme("light") when clicked in dark mode', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
