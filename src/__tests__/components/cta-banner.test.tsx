/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { CtaBanner } from '@/components/cta-banner'

// Mock framer-motion: passa-through sem animação
jest.mock('framer-motion', () => {
  const React = require('react')
  const forwardRef = React.forwardRef

  const Motion = (tag: string) =>
    forwardRef(
      (
        { children, ...props }: React.ComponentPropsWithRef<typeof tag>,
        ref: React.Ref<unknown>,
      ) => {
        // Remove props exclusivos do framer-motion para evitar warnings no DOM
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
          ...domProps
        } = props as Record<string, unknown>

        void initial
        void animate
        void exit
        void whileInView
        void whileHover
        void whileTap
        void transition
        void variants
        void viewport

        return React.createElement(tag, { ...domProps, ref }, children)
      },
    )

  return {
    motion: new Proxy(
      {},
      {
        get: (_: unknown, prop: string) => {
          if (prop === 'create') {
            // motion.create(Component) → wrapper transparente
            return (Component: React.ElementType) =>
              forwardRef(
                (
                  { children, ...props }: React.ComponentPropsWithRef<typeof Component>,
                  ref: React.Ref<unknown>,
                ) => {
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
                  } = props as Record<string, unknown>

                  void initial
                  void animate
                  void exit
                  void whileInView
                  void whileHover
                  void whileTap
                  void transition
                  void variants
                  void viewport

                  return React.createElement(Component, { ...rest, ref }, children)
                },
              )
          }
          return Motion(prop)
        },
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({ start: jest.fn() }),
  }
})

// Mock useReducedMotion
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: jest.fn().mockReturnValue(false),
}))

// Mock do Button para simplificar
jest.mock('@/components/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

describe('CtaBanner', () => {
  describe('variante inline', () => {
    it('renderiza o título', () => {
      render(<CtaBanner variant="inline" title="Comece agora" ctaLabel="Clique aqui" />)
      expect(screen.getByText('Comece agora')).toBeInTheDocument()
    })

    it('renderiza o ctaLabel como link', () => {
      render(<CtaBanner variant="inline" title="Texto base" ctaLabel="Ir para upload" />)
      const link = screen.getByText('Ir para upload').closest('a')
      expect(link).toBeInTheDocument()
    })

    it('usa href padrão /upload quando não informado', () => {
      render(<CtaBanner variant="inline" title="T" ctaLabel="Clique" />)
      const link = screen.getByText('Clique').closest('a')
      expect(link).toHaveAttribute('href', '/upload')
    })

    it('respeita href customizado', () => {
      render(<CtaBanner variant="inline" title="T" ctaLabel="Clique" href="/pricing" />)
      const link = screen.getByText('Clique').closest('a')
      expect(link).toHaveAttribute('href', '/pricing')
    })

    it('NÃO renderiza subtitle (prop ausente na interface inline)', () => {
      const { container } = render(<CtaBanner variant="inline" title="Título" ctaLabel="CTA" />)
      // Variante inline não tem subtítulo — apenas 1 parágrafo
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs).toHaveLength(1)
    })
  })

  describe('variante card', () => {
    const defaultCardProps = {
      variant: 'card' as const,
      title: 'Título do card',
      subtitle: 'Subtítulo do card',
      ctaLabel: 'Começar',
    }

    it('renderiza o título', () => {
      render(<CtaBanner {...defaultCardProps} />)
      expect(screen.getByText('Título do card')).toBeInTheDocument()
    })

    it('renderiza o subtítulo', () => {
      render(<CtaBanner {...defaultCardProps} />)
      expect(screen.getByText('Subtítulo do card')).toBeInTheDocument()
    })

    it('renderiza o botão CTA', () => {
      render(<CtaBanner {...defaultCardProps} />)
      expect(screen.getByRole('button', { name: 'Começar' })).toBeInTheDocument()
    })

    it('botão CTA está dentro de um link para /upload por padrão', () => {
      render(<CtaBanner {...defaultCardProps} />)
      const link = screen.getByRole('button', { name: 'Começar' }).closest('a')
      expect(link).toHaveAttribute('href', '/upload')
    })

    it('respeita href customizado', () => {
      render(<CtaBanner {...defaultCardProps} href="/pricing" />)
      const link = screen.getByRole('button', { name: 'Começar' }).closest('a')
      expect(link).toHaveAttribute('href', '/pricing')
    })

    it('renderiza título dentro de h3', () => {
      render(<CtaBanner {...defaultCardProps} />)
      expect(screen.getByRole('heading', { level: 3, name: 'Título do card' })).toBeInTheDocument()
    })
  })

  describe('variante final', () => {
    const defaultFinalProps = {
      variant: 'final' as const,
      title: 'Última chamada',
      subtitle: 'Subtítulo final',
      ctaLabel: 'Simplificar planilhas',
    }

    it('renderiza o título', () => {
      render(<CtaBanner {...defaultFinalProps} />)
      expect(screen.getByText('Última chamada')).toBeInTheDocument()
    })

    it('renderiza o subtítulo', () => {
      render(<CtaBanner {...defaultFinalProps} />)
      expect(screen.getByText('Subtítulo final')).toBeInTheDocument()
    })

    it('renderiza o botão CTA', () => {
      render(<CtaBanner {...defaultFinalProps} />)
      expect(screen.getByRole('button', { name: /Simplificar planilhas/i })).toBeInTheDocument()
    })

    it('link aponta para /upload por padrão', () => {
      render(<CtaBanner {...defaultFinalProps} />)
      const link = screen.getByRole('button', { name: /Simplificar planilhas/i }).closest('a')
      expect(link).toHaveAttribute('href', '/upload')
    })

    it('título renderizado em h2 (elemento section principal)', () => {
      render(<CtaBanner {...defaultFinalProps} />)
      expect(screen.getByRole('heading', { level: 2, name: 'Última chamada' })).toBeInTheDocument()
    })

    it('é um elemento <section> semanticamente correto', () => {
      const { container } = render(<CtaBanner {...defaultFinalProps} />)
      expect(container.querySelector('section')).toBeInTheDocument()
    })
  })

  describe('discriminated union — incompatibilidade de props', () => {
    it('variante inline não recebe subtitle — TypeScript enforça em compile time', () => {
      // Este teste documenta a intenção: inline não tem subtitle
      // A ausência de subtitle na interface é a garantia estática
      const { queryByText } = render(<CtaBanner variant="inline" title="T" ctaLabel="CTA" />)
      // Nenhum elemento com texto de subtitle esperado
      expect(queryByText('algum subtitle')).toBeNull()
    })
  })

  describe('reduced-motion', () => {
    const { useReducedMotion } = jest.requireMock('@/hooks/use-reduced-motion') as {
      useReducedMotion: jest.Mock
    }

    it('renderiza corretamente com reduced-motion ativo', () => {
      useReducedMotion.mockReturnValue(true)
      render(<CtaBanner variant="card" title="Título" subtitle="Sub" ctaLabel="CTA" />)
      expect(screen.getByText('Título')).toBeInTheDocument()
      useReducedMotion.mockReturnValue(false)
    })
  })
})
