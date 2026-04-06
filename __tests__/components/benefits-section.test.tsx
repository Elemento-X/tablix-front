/**
 * @jest-environment jsdom
 *
 * Tests for src/components/benefits-section.tsx
 *
 * Covers:
 * - Rendering dos 3 blocos de benefícios (pain + solution)
 * - Ícones de dor (ClipboardCopy, Columns3, Timer) com aria-hidden="true"
 * - Ícone de solução (Check) com aria-hidden="true"
 * - Textos i18n renderizados corretamente (sem fallback para chaves brutas)
 * - Título da seção via i18n
 * - Estrutura grid md:grid-cols-3
 * - Classe dark mode bg-muted/30 presente na section
 * - SVG da seta presente em cada card (aria-hidden)
 * - Motion props: initial e whileInView nos cards
 * - Nenhum texto visível é hardcoded fora do i18n
 */

import { render, screen, within } from '@testing-library/react'
import { BenefitsSection } from '@/components/benefits-section'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'benefits.title': 'Chega de planilha manual',
        'benefits.items.item1.pain': 'Copiar e colar entre dezenas de abas',
        'benefits.items.item1.solution': 'Envie os arquivos e unifique de uma vez',
        'benefits.items.item2.pain': 'Colunas erradas, dados fora de lugar',
        'benefits.items.item2.solution': 'Selecione visualmente o que importa',
        'benefits.items.item3.pain': 'Horas repetindo o mesmo processo toda semana',
        'benefits.items.item3.solution': 'Resultado pronto em segundos no Tablix',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('@/lib/motion', () => ({
  EASING: { enter: [0.25, 0.46, 0.45, 0.94] },
  SPRING: { pop: { type: 'spring', stiffness: 500, damping: 25 } },
  TIMING: { slow: 0.4 },
}))

// framer-motion: preserva data-* e className para inspeção de classes;
// propaga initial e whileInView como data attributes para testabilidade.
jest.mock('framer-motion', () => {
  function makeEl(tag: string) {
    return function MotionEl({
      children,
      initial,
      whileInView,
      className,
      style,
      ...rest
    }: React.HTMLAttributes<HTMLElement> & {
      initial?: unknown
      whileInView?: unknown
      viewport?: unknown
      transition?: unknown
    }) {
      const dataInitial = initial !== undefined ? JSON.stringify(initial) : undefined
      const dataWhileInView = whileInView !== undefined ? JSON.stringify(whileInView) : undefined
      const props = {
        className,
        style,
        'data-initial': dataInitial,
        'data-while-in-view': dataWhileInView,
        ...rest,
      }
      return React.createElement(tag, props, children)
    }
  }

  // motion.svg and motion.path need special treatment
  const motionSvg = ({
    children,
    initial,
    whileInView,
    ...rest
  }: React.SVGAttributes<SVGSVGElement> & {
    initial?: unknown
    whileInView?: unknown
    viewport?: unknown
    transition?: unknown
  }) =>
    React.createElement(
      'svg',
      {
        ...rest,
        'data-initial': initial !== undefined ? JSON.stringify(initial) : undefined,
        'data-while-in-view': whileInView !== undefined ? JSON.stringify(whileInView) : undefined,
      },
      children,
    )

  const motionPath = ({
    initial,
    whileInView,
    ...rest
  }: React.SVGAttributes<SVGPathElement> & {
    initial?: unknown
    whileInView?: unknown
    viewport?: unknown
    transition?: unknown
  }) =>
    React.createElement('path', {
      ...rest,
      'data-initial': initial !== undefined ? JSON.stringify(initial) : undefined,
      'data-while-in-view': whileInView !== undefined ? JSON.stringify(whileInView) : undefined,
    })

  return {
    motion: {
      div: makeEl('div'),
      p: makeEl('p'),
      svg: motionSvg,
      path: motionPath,
    },
  }
})

jest.mock('lucide-react', () => ({
  ClipboardCopy: ({ className, ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="icon-clipboard-copy" className={className} {...props} />
  ),
  Columns3: ({ className, ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="icon-columns3" className={className} {...props} />
  ),
  Timer: ({ className, ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="icon-timer" className={className} {...props} />
  ),
  Check: ({ className, ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="icon-check" className={className} {...props} />
  ),
}))

// ---------------------------------------------------------------------------
// Import React after mocks
// ---------------------------------------------------------------------------
import React from 'react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderBenefits() {
  return render(<BenefitsSection />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BenefitsSection', () => {
  describe('renderização básica', () => {
    it('renderiza sem erros', () => {
      expect(() => renderBenefits()).not.toThrow()
    })

    it('renderiza um elemento <section>', () => {
      const { container } = renderBenefits()
      expect(container.querySelector('section')).toBeInTheDocument()
    })

    it('renderiza o título da seção via i18n', () => {
      renderBenefits()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Chega de planilha manual')
    })
  })

  describe('estrutura de 3 blocos', () => {
    it('renderiza exatamente 3 textos de dor', () => {
      renderBenefits()
      expect(screen.getByText('Copiar e colar entre dezenas de abas')).toBeInTheDocument()
      expect(screen.getByText('Colunas erradas, dados fora de lugar')).toBeInTheDocument()
      expect(screen.getByText('Horas repetindo o mesmo processo toda semana')).toBeInTheDocument()
    })

    it('renderiza exatamente 3 textos de solução', () => {
      renderBenefits()
      expect(screen.getByText('Envie os arquivos e unifique de uma vez')).toBeInTheDocument()
      expect(screen.getByText('Selecione visualmente o que importa')).toBeInTheDocument()
      expect(screen.getByText('Resultado pronto em segundos no Tablix')).toBeInTheDocument()
    })

    it('o grid de cards tem a classe md:grid-cols-3', () => {
      const { container } = renderBenefits()
      const grid = container.querySelector('.md\\:grid-cols-3')
      expect(grid).toBeInTheDocument()
    })

    it('cada card usa grid-cols-[2.75rem_1fr]', () => {
      const { container } = renderBenefits()
      const cards = container.querySelectorAll('.grid-cols-\\[2\\.75rem_1fr\\]')
      expect(cards.length).toBe(3)
    })
  })

  describe('ícones de dor', () => {
    it('renderiza ClipboardCopy (item1) com aria-hidden="true"', () => {
      renderBenefits()
      const icon = screen.getByTestId('icon-clipboard-copy')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('renderiza Columns3 (item2) com aria-hidden="true"', () => {
      renderBenefits()
      const icon = screen.getByTestId('icon-columns3')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('renderiza Timer (item3) com aria-hidden="true"', () => {
      renderBenefits()
      const icon = screen.getByTestId('icon-timer')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('ícones de dor têm classe text-red-500', () => {
      renderBenefits()
      const clipboard = screen.getByTestId('icon-clipboard-copy')
      const columns = screen.getByTestId('icon-columns3')
      const timer = screen.getByTestId('icon-timer')
      // SVGElement.className é SVGAnimatedString — usar getAttribute para comparar
      expect(clipboard.getAttribute('class')).toContain('text-red-500')
      expect(columns.getAttribute('class')).toContain('text-red-500')
      expect(timer.getAttribute('class')).toContain('text-red-500')
    })
  })

  describe('ícone de solução (Check)', () => {
    it('renderiza 3 ícones Check (um por card)', () => {
      renderBenefits()
      const checks = screen.getAllByTestId('icon-check')
      expect(checks).toHaveLength(3)
    })

    it('todos os ícones Check têm aria-hidden="true"', () => {
      renderBenefits()
      screen.getAllByTestId('icon-check').forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('ícones Check têm classe text-teal-500', () => {
      renderBenefits()
      screen.getAllByTestId('icon-check').forEach((icon) => {
        // SVGElement.className é SVGAnimatedString — usar getAttribute para comparar
        expect(icon.getAttribute('class')).toContain('text-teal-500')
      })
    })
  })

  describe('SVG da seta', () => {
    it('renderiza SVG da seta em cada card (3 total)', () => {
      const { container } = renderBenefits()
      // O SVG da seta é motion.svg com viewBox="0 0 24 24"
      const arrows = container.querySelectorAll('svg[viewBox="0 0 24 24"]')
      expect(arrows.length).toBe(3)
    })

    it('SVGs da seta têm aria-hidden="true"', () => {
      const { container } = renderBenefits()
      const arrows = container.querySelectorAll('svg[viewBox="0 0 24 24"]')
      arrows.forEach((arrow) => {
        expect(arrow).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('cada seta contém um path com o d correto', () => {
      const { container } = renderBenefits()
      const paths = container.querySelectorAll('svg[viewBox="0 0 24 24"] path')
      expect(paths.length).toBe(3)
      paths.forEach((path) => {
        expect(path).toHaveAttribute('d', 'M12 5v14m0 0l-6-6m6 6l6-6')
      })
    })
  })

  describe('dark mode', () => {
    it('section tem a classe dark:bg-muted/30', () => {
      const { container } = renderBenefits()
      const section = container.querySelector('section')
      expect(section?.className).toContain('dark:bg-muted/30')
    })

    it('section tem a classe bg-muted', () => {
      const { container } = renderBenefits()
      const section = container.querySelector('section')
      expect(section?.className).toContain('bg-muted')
    })
  })

  describe('motion props (initial / whileInView)', () => {
    it('o wrapper de fade da section tem initial={{ opacity: 0 }}', () => {
      const { container } = renderBenefits()
      // O primeiro motion.div dentro da section é o wrapper do título
      const motionDivs = container.querySelectorAll('div[data-initial]')
      const fadeDiv = Array.from(motionDivs).find((el) => {
        try {
          const parsed = JSON.parse(el.getAttribute('data-initial') ?? '{}')
          return parsed.opacity === 0 && !('y' in parsed)
        } catch {
          return false
        }
      })
      expect(fadeDiv).toBeTruthy()
    })

    it('cada card tem initial com opacity, y e filter blur', () => {
      const { container } = renderBenefits()
      const cards = Array.from(container.querySelectorAll('div[data-initial]')).filter((el) => {
        try {
          const parsed = JSON.parse(el.getAttribute('data-initial') ?? '{}')
          return 'filter' in parsed && parsed.filter === 'blur(6px)'
        } catch {
          return false
        }
      })
      expect(cards.length).toBe(3)
    })

    it('cada card tem whileInView com opacity: 1, y: 0 e filter blur(0px)', () => {
      const { container } = renderBenefits()
      const cards = Array.from(container.querySelectorAll('div[data-while-in-view]')).filter(
        (el) => {
          try {
            const parsed = JSON.parse(el.getAttribute('data-while-in-view') ?? '{}')
            return parsed.opacity === 1 && parsed.y === 0 && parsed.filter === 'blur(0px)'
          } catch {
            return false
          }
        },
      )
      expect(cards.length).toBe(3)
    })

    it('SVG da seta tem initial com pathLength: 0 no path', () => {
      const { container } = renderBenefits()
      const paths = container.querySelectorAll('path[data-initial]')
      const arrowPaths = Array.from(paths).filter((el) => {
        try {
          const parsed = JSON.parse(el.getAttribute('data-initial') ?? '{}')
          return parsed.pathLength === 0
        } catch {
          return false
        }
      })
      expect(arrowPaths.length).toBe(3)
    })

    it('SVG da seta tem whileInView com pathLength: 1 no path', () => {
      const { container } = renderBenefits()
      const paths = container.querySelectorAll('path[data-while-in-view]')
      const arrowPaths = Array.from(paths).filter((el) => {
        try {
          const parsed = JSON.parse(el.getAttribute('data-while-in-view') ?? '{}')
          return parsed.pathLength === 1
        } catch {
          return false
        }
      })
      expect(arrowPaths.length).toBe(3)
    })
  })

  describe('i18n — sem fallback para chaves brutas', () => {
    it('não renderiza a chave bruta benefits.title', () => {
      renderBenefits()
      expect(screen.queryByText('benefits.title')).not.toBeInTheDocument()
    })

    it('não renderiza chaves brutas de pain dos itens', () => {
      renderBenefits()
      expect(screen.queryByText('benefits.items.item1.pain')).not.toBeInTheDocument()
      expect(screen.queryByText('benefits.items.item2.pain')).not.toBeInTheDocument()
      expect(screen.queryByText('benefits.items.item3.pain')).not.toBeInTheDocument()
    })

    it('não renderiza chaves brutas de solution dos itens', () => {
      renderBenefits()
      expect(screen.queryByText('benefits.items.item1.solution')).not.toBeInTheDocument()
      expect(screen.queryByText('benefits.items.item2.solution')).not.toBeInTheDocument()
      expect(screen.queryByText('benefits.items.item3.solution')).not.toBeInTheDocument()
    })
  })

  describe('container de ícone de dor', () => {
    it('container do ícone de dor tem classes de border e bg vermelhos', () => {
      const { container } = renderBenefits()
      const redContainers = container.querySelectorAll('.border-red-500\\/20')
      expect(redContainers.length).toBe(3)
      redContainers.forEach((el) => {
        expect(el.className).toContain('bg-red-500/10')
      })
    })
  })

  describe('container de ícone de solução', () => {
    it('container do ícone de solução tem classes de border e bg teal', () => {
      const { container } = renderBenefits()
      const tealContainers = container.querySelectorAll('.border-teal-500\\/20')
      expect(tealContainers.length).toBe(3)
      tealContainers.forEach((el) => {
        expect(el.className).toContain('bg-teal-500/10')
      })
    })
  })

  describe('acessibilidade', () => {
    it('h2 é o único heading da seção', () => {
      renderBenefits()
      const headings = screen.getAllByRole('heading')
      expect(headings).toHaveLength(1)
      expect(headings[0].tagName).toBe('H2')
    })
  })
})
