/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { PaymentBadges } from '@/components/payment-badges'
import { LocaleProvider } from '@/lib/i18n'

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>)
}

describe('PaymentBadges', () => {
  describe('renderização dos 6 ícones', () => {
    it('renderiza exatamente 6 ícones SVG', () => {
      const { container } = renderWithLocale(<PaymentBadges />)
      // Cada ícone é um SVG dentro de um <span>
      const svgs = container.querySelectorAll('svg[role="img"]')
      expect(svgs).toHaveLength(6)
    })

    it('ícone Visa presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'Visa' })).toBeInTheDocument()
    })

    it('ícone Mastercard presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'Mastercard' })).toBeInTheDocument()
    })

    it('ícone American Express presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'American Express' })).toBeInTheDocument()
    })

    it('ícone Elo presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'Elo' })).toBeInTheDocument()
    })

    it('ícone Pix presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'Pix' })).toBeInTheDocument()
    })

    it('ícone Stripe presente com aria-label correto', () => {
      renderWithLocale(<PaymentBadges />)
      expect(screen.getByRole('img', { name: 'Stripe' })).toBeInTheDocument()
    })
  })

  describe('Trust Strip layout', () => {
    it('grupo de badges possui role="group" com aria-label i18n', () => {
      const { container } = renderWithLocale(<PaymentBadges />)
      const group = container.querySelector('[role="group"]')
      expect(group).toBeInTheDocument()
      // aria-label não deve ser a chave crua (deve ser traduzido)
      const ariaLabel = group?.getAttribute('aria-label') ?? ''
      expect(ariaLabel).not.toBe('paymentBadges.aria')
      expect(ariaLabel.length).toBeGreaterThan(0)
    })

    it('label de texto acima dos ícones é renderizado via i18n', () => {
      const { container } = renderWithLocale(<PaymentBadges />)
      // O label é um <p> acima do grupo
      const label = container.querySelector('p')
      expect(label).toBeInTheDocument()
      const text = label?.textContent ?? ''
      expect(text).not.toBe('paymentBadges.label')
      expect(text.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('cada badge SVG tem viewBox definido (integridade dos paths)', () => {
      const { container } = renderWithLocale(<PaymentBadges />)
      const svgs = container.querySelectorAll('svg[role="img"]')
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('viewBox')
      })
    })

    it('não renderiza texto acessível duplicado (aria-labels únicos)', () => {
      renderWithLocale(<PaymentBadges />)
      const brandNames = ['Visa', 'Mastercard', 'American Express', 'Elo', 'Pix', 'Stripe']
      const seen = new Set<string>()
      brandNames.forEach((name) => {
        expect(seen.has(name)).toBe(false)
        seen.add(name)
        // Confirma que cada nome aparece exatamente uma vez
        expect(screen.getAllByRole('img', { name })).toHaveLength(1)
      })
    })
  })
})
