/**
 * @jest-environment jsdom
 *
 * Tests for LanguageSelector component.
 *
 * Behavior under URL-prefix routing (Abordagem B):
 * - changeLocale(loc) calls setLocale(loc) to sync state/cookie AND
 *   router.push(localizedPath(loc, stripLocale(pathname))) to navigate.
 * - The URL is the source of truth for locale; navigation is mandatory.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSelector } from '@/components/language-selector'

const mockSetLocale = jest.fn()
const mockSetTheme = jest.fn()
const mockPush = jest.fn()

// Provide real localizedPath / stripLocale / locales / localeNames so navigation
// assertions use the actual routing contract, not a reimplementation.
jest.mock('@/lib/i18n', () => {
  const actual = jest.requireActual<typeof import('@/lib/i18n')>('@/lib/i18n')
  return {
    ...actual,
    useLocale: () => ({
      locale: 'pt-BR',
      setLocale: mockSetLocale,
      t: (key: string) => {
        const map: Record<string, string> = {
          'a11y.selectLanguage': 'Select language',
          'theme.switchToDark': 'Switch to dark theme',
          'theme.switchToLight': 'Switch to light theme',
        }
        return map[key] ?? key
      },
    }),
  }
})

// Pathname '/pricing' is a representative page (not root, not localized prefix).
jest.mock('next/navigation', () => ({
  usePathname: () => '/pricing',
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
  }),
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    mockSetLocale.mockClear()
    mockSetTheme.mockClear()
    mockPush.mockClear()
  })

  it('renders theme toggle button', () => {
    render(<LanguageSelector />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders language button with sr-only label', () => {
    render(<LanguageSelector />)
    expect(screen.getByText('Select language')).toBeInTheDocument()
  })

  it('does not show language options initially', () => {
    render(<LanguageSelector />)
    expect(screen.queryByText('Português')).not.toBeInTheDocument()
  })

  it('shows language options when language button is clicked', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    expect(screen.getByText('Português')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('calls setLocale and router.push when English is selected', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    fireEvent.click(screen.getByText('English'))
    // setLocale keeps state/cookie in sync
    expect(mockSetLocale).toHaveBeenCalledWith('en')
    // router.push navigates to the localized path
    // pathname '/pricing' → stripLocale → '/pricing' → localizedPath('en', '/pricing') → '/en/pricing'
    expect(mockPush).toHaveBeenCalledWith('/en/pricing')
  })

  it('navigates to localized path when Español is selected', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    fireEvent.click(screen.getByText('Español'))
    expect(mockSetLocale).toHaveBeenCalledWith('es')
    expect(mockPush).toHaveBeenCalledWith('/es/pricing')
  })

  it('navigates to root path (no prefix) when pt-BR is selected', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    fireEvent.click(screen.getByText('Português'))
    expect(mockSetLocale).toHaveBeenCalledWith('pt-BR')
    // pt-BR = default locale → no prefix → '/pricing'
    expect(mockPush).toHaveBeenCalledWith('/pricing')
  })

  it('highlights current locale', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    const ptOption = screen.getByText('Português')
    expect(ptOption.className).toContain('bg-accent')
  })

  it('closes dropdown after selecting a language', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    fireEvent.click(screen.getByText('Español'))
    expect(screen.queryByText('Português')).not.toBeInTheDocument()
  })
})
