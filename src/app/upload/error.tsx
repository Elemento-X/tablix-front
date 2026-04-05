'use client'

import { ErrorDisplay } from '@/components/error-display'

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      logPrefix="UploadErrorBoundary"
      titleKey="errorBoundary.uploadTitle"
      descriptionKey="errorBoundary.uploadDescription"
    />
  )
}
