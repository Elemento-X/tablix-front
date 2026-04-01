/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepIndicator } from '@/components/step-indicator'
import type { UploadStep } from '@/hooks/use-upload-flow'

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'steps.upload': 'Upload',
        'steps.columns': 'Columns',
        'steps.result': 'Result',
        'a11y.stepIndicator': 'Flow progress',
      }
      return map[key] ?? key
    },
  }),
}))

jest.mock('lucide-react', () => ({
  Check: () => <svg data-testid="check-icon" />,
}))

describe('StepIndicator', () => {
  it('renders the nav with accessible label', () => {
    render(<StepIndicator currentStep="upload" />)
    expect(screen.getByRole('navigation', { name: 'Flow progress' })).toBeInTheDocument()
  })

  it('renders all 3 step labels', () => {
    render(<StepIndicator currentStep="upload" />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
  })

  describe('step: upload (index 0)', () => {
    it('marks upload step as current with aria-current=step', () => {
      render(<StepIndicator currentStep="upload" />)
      const steps = screen.getAllByRole('listitem')
      // First step circle div — contains aria-current
      const currentCircle = steps[0].querySelector('[aria-current="step"]')
      expect(currentCircle).not.toBeNull()
    })

    it('shows number 1 for current upload step (not checked)', () => {
      render(<StepIndicator currentStep="upload" />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.queryByTestId('check-icon')).toBeNull()
    })

    it('shows numbers 2 and 3 for future steps', () => {
      render(<StepIndicator currentStep="upload" />)
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('step: columns (index 1)', () => {
    it('shows check icon for completed upload step', () => {
      render(<StepIndicator currentStep="columns" />)
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    it('marks columns step as current with aria-current=step', () => {
      render(<StepIndicator currentStep="columns" />)
      const steps = screen.getAllByRole('listitem')
      const currentCircle = steps[1].querySelector('[aria-current="step"]')
      expect(currentCircle).not.toBeNull()
    })

    it('does NOT mark upload step as current', () => {
      render(<StepIndicator currentStep="columns" />)
      const steps = screen.getAllByRole('listitem')
      const uploadCircle = steps[0].querySelector('[aria-current="step"]')
      expect(uploadCircle).toBeNull()
    })
  })

  describe('step: result (index 2)', () => {
    it('shows 2 check icons for both completed steps', () => {
      render(<StepIndicator currentStep="result" />)
      expect(screen.getAllByTestId('check-icon')).toHaveLength(2)
    })

    it('marks result step as current with aria-current=step', () => {
      render(<StepIndicator currentStep="result" />)
      const steps = screen.getAllByRole('listitem')
      const currentCircle = steps[2].querySelector('[aria-current="step"]')
      expect(currentCircle).not.toBeNull()
    })

    it('does not show any number for completed steps (only check icons)', () => {
      render(<StepIndicator currentStep="result" />)
      // Only the current step (index 2) should show a number — but result step shows number 3
      expect(screen.getByText('3')).toBeInTheDocument()
      // Steps 0 and 1 should NOT show their numbers since they are completed
      expect(screen.queryByText('1')).toBeNull()
      expect(screen.queryByText('2')).toBeNull()
    })
  })

  it('renders connector lines between steps', () => {
    const { container } = render(<StepIndicator currentStep="upload" />)
    // There should be 2 connector divs (between 3 steps)
    const items = container.querySelectorAll('li')
    // Each li except last contains a connector; connector is a sibling div inside li
    // We verify at least 2 connectors exist by checking h-0.5 class
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors.length).toBe(2)
  })

  it('completed connector is teal-colored (bg-teal-700)', () => {
    const { container } = render(<StepIndicator currentStep="columns" />)
    // First connector (between upload and columns) should be teal since upload is completed
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors[0].className).toContain('bg-teal-700')
  })

  it('pending connector is stone-colored (not teal)', () => {
    const { container } = render(<StepIndicator currentStep="columns" />)
    // Second connector (between columns and result) should NOT be teal
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors[1].className).not.toContain('bg-teal-700')
  })

  it('all steps complete: all connectors are teal', () => {
    const { container } = render(<StepIndicator currentStep="result" />)
    const connectors = container.querySelectorAll('.h-0\\.5')
    connectors.forEach((connector) => {
      expect(connector.className).toContain('bg-teal-700')
    })
  })

  it.each<[UploadStep, string[]]>([
    ['upload', ['upload']],
    ['columns', ['upload', 'columns']],
    ['result', ['upload', 'columns', 'result']],
  ])('correct step labels visible for step=%s', (step, _labels) => {
    render(<StepIndicator currentStep={step} />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
