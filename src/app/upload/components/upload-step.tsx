'use client'

import { AnimatedList, AnimatedListItem } from '@/components/animated-list'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { FileDropzone } from '@/components/file-dropzone'
import { formatFileSize } from '@/hooks/use-usage'
import { useLocale } from '@/lib/i18n'
import { sanitizeFileName } from '@/lib/security'
import { FileSpreadsheet, Loader2, X } from 'lucide-react'

interface UploadStepProps {
  files: File[]
  isUploading: boolean
  maxInputFiles: number
  maxTotalSize: number
  currentTotalSize: number
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
  onFilesAccepted,
  onRemoveFile,
  onUpload,
}: UploadStepProps) {
  const { t } = useLocale()

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-8">
        <section className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="bg-muted rounded-full p-4">
            <FileSpreadsheet className="h-8 w-8 text-stone-700 dark:text-stone-300" />
          </div>

          <div className="w-full">
            <FileDropzone
              onFilesAccepted={onFilesAccepted}
              maxFiles={maxInputFiles}
              currentFileCount={files.length}
              disabled={isUploading}
            />
          </div>

          {files.length > 0 && (
            <div data-testid="file-list" className="bg-muted w-full space-y-2 rounded-lg p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {files.length} {t('columns.of')} {maxInputFiles} {t('status.files')}
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
            <p className="text-muted-foreground text-sm">{t('upload.securityNote')}</p>
          </div>

          <Button
            data-testid="btn-continue"
            variant="brand"
            onClick={onUpload}
            disabled={files.length === 0 || isUploading}
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
