'use client'

import { useState, useEffect } from 'react'
import { AnimatedList, AnimatedListItem } from '@/components/animated-list'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { FileDropzone } from '@/components/file-dropzone'
import { formatFileSize } from '@/hooks/use-usage'
import { useLocale } from '@/lib/i18n'
import { sanitizeFileName } from '@/lib/security'
import { FileSpreadsheet, Loader2, X, Lightbulb } from 'lucide-react'

const ONBOARDING_KEY = 'tablix-onboarding-upload-seen'

interface UploadStepProps {
  files: File[]
  isUploading: boolean
  maxInputFiles: number
  maxTotalSize: number
  currentTotalSize: number
  quotaExhausted: boolean
  onFilesAccepted: (files: File[]) => Promise<void>
  onRemoveFile: (index: number) => void
  onUpload: () => Promise<void>
}

export function UploadStep({
  files,
  isUploading,
  maxInputFiles,
  maxTotalSize,
  currentTotalSize,
  quotaExhausted,
  onFilesAccepted,
  onRemoveFile,
  onUpload,
}: UploadStepProps) {
  const { t } = useLocale()
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY)
    if (!seen) {
      setShowTip(true)
    }
  }, [])

  const dismissTip = () => {
    setShowTip(false)
    localStorage.setItem(ONBOARDING_KEY, '1')
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-8">
        <section className="flex flex-col items-center gap-4 sm:gap-6">
          {showTip && (
            <div className="flex w-full items-start gap-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-800 dark:bg-teal-950/20">
              <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-700 dark:text-teal-400" />
              <p className="text-foreground flex-1 text-sm">
                {t('onboarding.tipUpload')}
              </p>
              <button
                type="button"
                onClick={dismissTip}
                className="text-muted-foreground hover:text-foreground text-xs font-medium"
              >
                {t('onboarding.gotIt')}
              </button>
            </div>
          )}

          <div className="bg-muted rounded-full p-4">
            <FileSpreadsheet className="text-foreground/80 h-8 w-8" />
          </div>

          <div className="w-full">
            <FileDropzone
              onFilesAccepted={onFilesAccepted}
              maxFiles={maxInputFiles}
              currentFileCount={files.length}
              disabled={isUploading || quotaExhausted}
            />
          </div>

          {files.length > 0 && (
            <div
              data-testid="file-list"
              className="bg-muted w-full space-y-2 rounded-lg p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-foreground/80 text-sm font-medium">
                  {files.length} {t('columns.of')} {maxInputFiles}{' '}
                  {t('status.files')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(currentTotalSize)} {t('columns.of')}{' '}
                  {formatFileSize(maxTotalSize)}
                </span>
              </div>
              <AnimatedList className="space-y-2">
                {files.map((file, index) => (
                  <AnimatedListItem
                    key={`${file.name}-${file.size}`}
                    data-testid="file-item"
                    className="border-border bg-card flex items-center gap-3 rounded-md border p-2 text-sm"
                  >
                    <FileSpreadsheet className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <span className="text-foreground flex-1 truncate">
                      {sanitizeFileName(file.name)}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0 text-xs">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(index)}
                      className="hover:bg-muted flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0 sm:p-1"
                      aria-label={`${t('a11y.removeFile')} ${sanitizeFileName(file.name)}`}
                    >
                      <X className="text-muted-foreground h-4 w-4 hover:text-red-500" />
                    </button>
                  </AnimatedListItem>
                ))}
              </AnimatedList>
              {files.length < maxInputFiles && (
                <p className="text-muted-foreground pt-2 text-center text-xs">
                  {t('status.clickToAddMore')}
                </p>
              )}
            </div>
          )}

          <div className="w-full py-4 text-center">
            <p className="text-muted-foreground text-sm">
              {t('upload.securityNote')}
            </p>
          </div>

          <Button
            data-testid="btn-continue"
            variant="brand"
            onClick={onUpload}
            disabled={files.length === 0 || isUploading || quotaExhausted}
            className="h-12 w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('upload.processing')}
              </>
            ) : (
              t('upload.continue')
            )}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}
