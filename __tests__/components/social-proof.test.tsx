/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { SocialProof } from '@/components/social-proof'
import { LocaleProvider } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// framer-motion: render direto sem animação
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

// useReducedMotion: começa false (motion habilitado)
const mockUseReducedMotion = jest.fn().mockReturnValue(false)
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

// IntersectionObserver mock — por padrão não dispara intersecting
let intersectionCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null
const observeMock = jest.fn()
const disconnectMock = jest.fn()

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false)
  observeMock.mockClear()
  disconnectMock.mockClear()
  intersectionCallback = null

  window.IntersectionObserver = jest.fn().mockImplementation((cb) => {
    intersectionCallback = cb
    return {
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: jest.fn(),
    }
  }) as unknown as typeof IntersectionObserver
})

function renderSocialProof() {
  return render(
    <LocaleProvider>
      <SocialProof />
    </LocaleProvider>,
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerIntersection(isIntersecting: boolean) {
  act(() => {
    intersectionCallback?.([{ isIntersecting } as IntersectionObserverEntry])
  })
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('SocialProof', () => {
  describe('estrutura e acessibilidade', () => {
    it('renderiza o elemento <section> com aria-label i18n', () => {
      renderSocialProof()
      const section = screen.getByRole('region')
      expect(section).toBeInTheDocument()
      // aria-label não deve ser a chave crua
      const ariaLabel = section.getAttribute('aria-label') ?? ''
      expect(ariaLabel).not.toBe('socialProof.ariaLabel')
      expect(ariaLabel.length).toBeGreaterThan(0)
    })

    it('renderiza o heading da seção via i18n', () => {
      renderSocialProof()
      // "Por que confiar no Tablix" (pt-BR default)
      const heading = screen.getByText(
        (text) => text.includes('confiar') || text.includes('trust') || text.includes('confiar'),
      )
      expect(heading).toBeInTheDocument()
    })

    it('renderiza separadores decorativos entre métricas (aria-hidden=true)', () => {
      const { container } = renderSocialProof()
      // Separadores têm role="separator" + aria-hidden="true" (decorativos, excluídos da árvore acessível)
      // Testing Library ignora aria-hidden → usar querySelector direto
      const separators = container.querySelectorAll('[role="separator"]')
      // 2 gaps × 2 separadores por gap (mobile + desktop) = 4 total
      expect(separators.length).toBe(4)
      separators.forEach((sep) => {
        expect(sep).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('métricas — valores alvo', () => {
    it('métrica zeroStorage tem aria-label "0" (target = 0)', () => {
      renderSocialProof()
      // target=0 → valor imediatamente setado; aria-label="${target}${suffix}" = "0"
      expect(
        screen.getByRole('paragraph', { hidden: true, name: '0' }) ||
          document.querySelector('[aria-label="0"]'),
      ).toBeTruthy()
      // Verifica que existe elemento com aria-label="0"
      expect(document.querySelector('[aria-label="0"]')).toBeInTheDocument()
    })

    it('métrica localProcessing tem aria-label "100%" (target = 100)', () => {
      renderSocialProof()
      expect(document.querySelector('[aria-label="100%"]')).toBeInTheDocument()
    })

    it('métrica formats tem aria-label "3" (target = 3)', () => {
      renderSocialProof()
      expect(document.querySelector('[aria-label="3"]')).toBeInTheDocument()
    })

    it('renderiza labels das 3 métricas via i18n', () => {
      renderSocialProof()
      // Verifica que nenhuma chave crua vaza para o DOM
      const rawKeys = [
        'socialProof.metrics.zeroStorage.label',
        'socialProof.metrics.localProcessing.label',
        'socialProof.metrics.formats.label',
      ]
      rawKeys.forEach((key) => {
        expect(screen.queryByText(key)).not.toBeInTheDocument()
      })
    })
  })

  describe('reduced-motion behavior', () => {
    it('com reduced-motion ativo, zeroStorage já nasce com valor 0', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderSocialProof()
      // target=0 com ou sem reduced-motion → exibe 0
      expect(document.querySelector('[aria-label="0"]')).toBeInTheDocument()
    })

    it('com reduced-motion ativo, localProcessing já nasce com 100 (sem rAF)', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderSocialProof()
      // Com prefersReducedMotion=true, useState é inicializado direto no target
      expect(document.querySelector('[aria-label="100%"]')).toBeInTheDocument()
    })

    it('com reduced-motion ativo, formats já nasce com 3 (sem rAF)', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderSocialProof()
      expect(document.querySelector('[aria-label="3"]')).toBeInTheDocument()
    })

    it('com reduced-motion desativo, IntersectionObserver é registrado', () => {
      mockUseReducedMotion.mockReturnValue(false)
      renderSocialProof()
      // target=100 e target=3 precisam de observer; target=0 não (atalho no effect)
      expect(observeMock).toHaveBeenCalled()
    })

    it('com reduced-motion ativo, IntersectionObserver NÃO é registrado para targets > 0', () => {
      mockUseReducedMotion.mockReturnValue(true)
      renderSocialProof()
      // prefersReducedMotion=true → effect retorna antes de criar observer
      expect(observeMock).not.toHaveBeenCalled()
    })
  })

  describe('count-up animation via IntersectionObserver', () => {
    it('métrica com target=0 não registra observer (atalho de performance)', () => {
      mockUseReducedMotion.mockReturnValue(false)
      renderSocialProof()
      // zeroStorage (target=0) → effect sai antes de criar observer
      // Os outros 2 métricas (target=100, target=3) criam observers → 2 calls
      expect(observeMock).toHaveBeenCalledTimes(2)
    })

    it('observer é desconectado no cleanup (sem memory leak)', () => {
      mockUseReducedMotion.mockReturnValue(false)
      const { unmount } = renderSocialProof()
      unmount()
      expect(disconnectMock).toHaveBeenCalled()
    })

    it('hasAnimated impede re-trigger: observer desconecta após primeira intersecção', () => {
      mockUseReducedMotion.mockReturnValue(false)
      renderSocialProof()
      // Simula elemento entrando no viewport
      triggerIntersection(true)
      // Após animação disparada, observer.disconnect() deve ser chamado internamente
      // (além dos chamados de cleanup de unmount — aqui testamos que disconnect foi chamado)
      expect(disconnectMock).toHaveBeenCalled()
    })

    it('isIntersecting=false não dispara a animação', () => {
      mockUseReducedMotion.mockReturnValue(false)
      renderSocialProof()
      const callsBefore = disconnectMock.mock.calls.length
      triggerIntersection(false)
      // disconnect não deve ter sido chamado ADICIONALMENTE pelo observer callback
      expect(disconnectMock.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('dark mode — classes CSS', () => {
    it('section tem classes de background para dark mode', () => {
      renderSocialProof()
      const section = screen.getByRole('region')
      expect(section.className).toMatch(/dark:/)
    })
  })
})
