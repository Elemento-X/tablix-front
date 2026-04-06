/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TablixLogo, TablixSymbol } from '@/components/tablix-logo'

// framer-motion não é usado em tablix-logo — sem necessidade de mock

describe('TablixLogo', () => {
  describe('defaults', () => {
    it('renderiza o símbolo SVG', () => {
      const { container } = render(<TablixLogo />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renderiza o wordmark "Tablix" por padrão', () => {
      render(<TablixLogo />)
      expect(screen.getByText('Tablix')).toBeInTheDocument()
    })

    it('SVG do símbolo é aria-hidden (decorativo)', () => {
      const { container } = render(<TablixLogo />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('showWordmark prop', () => {
    it('showWordmark=false esconde o wordmark', () => {
      render(<TablixLogo showWordmark={false} />)
      expect(screen.queryByText('Tablix')).not.toBeInTheDocument()
    })

    it('showWordmark=true (explícito) exibe o wordmark', () => {
      render(<TablixLogo showWordmark />)
      expect(screen.getByText('Tablix')).toBeInTheDocument()
    })
  })

  describe('symbolSize prop', () => {
    it('aplica symbolSize=20 no width e height do SVG', () => {
      const { container } = render(<TablixLogo symbolSize={20} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '20')
      expect(svg).toHaveAttribute('height', '20')
    })

    it('aplica symbolSize=48 no width e height do SVG', () => {
      const { container } = render(<TablixLogo symbolSize={48} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '48')
      expect(svg).toHaveAttribute('height', '48')
    })

    it('usa symbolSize padrão 28 quando não informado', () => {
      const { container } = render(<TablixLogo />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '28')
      expect(svg).toHaveAttribute('height', '28')
    })
  })

  describe('className prop', () => {
    it('aplica className customizado no wrapper', () => {
      const { container } = render(<TablixLogo className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('mantém classes base quando className é undefined', () => {
      const { container } = render(<TablixLogo />)
      expect(container.firstChild).toHaveClass('inline-flex', 'items-center', 'gap-2')
    })
  })

  describe('estrutura SVG do símbolo', () => {
    it('símbolo contém as 3 retângulos (linhas) e 1 círculo', () => {
      const { container } = render(<TablixLogo />)
      const rects = container.querySelectorAll('rect')
      const circles = container.querySelectorAll('circle')
      expect(rects).toHaveLength(3)
      expect(circles).toHaveLength(1)
    })
  })
})

describe('TablixSymbol (exportação named)', () => {
  it('renderiza como componente standalone', () => {
    const { container } = render(<TablixSymbol />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('aceita prop size customizado', () => {
    const { container } = render(<TablixSymbol size={36} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '36')
    expect(svg).toHaveAttribute('height', '36')
  })
})
