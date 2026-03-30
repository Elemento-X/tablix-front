/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSelector } from '@/components/language-selector'

const mockSetLocale = jest.fn()
const mockSetTheme = jest.fn()

jest.mock('@/lib/i18n', () => ({
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
  locales: ['pt-BR', 'en', 'es'] as const,
  localeNames: {
    'pt-BR': 'Português',
    en: 'English',
    es: 'Español',
  },
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

  it('calls setLocale when a language is selected', () => {
    render(<LanguageSelector />)
    const langButton = screen.getByText('Select language').closest('button')!
    fireEvent.click(langButton)
    fireEvent.click(screen.getByText('English'))
    expect(mockSetLocale).toHaveBeenCalledWith('en')
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
