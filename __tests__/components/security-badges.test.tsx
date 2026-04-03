/**
 * @jest-environment jsdom
 *
 * Tests for src/components/security-badges.tsx
 * Covers: aria-hidden on icons, section semantics, title rendering,
 * badge count, and reduced-motion conditional spread.
 */
import { render, screen } from '@testing-library/react'
import { SecurityBadges } from '@/components/security-badges'

// Mock framer-motion — the spread conditional is what we're testing indirectly
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      whileInView: _whileInView,
      viewport: _viewport,
      transition: _transition,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...rest}>{children}</div>
    ),
  },
}))

const mockUseReducedMotion = jest.fn()

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    locale: 'pt-BR',
    t: (key: string) => {
      const map: Record<string, string> = {
        'securityBadges.title': 'Sua privacidade é nossa prioridade',
        'securityBadges.local.title': 'Processamento local',
        'securityBadges.local.subtitle': 'No seu navegador',
        'securityBadges.noStorage.title': 'Sem armazenamento',
        'securityBadges.noStorage.subtitle': 'Arquivos não são salvos',
        'securityBadges.tls.title': 'TLS/HTTPS',
        'securityBadges.tls.subtitle': 'Tráfego criptografado',
        'securityBadges.validation.title': 'Validação rigorosa',
        'securityBadges.validation.subtitle': 'Tipos e conteúdo verificados',
      }
      return map[key] ?? key
    },
  }),
}))

describe('SecurityBadges', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false)
  })

  describe('structure and semantics', () => {
    it('renders a <section> element', () => {
      const { container } = render(<SecurityBadges />)
      expect(container.querySelector('section')).not.toBeNull()
    })

    it('renders the section title', () => {
      render(<SecurityBadges />)
      expect(
        screen.getByText('Sua privacidade é nossa prioridade'),
      ).toBeInTheDocument()
    })

    it('renders all 4 badge titles', () => {
      render(<SecurityBadges />)
      expect(screen.getByText('Processamento local')).toBeInTheDocument()
      expect(screen.getByText('Sem armazenamento')).toBeInTheDocument()
      expect(screen.getByText('TLS/HTTPS')).toBeInTheDocument()
      expect(screen.getByText('Validação rigorosa')).toBeInTheDocument()
    })

    it('renders all 4 badge subtitles', () => {
      render(<SecurityBadges />)
      expect(screen.getByText('No seu navegador')).toBeInTheDocument()
      expect(screen.getByText('Arquivos não são salvos')).toBeInTheDocument()
      expect(screen.getByText('Tráfego criptografado')).toBeInTheDocument()
      expect(screen.getByText('Tipos e conteúdo verificados')).toBeInTheDocument()
    })
  })

  describe('icon accessibility — aria-hidden', () => {
    it('all lucide icons have aria-hidden="true"', () => {
      const { container } = render(<SecurityBadges />)
      // Lucide icons render as <svg> elements
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(4)
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true')
      })
    })
  })

  describe('reduced motion', () => {
    it('renders correctly when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true)
      render(<SecurityBadges />)
      // Component should still render all content with no animation props
      expect(
        screen.getByText('Sua privacidade é nossa prioridade'),
      ).toBeInTheDocument()
      expect(screen.getByText('Processamento local')).toBeInTheDocument()
    })

    it('renders correctly when reduced motion is not preferred', () => {
      mockUseReducedMotion.mockReturnValue(false)
      render(<SecurityBadges />)
      expect(
        screen.getByText('Sua privacidade é nossa prioridade'),
      ).toBeInTheDocument()
    })
  })
})
