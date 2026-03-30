'use client'

import { useCallback, useId, useState } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
  accept?: Accept
  currentFileCount?: number
  className?: string
}

export function FileDropzone({
  onFilesAccepted,
  maxFiles,
  disabled = false,
  accept = {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
      '.xlsx',
    ],
  },
  currentFileCount = 0,
  className,
}: FileDropzoneProps) {
  const { t } = useLocale()
  const hintId = useId()
  const [flashActive, setFlashActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles)
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 300)
      }
    },
    [onFilesAccepted],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles ? maxFiles - currentFileCount : undefined,
    disabled,
    noClick: false,
    noKeyboard: false,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-12 transition-all',
        isDragActive
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20'
          : flashActive
            ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/10'
            : 'bg-background border-stone-300 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-900',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      role="button"
      aria-label={t('upload.dropzone')}
      aria-describedby={hintId}
      tabIndex={0}
    >
      <input {...getInputProps()} />
      <Upload
        className={cn(
          'h-8 w-8 transition-colors',
          isDragActive
            ? 'text-teal-700 dark:text-teal-400'
            : 'text-muted-foreground',
        )}
      />
      <div className="text-center">
        <span
          className={cn(
            'block text-base font-medium',
            isDragActive
              ? 'text-teal-700 dark:text-teal-400'
              : 'text-foreground',
          )}
        >
          {isDragActive
            ? t('dropzone.dragActive')
            : currentFileCount > 0
              ? `${currentFileCount} ${t('upload.dropzoneWithFiles')}`
              : t('upload.dropzone')}
        </span>
        <span id={hintId} className="text-muted-foreground mt-2 block text-sm">
          {t('upload.maxSize')}
        </span>
      </div>
    </div>
  )
}
