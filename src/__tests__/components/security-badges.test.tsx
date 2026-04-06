/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { SecurityBadges } from '@/components/security-badges'
import { LocaleProvider } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => {
  const React = require('react')

  const stripMotionProps = (props: Record<string, unknown>) => {
    const {
      initial,
      animate,
      exit,
      whileInView,
      whileHover,
      whileTap,
      transition,
      variants,
      viewport,
      ...rest
    } = props
    void initial
    void animate
    void exit
    void whileInView
    void whileHover
    void whileTap
    void transition
    void variants
    void viewport
    return rest
  }

  return {
    motion: new Proxy(
      {},
      {
        get:
          (_: unknown, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
            React.createElement(tag, stripMotionProps(props), children),
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// Mock lucide-react: renderiza svgs com data-testid para assertividade
jest.mock('lucide-react', () => ({
  Monitor: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-monitor', ...props }),
  Trash2: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-trash2', ...props }),
  Lock: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-lock', ...props }),
  ShieldCheck: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-shieldcheck', ...props }),
  // Outros ícones usados em outros componentes (ArrowRight etc)
  ArrowRight: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-arrowright', ...props }),
}))

const mockUseReducedMotion = jest.fn().mockReturnValue(false)
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderSecurityBadges() {
  return render(
    <LocaleProvider>
      <SecurityBadges />
    </LocaleProvider>,
  )
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('SecurityBadges', () => {
  describe('estrutura e acessibilidade', () => {
    it('renderiza elemento <section>', () => {
      const { container } = renderSecurityBadges()
      expect(container.querySelector('section')).toBeInTheDocument()
    })

    it('renderiza título da seção via i18n', () => {
      renderSecurityBadges()
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading.textContent).not.toBe('securityBadges.title')
      expect(heading.textContent!.length).toBeGreaterThan(0)
    })
  })

  describe('4 badges obrigatórios', () => {
    it('renderiza exatamente 4 badges', () => {
      const { container } = renderSecurityBadges()
      // Cada badge é um motion.div (renderizado como div) com flex-col
      const grid = container.querySelector('.grid')
      expect(grid?.children).toHaveLength(4)
    })

    it('badge "Processamento local" está presente', () => {
      renderSecurityBadges()
      // pt-BR: "Processamento local"
      expect(screen.getByText('Processamento local')).toBeInTheDocument()
    })

    it('badge "Sem armazenamento" está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Sem armazenamento')).toBeInTheDocument()
    })

    it('badge "Criptografia TLS" está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Criptografia TLS')).toBeInTheDocument()
    })

    it('badge "Validação rigorosa" está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Validação rigorosa')).toBeInTheDocument()
    })
  })

  describe('subtítulos dos badges', () => {
    it('subtítulo do badge local está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Seus dados nunca saem do navegador')).toBeInTheDocument()
    })

    it('subtítulo do badge noStorage está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Arquivos não ficam em nossos servidores')).toBeInTheDocument()
    })

    it('subtítulo do badge TLS está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Toda comunicação protegida por HTTPS')).toBeInTheDocument()
    })

    it('subtítulo do badge validation está presente', () => {
      renderSecurityBadges()
      expect(screen.getByText('Cada arquivo verificado antes do processamento')).toBeInTheDocument()
    })
  })

  describe('ícones Lucide', () => {
    it('ícone Monitor (processamento local) está presente', () => {
      renderSecurityBadges()
      expect(screen.getByTestId('icon-monitor')).toBeInTheDocument()
    })

    it('ícone Trash2 (sem armazenamento) está presente', () => {
      renderSecurityBadges()
      expect(screen.getByTestId('icon-trash2')).toBeInTheDocument()
    })

    it('ícone Lock (TLS) está presente', () => {
      renderSecurityBadges()
      expect(screen.getByTestId('icon-lock')).toBeInTheDocument()
    })

    it('ícone ShieldCheck (validação) está presente', () => {
      renderSecurityBadges()
      expect(screen.getByTestId('icon-shieldcheck')).toBeInTheDocument()
    })

    it('todos os ícones têm aria-hidden="true" (decorativos)', () => {
      renderSecurityBadges()
      const icons = ['icon-monitor', 'icon-trash2', 'icon-lock', 'icon-shieldcheck']
      icons.forEach((testId) => {
        expect(screen.getByTestId(testId)).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('grid responsivo', () => {
    it('grid tem classes responsivas sm:grid-cols-2 e md:grid-cols-4', () => {
      const { container } = renderSecurityBadges()
      const grid = container.querySelector('.grid')
      expect(grid?.className).toMatch(/sm:grid-cols-2/)
      expect(grid?.className).toMatch(/md:grid-cols-4/)
    })
  })

  describe('stagger individual (atualização Fase 12)', () => {
    it('renderiza corretamente com reduced-motion desativado (stagger ativo)', () => {
      mockUseReducedMotion.mockReturnValue(false)
      renderSecurityBadges()
      // Com reduced-motion=false, os props de animação são passados mas o componente ainda renderiza
      expect(
        screen.getAllByText(/processamento local|sem armazenamento|criptografia|validação/i),
      ).toHaveLength(4)
    })

    it('renderiza corretamente com reduced-motion ativo (sem animações)', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderSecurityBadges()
      // Com reduced-motion=true, spread de animação é vazio — 4 badges ainda presentes
      expect(screen.getByText('Processamento local')).toBeInTheDocument()
      expect(screen.getByText('Sem armazenamento')).toBeInTheDocument()
      expect(screen.getByText('Criptografia TLS')).toBeInTheDocument()
      expect(screen.getByText('Validação rigorosa')).toBeInTheDocument()
      mockUseReducedMotion.mockReturnValue(false)
    })
  })

  describe('edge cases', () => {
    it('não vaza chaves i18n cruas no DOM', () => {
      const { container } = renderSecurityBadges()
      const allText = container.textContent ?? ''
      expect(allText).not.toMatch(/securityBadges\./)
    })
  })
})
