'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUsage, formatFileSize } from '@/hooks/use-usage'
import { useFileParser } from '@/hooks/use-file-parser'
import { useLocale } from '@/lib/i18n'
import { trackEvent } from '@/lib/analytics/events'
import { fetchWithResilience, getCsrfToken } from '@/lib/fetch-client'
import { toastFetchError } from '@/lib/toast-error'
import { validateFile, validateFileContent, sanitizeFileName } from '@/lib/security'
import { env } from '@/config/env'
import { mergeSpreadsheets, canProcessClientSide, downloadBlob } from '@/lib/spreadsheet-merge'

export type UploadStep = 'upload' | 'columns' | 'result'

export type ProcessingPhase = 'consuming-quota' | 'merging' | 'generating' | 'downloading'

export interface ResultData {
  fileCount: number
  rowCount: number | null
  columnCount: number
}

export type PreviewRow = Record<string, string | number | boolean | null>

export interface UploadFlowState {
  files: File[]
  isUploading: boolean
  detectedColumns: string[]
  selectedColumns: string[]
  previewRows: PreviewRow[]
  isProcessing: boolean
  processingPhase: ProcessingPhase | null
  step: UploadStep
  unificationToken: string | null
  maxInputFiles: number
  maxTotalSize: number
  currentTotalSize: number
  resultData: ResultData | null
}

export interface UploadFlowActions {
  handleFilesAccepted: (files: File[]) => Promise<void>
  handleRemoveFile: (index: number) => void
  handleToggleColumn: (column: string) => void
  handleSelectAll: () => void
  handleDeselectAll: () => void
  handleProcess: () => Promise<void>
  handleUpload: () => Promise<void>
  handleStartOver: () => void
}

export function useUploadFlow() {
  const { t } = useLocale()
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsage()
  const { parseFile } = useFileParser()
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase | null>(null)
  const [step, setStep] = useState<UploadStep>('upload')
  const [unificationToken, setUnificationToken] = useState<string | null>(null)
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])

  const maxInputFiles = usage?.limits.maxInputFiles ?? 3
  const maxTotalSize = usage?.limits.maxTotalSize ?? 1 * 1024 * 1024
  const currentTotalSize = files.reduce((sum, file) => sum + file.size, 0)

  const handleFilesAccepted = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      return
    }

    const newFiles: File[] = []

    const totalFilesAfterAdd = files.length + selectedFiles.length
    if (totalFilesAfterAdd > maxInputFiles) {
      trackEvent('plan_limit_reached', { limitType: 'fileCount', usageBucket: 'at_limit' })
      toast.error(
        t('messages.tooManyFiles', {
          max: maxInputFiles,
          plan: usage?.plan.toUpperCase() ?? 'FREE',
        }),
      )
      return
    }

    for (const file of selectedFiles) {
      const safeName = sanitizeFileName(file.name)

      if (files.some((f) => f.name === file.name && f.size === file.size)) {
        toast.error(t('messages.fileAlreadyAdded', { name: safeName }))
        continue
      }

      if (usage && file.size > usage.limits.maxFileSize) {
        trackEvent('plan_limit_reached', { limitType: 'fileSize', usageBucket: 'at_limit' })
        toast.error(
          t('messages.fileTooLarge', {
            name: safeName,
            plan: usage.plan.toUpperCase(),
            size: formatFileSize(usage.limits.maxFileSize),
          }),
        )
        continue
      }

      const newTotalSize = currentTotalSize + newFiles.reduce((s, f) => s + f.size, 0) + file.size
      if (newTotalSize > maxTotalSize) {
        trackEvent('plan_limit_reached', { limitType: 'totalSize', usageBucket: 'at_limit' })
        toast.error(
          t('messages.totalSizeExceeded', {
            plan: usage?.plan.toUpperCase() ?? 'FREE',
            size: formatFileSize(maxTotalSize),
          }),
        )
        break
      }

      const basicValidation = validateFile(file)
      if (!basicValidation.valid) {
        if (env.NODE_ENV !== 'production') {
          console.error(`[validateFile] ${safeName}:`, basicValidation.error)
        }
        toast.error(`"${safeName}": ${t('errors.fileValidation')}`)
        continue
      }

      const contentValidation = await validateFileContent(file)
      if (!contentValidation.valid) {
        if (env.NODE_ENV !== 'production') {
          console.error(`[validateFileContent] ${safeName}:`, contentValidation.error)
        }
        toast.error(`"${safeName}": ${t('errors.fileContentValidation')}`)
        continue
      }

      newFiles.push(file)
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
      toast.success(
        newFiles.length === 1
          ? t('messages.fileAdded')
          : t('messages.filesAdded', { count: newFiles.length }),
      )
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleToggleColumn = (column: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((c) => c !== column)
      }
      const maxColumns = usage?.limits.maxColumns ?? 3
      if (prev.length >= maxColumns) {
        trackEvent('plan_limit_reached', { limitType: 'columns', usageBucket: 'at_limit' })
        toast.error(
          t('messages.tooManyColumns', {
            max: maxColumns,
            plan: usage?.plan.toUpperCase() ?? 'FREE',
          }),
        )
        return prev
      }
      return [...prev, column]
    })
  }

  const handleSelectAll = () => {
    const maxColumns = usage?.limits.maxColumns ?? 3
    setSelectedColumns(detectedColumns.slice(0, maxColumns))
  }

  const handleDeselectAll = () => {
    setSelectedColumns([])
  }

  const handleStartOver = () => {
    setStep('upload')
    setDetectedColumns([])
    setSelectedColumns([])
    setFiles([])
    setUnificationToken(null)
    setResultData(null)
    setProcessingPhase(null)
    setPreviewRows([])
  }

  const showFetchError = (err: unknown, fallbackKey: string) => toastFetchError(t, err, fallbackKey)

  const handleProcess = async () => {
    if (selectedColumns.length === 0) {
      toast.error(t('messages.selectAtLeastOneColumn'))
      return
    }

    if (usage && selectedColumns.length > usage.limits.maxColumns) {
      toast.error(
        t('messages.tooManyColumns', {
          max: usage.limits.maxColumns,
          plan: usage.plan.toUpperCase(),
        }),
      )
      return
    }

    if (!unificationToken) {
      toast.error(t('messages.processFailed'))
      return
    }

    setIsProcessing(true)
    setProcessingPhase('consuming-quota')

    const processingMode = canProcessClientSide(files, usage?.plan ?? 'free') ? 'client' : 'server'
    trackEvent('download_started', {
      fileCount: files.length,
      selectedColumns: selectedColumns.length,
      processingMode,
    })

    const processStartTime = performance.now()

    try {
      const useClientSide = processingMode === 'client'
      const addWatermark = usage?.plan === 'free'

      const consumeQuota = async () => {
        try {
          await fetchWithResilience('/api/unification/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: unificationToken }),
          })
          return true
        } catch (err) {
          showFetchError(err, 'messages.processFailed')
          return false
        }
      }

      if (useClientSide) {
        if (!(await consumeQuota())) return

        setProcessingPhase('merging')

        const result = await mergeSpreadsheets({
          files,
          selectedColumns,
          addWatermark,
          labels: {
            sheetName: t('export.sheetName'),
            watermarkColumn: t('export.watermarkColumn'),
            watermarkValue: t('export.watermarkValue'),
            aboutSheetName: t('export.aboutSheetName'),
            aboutHeaderInfo: t('export.aboutHeaderInfo'),
            aboutHeaderValue: t('export.aboutHeaderValue'),
            aboutGeneratedBy: t('export.aboutGeneratedBy'),
            aboutWebsite: t('export.aboutWebsite'),
            aboutPlan: t('export.aboutPlan'),
            aboutGeneratedAt: t('export.aboutGeneratedAt'),
            aboutTotalRows: t('export.aboutTotalRows'),
            aboutFilesUnified: t('export.aboutFilesUnified'),
            aboutUpgradeToPro: t('export.aboutUpgradeToPro'),
            aboutUpgradeMessage: t('export.aboutUpgradeMessage'),
          },
        })

        setProcessingPhase('downloading')
        downloadBlob(result.blob, result.filename)

        setResultData({
          fileCount: files.length,
          rowCount: result.rowCount,
          columnCount: selectedColumns.length,
        })

        trackEvent('download_completed', {
          fileCount: files.length,
          rowCount: result.rowCount,
          selectedColumns: selectedColumns.length,
          processingMode: 'client',
          processTimeMs: Math.round(performance.now() - processStartTime),
        })

        refetchUsage()
        setStep('result')
      } else {
        setProcessingPhase('merging')

        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))
        formData.append('columns', JSON.stringify(selectedColumns))
        formData.append('token', unificationToken)

        // /api/process returns a blob, not JSON — use fetch directly with timeout + CSRF
        const processController = new AbortController()
        const processTimeout = setTimeout(() => processController.abort(), 60_000)
        const csrfHeaders: Record<string, string> = {}
        const csrfToken = getCsrfToken()
        if (csrfToken) csrfHeaders['X-CSRF-Token'] = csrfToken

        try {
          const response = await fetch('/api/process', {
            method: 'POST',
            body: formData,
            headers: csrfHeaders,
            signal: processController.signal,
          })

          clearTimeout(processTimeout)

          if (!response.ok) {
            // Safe JSON parse — response might be HTML error page
            const data = await response.json().catch(() => ({}))
            // Never expose raw server error messages — use i18n fallback
            if (response.status === 429) {
              toast.error(t('errors.rateLimited'))
            } else {
              // Server errorCodes: only interpolate when we can safely extract params.
              // Backend may not send all fields i18n keys expect, so fallback is safe.
              if (
                (data.errorCode === 'LIMIT_EXCEEDED' || data.errorCode === 'PLAN_LIMIT_REACHED') &&
                (data.usage?.current != null || data.current != null) &&
                (data.usage?.max != null || data.max != null)
              ) {
                toast.error(
                  t('messages.unificationLimitExceeded', {
                    current: String(data.usage?.current ?? data.current),
                    max: String(data.usage?.max ?? data.max),
                  }),
                )
              } else {
                toast.error(t('messages.processFailed'))
              }
            }
            return
          }

          setProcessingPhase('downloading')
          const blob = await response.blob()
          const timestamp = new Date().toISOString().split('T')[0]
          downloadBlob(blob, `tablix-unificado-${timestamp}.xlsx`)
        } catch (processErr) {
          clearTimeout(processTimeout)
          if (processErr instanceof DOMException && processErr.name === 'AbortError') {
            toast.error(t('errors.timeout'))
          } else {
            showFetchError(processErr, 'messages.processFailed')
          }
          return
        }

        setResultData({
          fileCount: files.length,
          rowCount: null,
          columnCount: selectedColumns.length,
        })

        trackEvent('download_completed', {
          fileCount: files.length,
          rowCount: null,
          selectedColumns: selectedColumns.length,
          processingMode: 'server',
          processTimeMs: Math.round(performance.now() - processStartTime),
        })

        refetchUsage()
        setStep('result')
      }
    } catch (err) {
      if (env.NODE_ENV !== 'production') {
        console.error('[handleProcess]', err)
      }
      showFetchError(err, 'messages.processFailed')
    } finally {
      setIsProcessing(false)
      setProcessingPhase(null)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error(t('upload.selectAtLeastOne'))
      return
    }

    if (usage && usage.unifications.remaining <= 0) {
      trackEvent('plan_limit_reached', { limitType: 'unifications', usageBucket: 'at_limit' })
      toast.error(
        t('messages.unificationLimitExceeded', {
          current: usage.unifications.current,
          max: usage.unifications.max,
        }),
      )
      return
    }

    setIsUploading(true)

    const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)
    trackEvent('upload_started', { fileCount: files.length, totalSizeMB })

    const uploadStartTime = performance.now()

    try {
      const allColumns: Set<string>[] = []
      let totalRowCount = 0

      const parsingToastId = files.length > 1 ? 'parsing-progress' : undefined

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (files.length > 1) {
          toast.loading(
            t('messages.parsingFile', {
              current: i + 1,
              total: files.length,
              name: sanitizeFileName(file.name),
            }),
            { id: parsingToastId },
          )
        }

        const result = await parseFile(file)
        allColumns.push(new Set(result.columns))
        totalRowCount += result.rowCount

        if (i === 0 && result.preview) {
          setPreviewRows(result.preview.slice(0, 3))
        }
      }

      if (parsingToastId) {
        toast.dismiss(parsingToastId)
      }

      if (usage && totalRowCount > usage.limits.maxRows) {
        trackEvent('plan_limit_reached', { limitType: 'rows', usageBucket: 'at_limit' })
        toast.error(
          t('messages.rowsExceedLimit', {
            total: totalRowCount,
            max: usage.limits.maxRows,
            plan: usage.plan.toUpperCase(),
          }),
        )
        setIsUploading(false)
        return
      }

      let commonColumns: string[]
      if (allColumns.length === 1) {
        commonColumns = Array.from(allColumns[0])
      } else {
        const firstFileColumns = allColumns[0]
        commonColumns = Array.from(firstFileColumns).filter((col) =>
          allColumns.every((colSet) => colSet.has(col)),
        )
      }

      if (commonColumns.length === 0) {
        toast.error(t('messages.noCommonColumns'))
        setIsUploading(false)
        return
      }

      if (usage && commonColumns.length > usage.limits.maxColumns) {
        toast.info(
          t('messages.foundCommonColumns', {
            count: commonColumns.length,
            max: usage.limits.maxColumns,
            plan: usage.plan.toUpperCase(),
          }),
        )
      }

      toast.success(
        files.length === 1
          ? t('messages.parsedSuccessSingle', {
              columns: commonColumns.length,
              rows: totalRowCount,
            })
          : t('messages.parsedSuccessMultiple', {
              files: files.length,
              columns: commonColumns.length,
              rows: totalRowCount,
            }),
      )

      const previewFormData = new FormData()
      previewFormData.append('files', files[0])

      const { data: previewData } = await fetchWithResilience<{
        unificationToken: string
        columns: string[]
        usage: { current: number; max: number; remaining: number }
      }>('/api/preview', {
        method: 'POST',
        body: previewFormData,
        idempotent: true,
      })

      setUnificationToken(previewData.unificationToken)

      setDetectedColumns(commonColumns)
      const maxSelectable = usage?.limits.maxColumns ?? 3
      setSelectedColumns(commonColumns.slice(0, maxSelectable))
      setStep('columns')

      const fileTypes = [...new Set(files.map((f) => f.name.split('.').pop()?.toLowerCase() ?? ''))]
      trackEvent('upload_completed', {
        fileCount: files.length,
        totalSizeMB,
        fileTypes,
        parseTimeMs: Math.round(performance.now() - uploadStartTime),
        columnCount: commonColumns.length,
      })
      trackEvent('preview_generated', {
        columnCount: commonColumns.length,
        selectedColumns: Math.min(commonColumns.length, maxSelectable),
      })
    } catch (err) {
      if (env.NODE_ENV !== 'production') {
        console.error('[handleUpload]', err)
      }
      trackEvent('upload_error', {
        errorType: err instanceof Error ? err.name : 'unknown',
        fileCount: files.length,
      })
      showFetchError(err, 'upload.error')
    } finally {
      if (files.length > 1) {
        toast.dismiss('parsing-progress')
      }
      setIsUploading(false)
    }
  }

  return {
    // State
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

    // Actions
    handleFilesAccepted,
    handleRemoveFile,
    handleToggleColumn,
    handleSelectAll,
    handleDeselectAll,
    handleProcess,
    handleUpload,
    handleStartOver,
  }
}
