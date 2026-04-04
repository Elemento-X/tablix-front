/**
 * @jest-environment jsdom
 *
 * Tests for src/app/pricing/components/ComparisonTable.tsx
 * Covers: rendering desktop table, mobile accordion, aria-expanded toggle,
 * all feature keys, all plan keys, reduced motion branch, i18n keys.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ComparisonTable } from '@/app/pricing/components/ComparisonTable'

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
        'pricingPage.comparison.title': 'Compare os planos',
        'pricingPage.comparison.features.sheetsPerMonth': 'Planilhas por mês',
        'pricingPage.comparison.features.maxRows': 'Linhas por planilha',
        'pricingPage.comparison.features.maxColumns': 'Colunas',
        'pricingPage.comparison.features.maxFileSize': 'Tamanho máx.',
        'pricingPage.comparison.features.processing': 'Processamento',
        'pricingPage.comparison.features.watermark': "Marca d'água",
        'pricingPage.comparison.features.fileHistory': 'Histórico',
        'pricingPage.comparison.features.support': 'Suporte',
        'pricingPage.comparison.features.infrastructure': 'Infraestrutura',
        'pricingPage.comparison.values.free.sheetsPerMonth': '1',
        'pricingPage.comparison.values.free.maxRows': '500',
        'pricingPage.comparison.values.free.maxColumns': '3',
        'pricingPage.comparison.values.free.maxFileSize': '1 MB',
        'pricingPage.comparison.values.free.processing': 'Local (navegador)',
        'pricingPage.comparison.values.free.watermark': 'Sim',
        'pricingPage.comparison.values.free.fileHistory': 'Não',
        'pricingPage.comparison.values.free.support': 'Comunidade',
        'pricingPage.comparison.values.free.infrastructure': 'Compartilhada',
        'pricingPage.comparison.values.pro.sheetsPerMonth': '40',
        'pricingPage.comparison.values.pro.maxRows': '5.000',
        'pricingPage.comparison.values.pro.maxColumns': '10',
        'pricingPage.comparison.values.pro.maxFileSize': '2 MB',
        'pricingPage.comparison.values.pro.processing': 'Servidor prioritário',
        'pricingPage.comparison.values.pro.watermark': 'Não',
        'pricingPage.comparison.values.pro.fileHistory': '30 dias',
        'pricingPage.comparison.values.pro.support': 'Suporte prioritário por email',
        'pricingPage.comparison.values.pro.infrastructure': 'Compartilhada',
        'pricingPage.comparison.values.enterprise.sheetsPerMonth': 'Personalizado',
        'pricingPage.comparison.values.enterprise.maxRows': 'Personalizado',
        'pricingPage.comparison.values.enterprise.maxColumns': 'Personalizado',
        'pricingPage.comparison.values.enterprise.maxFileSize': 'Personalizado',
        'pricingPage.comparison.values.enterprise.processing': 'Dedicado',
        'pricingPage.comparison.values.enterprise.watermark': 'Não',
        'pricingPage.comparison.values.enterprise.fileHistory': 'Personalizado',
        'pricingPage.comparison.values.enterprise.support': 'Dedicado + SLA',
        'pricingPage.comparison.values.enterprise.infrastructure': 'Dedicada',
        'pricing.plans.free.name': 'Free',
        'pricing.plans.pro.name': 'Pro',
        'pricing.plans.enterprise.name': 'Enterprise',
      }
      return map[key] ?? key
    },
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FEATURE_LABELS = [
  'Planilhas por mês',
  'Linhas por planilha',
  'Colunas',
  'Tamanho máx.',
  'Processamento',
  "Marca d'água",
  'Histórico',
  'Suporte',
  'Infraestrutura',
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComparisonTable', () => {
  beforeEach(() => {
    mockReducedMotion = false
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('section and title', () => {
    it('renders the comparison section title', () => {
      render(<ComparisonTable />)
      expect(screen.getByRole('heading', { name: 'Compare os planos' })).toBeInTheDocument()
    })

    it('renders a <section> element', () => {
      const { container } = render(<ComparisonTable />)
      expect(container.querySelector('section')).not.toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Desktop table (hidden md:block — rendered in DOM even on jsdom)
  // -------------------------------------------------------------------------

  describe('desktop table', () => {
    it('renders a <table> element', () => {
      render(<ComparisonTable />)
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders all 3 plan column headers', () => {
      render(<ComparisonTable />)
      // Table column headers (th) for plans
      const headers = screen.getAllByRole('columnheader')
      const texts = headers.map((h) => h.textContent?.trim())
      expect(texts).toContain('Free')
      expect(texts).toContain('Pro')
      expect(texts).toContain('Enterprise')
    })

    it('renders all 9 feature row labels', () => {
      render(<ComparisonTable />)
      FEATURE_LABELS.forEach((label) => {
        // The label appears in both desktop table and mobile accordion — getAllByText is fine
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('renders Free plan value for sheetsPerMonth', () => {
      render(<ComparisonTable />)
      // "1" appears as the free value for sheetsPerMonth — at least once in table cells
      const ones = screen.getAllByText('1')
      expect(ones.length).toBeGreaterThanOrEqual(1)
    })

    it('renders Pro plan value for sheetsPerMonth', () => {
      render(<ComparisonTable />)
      expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1)
    })

    it('renders Enterprise plan custom values', () => {
      render(<ComparisonTable />)
      const customValues = screen.getAllByText('Personalizado')
      // 7 enterprise features have "Personalizado" — sheetsPerMonth, maxRows, maxColumns, maxFileSize, fileHistory + 2 overlapping
      expect(customValues.length).toBeGreaterThanOrEqual(5)
    })
  })

  // -------------------------------------------------------------------------
  // Mobile accordion
  // -------------------------------------------------------------------------

  describe('mobile accordion', () => {
    it('renders 3 accordion toggle buttons (one per plan)', () => {
      render(<ComparisonTable />)
      // Buttons with aria-expanded exist in the mobile accordion section
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      expect(expandButtons).toHaveLength(3)
    })

    it('all accordion buttons start collapsed (aria-expanded=false)', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      expandButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('clicking a plan button sets aria-expanded to true', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      const freeButton = expandButtons[0]
      fireEvent.click(freeButton)
      expect(freeButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('clicking the same button twice collapses it (toggle)', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      const freeButton = expandButtons[0]
      fireEvent.click(freeButton)
      expect(freeButton).toHaveAttribute('aria-expanded', 'true')
      fireEvent.click(freeButton)
      expect(freeButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('clicking a second plan collapses the first one (mutual exclusion)', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      const [freeButton, proButton] = expandButtons

      fireEvent.click(freeButton)
      expect(freeButton).toHaveAttribute('aria-expanded', 'true')
      expect(proButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(proButton)
      expect(proButton).toHaveAttribute('aria-expanded', 'true')
      expect(freeButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('expanded panel renders feature values for the plan', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      // Expand Free plan
      fireEvent.click(expandButtons[0])
      // Free plan values should be visible
      expect(screen.getAllByText('Local (navegador)').length).toBeGreaterThanOrEqual(1)
    })

    it('plan names are rendered inside accordion buttons', () => {
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      const buttonTexts = expandButtons.map((btn) => btn.textContent)
      expect(buttonTexts.some((t) => t?.includes('Free'))).toBe(true)
      expect(buttonTexts.some((t) => t?.includes('Pro'))).toBe(true)
      expect(buttonTexts.some((t) => t?.includes('Enterprise'))).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Reduced motion
  // -------------------------------------------------------------------------

  describe('reduced motion', () => {
    it('expanded accordion panel still renders content when reduced motion is on', () => {
      mockReducedMotion = true
      render(<ComparisonTable />)
      const expandButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.hasAttribute('aria-expanded'))
      fireEvent.click(expandButtons[0])
      // Content must still be visible
      expect(screen.getAllByText('Local (navegador)').length).toBeGreaterThanOrEqual(1)
    })
  })

  // -------------------------------------------------------------------------
  // i18n key completeness — all keys resolve (not return the raw key)
  // -------------------------------------------------------------------------

  describe('i18n key coverage', () => {
    it('comparison title does not fall back to raw key', () => {
      render(<ComparisonTable />)
      expect(screen.queryByText('pricingPage.comparison.title')).not.toBeInTheDocument()
      expect(screen.getByText('Compare os planos')).toBeInTheDocument()
    })

    it('plan names do not fall back to raw keys', () => {
      render(<ComparisonTable />)
      expect(screen.queryByText('pricing.plans.free.name')).not.toBeInTheDocument()
      expect(screen.queryByText('pricing.plans.pro.name')).not.toBeInTheDocument()
      expect(screen.queryByText('pricing.plans.enterprise.name')).not.toBeInTheDocument()
    })
  })
})
