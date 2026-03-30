/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider, useLocale } from '@/lib/i18n/LocaleProvider'

// Mock the message files
jest.mock('@/lib/i18n/messages/pt-BR.json', () => ({
  common: {
    title: 'Título em Português',
    greeting: 'Olá, {name}!',
    count: 'Você tem {count} itens',
  },
  nested: {
    deep: {
      value: 'Valor profundo',
    },
  },
}))

jest.mock('@/lib/i18n/messages/en.json', () => ({
  common: {
    title: 'Title in English',
    greeting: 'Hello, {name}!',
    count: 'You have {count} items',
  },
  nested: {
    deep: {
      value: 'Deep value',
    },
  },
}))

jest.mock('@/lib/i18n/messages/es.json', () => ({
  common: {
    title: 'Título en Español',
    greeting: '¡Hola, {name}!',
    count: 'Tienes {count} artículos',
  },
  nested: {
    deep: {
      value: 'Valor profundo',
    },
  },
}))

// Test component that uses useLocale
function TestComponent() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="title">{t('common.title')}</span>
      <span data-testid="greeting">
        {t('common.greeting', { name: 'Test' })}
      </span>
      <span data-testid="count">{t('common.count', { count: 5 })}</span>
      <span data-testid="deep-value">{t('nested.deep.value')}</span>
      <span data-testid="missing-key">{t('nonexistent.key')}</span>
      <button onClick={() => setLocale('en')} data-testid="switch-to-en">
        English
      </button>
      <button onClick={() => setLocale('es')} data-testid="switch-to-es">
        Español
      </button>
      <button onClick={() => setLocale('pt-BR')} data-testid="switch-to-ptbr">
        Português
      </button>
    </div>
  )
}

describe('LocaleProvider', () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  describe('initial state', () => {
    it('should default to pt-BR locale', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR')
    })

    it('should use stored locale from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('en')

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-locale')).toHaveTextContent('en')
      })
    })

    it('should ignore invalid stored locale', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-locale')

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      // Should stay at default
      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR')
    })
  })

  describe('setLocale', () => {
    it('should change locale when setLocale is called', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR')

      await user.click(screen.getByTestId('switch-to-en'))

      expect(screen.getByTestId('current-locale')).toHaveTextContent('en')
    })

    it('should persist locale to localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      await user.click(screen.getByTestId('switch-to-en'))

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tablix-locale',
        'en',
      )
    })

    it('should switch between all locales', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      // Switch to English
      await user.click(screen.getByTestId('switch-to-en'))
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en')

      // Switch to Spanish
      await user.click(screen.getByTestId('switch-to-es'))
      expect(screen.getByTestId('current-locale')).toHaveTextContent('es')

      // Switch back to Portuguese
      await user.click(screen.getByTestId('switch-to-ptbr'))
      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR')
    })
  })

  describe('t function (translation)', () => {
    it('should translate simple keys', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('title')).toHaveTextContent(
        'Título em Português',
      )
    })

    it('should interpolate string values', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('greeting')).toHaveTextContent('Olá, Test!')
    })

    it('should interpolate number values', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('count')).toHaveTextContent('Você tem 5 itens')
    })

    it('should handle nested keys', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('deep-value')).toHaveTextContent(
        'Valor profundo',
      )
    })

    it('should return key when translation not found', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('missing-key')).toHaveTextContent(
        'nonexistent.key',
      )
    })

    it('should update translations when locale changes', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('title')).toHaveTextContent(
        'Título em Português',
      )

      await user.click(screen.getByTestId('switch-to-en'))

      expect(screen.getByTestId('title')).toHaveTextContent('Title in English')
    })

    it('should update interpolated translations when locale changes', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <LocaleProvider>
          <TestComponent />
        </LocaleProvider>,
      )

      expect(screen.getByTestId('greeting')).toHaveTextContent('Olá, Test!')

      await user.click(screen.getByTestId('switch-to-en'))

      expect(screen.getByTestId('greeting')).toHaveTextContent('Hello, Test!')
    })
  })

  describe('useLocale hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = jest.fn()

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useLocale must be used within a LocaleProvider')

      console.error = originalError
    })
  })

  describe('messages object', () => {
    it('should expose current messages object', () => {
      localStorageMock.getItem.mockReturnValue(null)

      function MessageTest() {
        const { messages } = useLocale()
        return <span data-testid="messages">{JSON.stringify(messages)}</span>
      }

      render(
        <LocaleProvider>
          <MessageTest />
        </LocaleProvider>,
      )

      const messagesContent = screen.getByTestId('messages').textContent
      expect(messagesContent).toContain('Título em Português')
    })
  })
})

describe('getNestedValue helper', () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  // This is an internal function, but we test it through the t() function
  it('should handle single level keys', () => {
    localStorageMock.getItem.mockReturnValue(null)

    function SingleLevelTest() {
      const { t } = useLocale()
      // Using common.title as a test
      return <span data-testid="result">{t('common.title')}</span>
    }

    render(
      <LocaleProvider>
        <SingleLevelTest />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('result')).toHaveTextContent(
      'Título em Português',
    )
  })

  it('should handle deeply nested keys', () => {
    localStorageMock.getItem.mockReturnValue(null)

    function DeepTest() {
      const { t } = useLocale()
      return <span data-testid="result">{t('nested.deep.value')}</span>
    }

    render(
      <LocaleProvider>
        <DeepTest />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('result')).toHaveTextContent('Valor profundo')
  })

  it('should return key for non-existent paths', () => {
    localStorageMock.getItem.mockReturnValue(null)

    function MissingTest() {
      const { t } = useLocale()
      return <span data-testid="result">{t('this.does.not.exist')}</span>
    }

    render(
      <LocaleProvider>
        <MissingTest />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('result')).toHaveTextContent(
      'this.does.not.exist',
    )
  })
})
