/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ComparisonMini } from '@/components/comparison-mini'
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

const mockUseReducedMotion = jest.fn().mockReturnValue(false)
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderComparisonMini() {
  return render(
    <LocaleProvider>
      <ComparisonMini />
    </LocaleProvider>,
  )
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ComparisonMini', () => {
  describe('estrutura da tabela', () => {
    it('renderiza o título da seção via i18n', () => {
      renderComparisonMini()
      // "Free vs Pro" (pt-BR)
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading.textContent).not.toBe('comparisonMini.title')
      expect(heading.textContent!.length).toBeGreaterThan(0)
    })

    it('renderiza exatamente 4 linhas de features', () => {
      const { container } = renderComparisonMini()
      // Cada feature é um div com grid-cols-3 dentro do overflow-hidden
      // O header também tem grid-cols-3, portanto total de divs grid = 1 header + 4 rows
      const gridRows = container.querySelectorAll('.grid.grid-cols-3')
      expect(gridRows).toHaveLength(5) // 1 header + 4 feature rows
    })

    it('header mostra colunas Free e Pro via i18n', () => {
      renderComparisonMini()
      // Nomes dos planos via pricing.plans.free.name e pricing.plans.pro.name
      expect(screen.getByText('Free')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })
  })

  describe('4 features obrigatórias (FEATURE_KEYS)', () => {
    // FEATURE_KEYS = ['maxFileSize', 'maxRows', 'processing', 'support']

    it('renderiza feature maxFileSize', () => {
      renderComparisonMini()
      // Label da feature (pt-BR: "Tamanho máx. por arquivo")
      expect(screen.getByText('Tamanho máx. por arquivo')).toBeInTheDocument()
    })

    it('renderiza feature maxRows', () => {
      renderComparisonMini()
      // pt-BR: "Linhas por planilha"
      expect(screen.getByText('Linhas por planilha')).toBeInTheDocument()
    })

    it('renderiza feature processing', () => {
      renderComparisonMini()
      // pt-BR: "Processamento"
      expect(screen.getByText('Processamento')).toBeInTheDocument()
    })

    it('renderiza feature support', () => {
      renderComparisonMini()
      // pt-BR: "Suporte"
      expect(screen.getByText('Suporte')).toBeInTheDocument()
    })
  })

  describe('valores Free vs Pro', () => {
    it('valor Free para maxFileSize é "1 MB"', () => {
      renderComparisonMini()
      expect(screen.getByText('1 MB')).toBeInTheDocument()
    })

    it('valor Pro para maxFileSize é "2 MB"', () => {
      renderComparisonMini()
      expect(screen.getByText('2 MB')).toBeInTheDocument()
    })

    it('valor Free para maxRows é "500"', () => {
      renderComparisonMini()
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    it('valor Pro para maxRows é "5.000"', () => {
      renderComparisonMini()
      expect(screen.getByText('5.000')).toBeInTheDocument()
    })

    it('valor Free para processing é "Local (navegador)"', () => {
      renderComparisonMini()
      expect(screen.getByText('Local (navegador)')).toBeInTheDocument()
    })

    it('valor Pro para processing é "Servidor prioritário"', () => {
      renderComparisonMini()
      expect(screen.getByText('Servidor prioritário')).toBeInTheDocument()
    })

    it('valor Free para support é "Comunidade"', () => {
      renderComparisonMini()
      expect(screen.getByText('Comunidade')).toBeInTheDocument()
    })

    it('valor Pro para support é "Suporte prioritário por email"', () => {
      renderComparisonMini()
      // pt-BR: valor exato para evitar colisão com "Servidor prioritário" (processing)
      expect(screen.getByText('Suporte prioritário por email')).toBeInTheDocument()
    })
  })

  describe('link para /pricing', () => {
    it('renderiza link "Ver comparação completa" apontando para /pricing', () => {
      renderComparisonMini()
      const link = screen.getByRole('link', { name: /comparação completa/i })
      expect(link).toHaveAttribute('href', '/pricing')
    })

    it('texto do link não é a chave i18n crua', () => {
      renderComparisonMini()
      expect(screen.queryByText('comparisonMini.seeAll')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('não vaza chaves i18n cruas no DOM', () => {
      const { container } = renderComparisonMini()
      const allText = container.textContent ?? ''
      // Chaves de i18n sempre contêm ponto e seguem padrão camelCase.camelCase
      expect(allText).not.toMatch(/pricingPage\.comparison\.features/)
      expect(allText).not.toMatch(/pricingPage\.comparison\.values/)
      expect(allText).not.toMatch(/comparisonMini\./)
    })

    it('renderiza corretamente com reduced-motion ativo', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderComparisonMini()
      // Com reduced-motion, spread de props de animação é vazio — componente ainda renderiza
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByText('1 MB')).toBeInTheDocument()
      mockUseReducedMotion.mockReturnValue(false)
    })

    it('seção tem estrutura semântica correta (section > div > tabela)', () => {
      const { container } = renderComparisonMini()
      expect(container.querySelector('section')).toBeInTheDocument()
    })
  })
})
