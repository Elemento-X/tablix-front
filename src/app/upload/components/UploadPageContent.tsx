'use client'

import { LanguageSelector } from '@/components/language-selector'
import { Badge } from '@/components/badge'
import { GridBackground } from '@/components/grid-background'
import { StepTransition } from '@/components/step-transition'
import { useUploadFlow } from '@/hooks/use-upload-flow'
import { useLocale } from '@/lib/i18n'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ColumnsStep } from './columns-step'
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
    step,
    usage,
    isLoadingUsage,
    maxInputFiles,
    maxTotalSize,
    currentTotalSize,
    handleFilesAccepted,
    handleRemoveFile,
    handleToggleColumn,
    handleProcess,
    handleUpload,
    handleStartOver,
    handleSelectAll,
    handleDeselectAll,
  } = useUploadFlow()

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

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
        <GridBackground />
        <div className="mb-8 text-center sm:mb-12">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl md:text-4xl">
            {step === 'upload' ? t('upload.title') : t('columns.title')}
          </h1>

          <p className="text-muted-foreground mt-3 text-base sm:mt-4 sm:text-lg">
            {step === 'upload' ? t('upload.subtitle') : t('columns.subtitle')}
          </p>
        </div>

        <UsageStatus usage={usage} isLoading={isLoadingUsage} />

        <StepTransition
          stepKey={step}
          direction={step === 'columns' ? 'forward' : 'backward'}
        >
          {step === 'upload' ? (
            <UploadStep
              files={files}
              isUploading={isUploading}
              maxInputFiles={maxInputFiles}
              maxTotalSize={maxTotalSize}
              currentTotalSize={currentTotalSize}
              onFilesAccepted={handleFilesAccepted}
              onRemoveFile={handleRemoveFile}
              onUpload={handleUpload}
            />
          ) : (
            <ColumnsStep
              detectedColumns={detectedColumns}
              selectedColumns={selectedColumns}
              isProcessing={isProcessing}
              usage={usage}
              onToggleColumn={handleToggleColumn}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onProcess={handleProcess}
              onStartOver={handleStartOver}
            />
          )}
        </StepTransition>
      </main>
    </div>
  )
}
