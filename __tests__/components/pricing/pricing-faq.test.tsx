/**
 * @jest-environment jsdom
 *
 * Tests for src/app/pricing/components/PricingFAQ.tsx
 * Covers: rendering all 7 FAQ items, accordion open/close, aria-expanded,
 * mutual exclusion between items, reduced motion branch, i18n keys.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingFAQ } from '@/app/pricing/components/PricingFAQ'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockReducedMotion = false

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      ...rest
    }: {
      children: React.ReactNode
      className?: string
      [key: string]: unknown
    }) => (
      <div data-testid="motion-div" className={className} {...(rest as object)}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'pricingPage.faq.title': 'Perguntas frequentes',
        'pricingPage.faq.items.q1.question': 'Posso testar antes de assinar?',
        'pricingPage.faq.items.q1.answer': 'Sim! O plano Free é gratuito e não exige cadastro.',
        'pricingPage.faq.items.q2.question': 'Como funciona o processamento local?',
        'pricingPage.faq.items.q2.answer':
          'No plano Free, suas planilhas são processadas no navegador.',
        'pricingPage.faq.items.q3.question': 'Posso cancelar a qualquer momento?',
        'pricingPage.faq.items.q3.answer': 'Sim. Não há fidelidade nem taxa de cancelamento.',
        'pricingPage.faq.items.q4.question': 'Meus dados ficam seguros?',
        'pricingPage.faq.items.q4.answer':
          'Seus arquivos são descartados imediatamente após o download.',
        'pricingPage.faq.items.q5.question': 'Qual a diferença entre Free e Pro?',
        'pricingPage.faq.items.q5.answer':
          'O plano Free é ideal para testes rápidos com limites menores.',
        'pricingPage.faq.items.q6.question': 'Como funciona o plano Enterprise?',
        'pricingPage.faq.items.q6.answer':
          'Enterprise é para empresas com alto volume ou necessidades específicas.',
        'pricingPage.faq.items.q7.question': 'Quais formatos de arquivo são aceitos?',
        'pricingPage.faq.items.q7.answer':
          'O Tablix aceita arquivos CSV e XLSX (Excel). Você pode enviar até 3 arquivos por vez no plano Free e até 15 no Pro.',
      }
      return map[key] ?? key
    },
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_QUESTIONS = [
  'Posso testar antes de assinar?',
  'Como funciona o processamento local?',
  'Posso cancelar a qualquer momento?',
  'Meus dados ficam seguros?',
  'Qual a diferença entre Free e Pro?',
  'Como funciona o plano Enterprise?',
  'Quais formatos de arquivo são aceitos?',
]

const ALL_ANSWERS = [
  'Sim! O plano Free é gratuito e não exige cadastro.',
  'No plano Free, suas planilhas são processadas no navegador.',
  'Sim. Não há fidelidade nem taxa de cancelamento.',
  'Seus arquivos são descartados imediatamente após o download.',
  'O plano Free é ideal para testes rápidos com limites menores.',
  'Enterprise é para empresas com alto volume ou necessidades específicas.',
  'O Tablix aceita arquivos CSV e XLSX (Excel). Você pode enviar até 3 arquivos por vez no plano Free e até 15 no Pro.',
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PricingFAQ', () => {
  beforeEach(() => {
    mockReducedMotion = false
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('section and title', () => {
    it('renders the FAQ section title', () => {
      render(<PricingFAQ />)
      expect(screen.getByRole('heading', { name: 'Perguntas frequentes' })).toBeInTheDocument()
    })

    it('renders a <section> element', () => {
      const { container } = render(<PricingFAQ />)
      expect(container.querySelector('section')).not.toBeNull()
    })
  })

  describe('FAQ item list', () => {
    it('renders exactly 7 toggle buttons (one per FAQ item)', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      expect(buttons).toHaveLength(7)
    })

    it('renders all 7 question texts', () => {
      render(<PricingFAQ />)
      ALL_QUESTIONS.forEach((question) => {
        expect(screen.getByText(question)).toBeInTheDocument()
      })
    })

    it('answers are not visible when all items are collapsed', () => {
      render(<PricingFAQ />)
      ALL_ANSWERS.forEach((answer) => {
        expect(screen.queryByText(answer)).not.toBeInTheDocument()
      })
    })
  })

  // -------------------------------------------------------------------------
  // Accordion accessibility (aria-expanded)
  // -------------------------------------------------------------------------

  describe('aria-expanded state', () => {
    it('all buttons start with aria-expanded="false"', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('clicking a button sets aria-expanded to true', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
    })

    it('clicking an open button collapses it (toggle)', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
    })

    it('clicking a second item collapses the first (mutual exclusion)', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))

      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
      expect(buttons[1]).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(buttons[1])
      expect(buttons[1]).toHaveAttribute('aria-expanded', 'true')
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
    })

    it('all buttons remain collapsed when clicking through items sequentially', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))

      // Open each item one at a time; previous should collapse
      for (let i = 0; i < buttons.length; i++) {
        fireEvent.click(buttons[i])
        expect(buttons[i]).toHaveAttribute('aria-expanded', 'true')
        // All others must be collapsed
        buttons.forEach((btn, j) => {
          if (j !== i) {
            expect(btn).toHaveAttribute('aria-expanded', 'false')
          }
        })
      }
    })
  })

  // -------------------------------------------------------------------------
  // Content visibility on open/close
  // -------------------------------------------------------------------------

  describe('content visibility', () => {
    it('shows q1 answer when q1 is expanded', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(
        screen.getByText('Sim! O plano Free é gratuito e não exige cadastro.'),
      ).toBeInTheDocument()
    })

    it('shows q6 answer when q6 is expanded', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[5])
      expect(
        screen.getByText('Enterprise é para empresas com alto volume ou necessidades específicas.'),
      ).toBeInTheDocument()
    })

    it('hides answer after collapsing an open item', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(
        screen.getByText('Sim! O plano Free é gratuito e não exige cadastro.'),
      ).toBeInTheDocument()
      fireEvent.click(buttons[0])
      expect(
        screen.queryByText('Sim! O plano Free é gratuito e não exige cadastro.'),
      ).not.toBeInTheDocument()
    })

    it('shows correct answer for each of the 7 items', () => {
      render(<PricingFAQ />)

      ALL_ANSWERS.forEach((answer, index) => {
        // Re-query buttons each iteration since DOM may update
        const currentButtons = screen
          .getAllByRole('button')
          .filter((btn) => btn.hasAttribute('aria-expanded'))

        fireEvent.click(currentButtons[index])
        expect(screen.getByText(answer)).toBeInTheDocument()
        // Collapse before next iteration
        fireEvent.click(currentButtons[index])
      })
    })
  })

  // -------------------------------------------------------------------------
  // Reduced motion
  // -------------------------------------------------------------------------

  describe('reduced motion', () => {
    it('still renders expanded content when reduced motion is on', () => {
      mockReducedMotion = true
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(
        screen.getByText('Sim! O plano Free é gratuito e não exige cadastro.'),
      ).toBeInTheDocument()
    })

    it('toggle still works when reduced motion is on', () => {
      mockReducedMotion = true
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
      fireEvent.click(buttons[0])
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
    })
  })

  // -------------------------------------------------------------------------
  // i18n key completeness
  // -------------------------------------------------------------------------

  describe('i18n key coverage', () => {
    it('FAQ title does not fall back to raw key', () => {
      render(<PricingFAQ />)
      expect(screen.queryByText('pricingPage.faq.title')).not.toBeInTheDocument()
      expect(screen.getByText('Perguntas frequentes')).toBeInTheDocument()
    })

    it('question text does not fall back to raw keys', () => {
      render(<PricingFAQ />)
      // If any raw key leaks, it would appear as the button text
      for (let i = 1; i <= 7; i++) {
        expect(screen.queryByText(`pricingPage.faq.items.q${i}.question`)).not.toBeInTheDocument()
      }
    })

    it('answer text does not fall back to raw keys after expansion', () => {
      render(<PricingFAQ />)
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))

      buttons.forEach((btn, i) => {
        fireEvent.click(btn)
        expect(screen.queryByText(`pricingPage.faq.items.q${i + 1}.answer`)).not.toBeInTheDocument()
        fireEvent.click(btn)
      })
    })
  })
})
