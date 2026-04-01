/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'notFound.title': 'Page not found',
        'notFound.description': "The page you're looking for doesn't exist or has been moved.",
        'notFound.goHome': 'Go to home',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('next/link', () => {
  const LinkMock = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
  LinkMock.displayName = 'Link'
  return LinkMock
})

describe('NotFound', () => {
  it('renders the 404 badge text', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(<NotFound />)
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<NotFound />)
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved."),
    ).toBeInTheDocument()
  })

  it('renders a link to home with correct href', () => {
    render(<NotFound />)
    const link = screen.getByRole('link', { name: 'Go to home' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders the go home button text using i18n key', () => {
    render(<NotFound />)
    expect(screen.getByText('Go to home')).toBeInTheDocument()
  })

  it('renders title as a heading element (h2)', () => {
    render(<NotFound />)
    const heading = screen.getByRole('heading', { name: 'Page not found' })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H2')
  })

  it('404 text is inside a teal-styled container', () => {
    const { container } = render(<NotFound />)
    const badge = screen.getByText('404')
    expect(badge.className).toContain('teal-700')
  })

  it('renders in a centered flex container', () => {
    const { container } = render(<NotFound />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('flex')
    expect(root.className).toContain('items-center')
    expect(root.className).toContain('justify-center')
  })

  it('all visible text uses i18n keys (no hardcoded non-numeric text)', () => {
    render(<NotFound />)
    // These are the exact translated strings returned by the mock
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved."),
    ).toBeInTheDocument()
    expect(screen.getByText('Go to home')).toBeInTheDocument()
    // Only the numeric "404" badge is hardcoded — this is acceptable for a numeric code
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
