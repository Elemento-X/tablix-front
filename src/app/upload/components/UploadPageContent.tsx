'use client'

import { useEffect, useRef } from 'react'
import { LanguageSelector } from '@/components/language-selector'
import { Badge } from '@/components/badge'
import { GridBackground } from '@/components/grid-background'
import { StepIndicator } from '@/components/step-indicator'
import { StepTransition } from '@/components/step-transition'
import { useUploadFlow } from '@/hooks/use-upload-flow'
import { useLocale } from '@/lib/i18n'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { ColumnsStep } from './columns-step'
import { ResultStep } from './result-step'
import { UploadStep } from './upload-step'
import { UsageStatus } from './usage-status'

export function UploadPageContent() {
  const { t } = useLocale()
  const {
    files,
    isUploading,
    detectedColumns,
    selectedColumns,
    isProcessing,
    processingPhase,
    step,
    usage,
    isLoadingUsage,
    maxInputFiles,
    maxTotalSize,
    currentTotalSize,
    resultData,
    previewRows,
    handleFilesAccepted,
    handleRemoveFile,
    handleToggleColumn,
    handleProcess,
    handleUpload,
    handleStartOver,
    handleSelectAll,
    handleDeselectAll,
  } = useUploadFlow()

  const headingRef = useRef<HTMLHeadingElement>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const quotaExhausted =
    !isLoadingUsage && usage !== null && usage.unifications.remaining <= 0

  const stepDirection = step === 'upload' ? 'backward' : 'forward'

  function getStepTitle(): string {
    if (step === 'upload') return t('upload.title')
    if (step === 'columns') return t('columns.title')
    return t('result.title')
  }

  function getStepSubtitle(): string {
    if (step === 'upload') return t('upload.subtitle')
    if (step === 'columns') return t('columns.subtitle')
    return t('result.subtitle')
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">{t('upload.back')}</span>
            </Link>

            <Link href="/" className="text-foreground text-xl font-semibold">
              {t('header.brand')}
            </Link>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('pricing.plans.free.name')}</Badge>

              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16"
      >
        <GridBackground />

        <StepIndicator currentStep={step} />

        <div className="mb-8 text-center sm:mb-12">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-foreground text-2xl font-bold outline-none sm:text-3xl md:text-4xl"
          >
            {getStepTitle()}
          </h1>

          <p className="text-muted-foreground mt-3 text-base sm:mt-4 sm:text-lg">
            {getStepSubtitle()}
          </p>
        </div>

        {step !== 'result' && (
          <UsageStatus usage={usage} isLoading={isLoadingUsage} />
        )}

        {quotaExhausted && step === 'upload' && (
          <div className="border-destructive/50 bg-destructive/10 mb-6 flex items-start gap-3 rounded-lg border p-4">
            <TriangleAlert className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-foreground text-sm font-medium">
                {t('quotaGate.title')}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('quotaGate.description')}
              </p>
            </div>
          </div>
        )}

        <StepTransition stepKey={step} direction={stepDirection}>
          {step === 'upload' ? (
            <UploadStep
              files={files}
              isUploading={isUploading}
              maxInputFiles={maxInputFiles}
              maxTotalSize={maxTotalSize}
              currentTotalSize={currentTotalSize}
              quotaExhausted={quotaExhausted}
              onFilesAccepted={handleFilesAccepted}
              onRemoveFile={handleRemoveFile}
              onUpload={handleUpload}
            />
          ) : step === 'columns' ? (
            <ColumnsStep
              detectedColumns={detectedColumns}
              selectedColumns={selectedColumns}
              isProcessing={isProcessing}
              processingPhase={processingPhase}
              usage={usage}
              previewRows={previewRows}
              onToggleColumn={handleToggleColumn}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onProcess={handleProcess}
              onStartOver={handleStartOver}
            />
          ) : resultData ? (
            <ResultStep
              resultData={resultData}
              usage={usage}
              onStartOver={handleStartOver}
            />
          ) : null}
        </StepTransition>
      </main>
    </div>
  )
}
