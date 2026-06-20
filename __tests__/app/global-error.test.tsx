/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import RootError from '@/app/global-error'

// Silence the expected <html>/<body> nesting warnings from rendering a document
// root inside jsdom's body, and the boundary's own console.error logging.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  jest.restoreAllMocks()
})

function setLocaleCookie(value: string | null) {
  if (value === null) {
    document.cookie = 'tablix-locale=; path=/; max-age=0'
  } else {
    document.cookie = `tablix-locale=${value}; path=/`
  }
}

const props = { error: new Error('boom'), reset: jest.fn() }

describe('global-error (RootError) i18n', () => {
  afterEach(() => setLocaleCookie(null))

  it('falls back to pt-BR when no locale cookie is set', async () => {
    setLocaleCookie(null)
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('Algo deu errado')).toBeInTheDocument())
  })

  it('renders English when tablix-locale=en', async () => {
    setLocaleCookie('en')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeInTheDocument())
  })

  it('renders Spanish when tablix-locale=es', async () => {
    setLocaleCookie('es')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('Algo salió mal')).toBeInTheDocument())
  })

  it('renders Mandarin when tablix-locale=zh', async () => {
    setLocaleCookie('zh')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('出错了')).toBeInTheDocument())
  })

  it('renders French when tablix-locale=fr', async () => {
    setLocaleCookie('fr')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText("Une erreur s'est produite")).toBeInTheDocument())
  })

  it('falls back to pt-BR for an invalid locale cookie', async () => {
    setLocaleCookie('fr-XX-invalid')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('Algo deu errado')).toBeInTheDocument())
  })

  it('shows the action buttons (reset + home) localized', async () => {
    setLocaleCookie('zh')
    render(<RootError {...props} />)
    await waitFor(() => expect(screen.getByText('重试')).toBeInTheDocument())
    expect(screen.getByText('返回首页')).toBeInTheDocument()
  })
})
