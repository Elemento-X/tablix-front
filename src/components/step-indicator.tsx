'use client'

import { useLocale } from '@/lib/i18n'
import { Check } from 'lucide-react'
import type { UploadStep } from '@/hooks/use-upload-flow'

const STEPS: UploadStep[] = ['upload', 'columns', 'result']

const STEP_LABELS: Record<UploadStep, string> = {
  upload: 'steps.upload',
  columns: 'steps.columns',
  result: 'steps.result',
}

function getStepIndex(step: UploadStep): number {
  return STEPS.indexOf(step)
}

interface StepIndicatorProps {
  currentStep: UploadStep
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useLocale()
  const currentIndex = getStepIndex(currentStep)

  return (
    <nav aria-label={t('a11y.stepIndicator')} className="mb-8 sm:mb-12">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <li key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                    isCompleted
                      ? 'bg-teal-700 text-white'
                      : isCurrent
                        ? 'border-2 border-teal-700 bg-teal-700/10 text-teal-700 dark:text-teal-400'
                        : 'border-border text-muted-foreground border-2'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(STEP_LABELS[step])}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`mx-3 mb-5 h-0.5 w-12 sm:w-16 ${
                    index < currentIndex ? 'bg-teal-700' : 'bg-border'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
