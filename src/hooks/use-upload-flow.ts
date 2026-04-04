'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUsage, formatFileSize } from '@/hooks/use-usage'
import { useFileParser } from '@/hooks/use-file-parser'
import { useLocale } from '@/lib/i18n'
import {
  fetchWithResilience,
  FetchError,
  getCsrfToken,
} from '@/lib/fetch-client'
import {
  validateFile,
  validateFileContent,
  sanitizeFileName,
} from '@/lib/security'
import {
  mergeSpreadsheets,
  canProcessClientSide,
  downloadBlob,
} from '@/lib/spreadsheet-merge'

export type UploadStep = 'upload' | 'columns' | 'result'

export type ProcessingPhase =
  | 'consuming-quota'
  | 'merging'
  | 'generating'
  | 'downloading'

export interface ResultData {
  fileCount: number
  rowCount: number
  columnCount: number
}

export interface UploadFlowState {
  files: File[]
  isUploading: boolean
  detectedColumns: string[]
  selectedColumns: string[]
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
  const [processingPhase, setProcessingPhase] =
    useState<ProcessingPhase | null>(null)
  const [step, setStep] = useState<UploadStep>('upload')
  const [unificationToken, setUnificationToken] = useState<string | null>(null)
  const [resultData, setResultData] = useState<ResultData | null>(null)

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
        toast.error(
          t('messages.fileTooLarge', {
            name: safeName,
            plan: usage.plan.toUpperCase(),
            size: formatFileSize(usage.limits.maxFileSize),
          }),
        )
        continue
      }

      const newTotalSize =
        currentTotalSize + newFiles.reduce((s, f) => s + f.size, 0) + file.size
      if (newTotalSize > maxTotalSize) {
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
        toast.error(
          `"${safeName}": ${basicValidation.error || t('upload.error') || 'Invalid file'}`,
        )
        continue
      }

      const contentValidation = await validateFileContent(file)
      if (!contentValidation.valid) {
        toast.error(
          `"${safeName}": ${contentValidation.error || t('upload.error') || 'Invalid file content'}`,
        )
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
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    )
  }

  const handleSelectAll = () => {
    setSelectedColumns([...detectedColumns])
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
  }

  const toastFetchError = (err: unknown, fallbackKey: string) => {
    if (err instanceof FetchError) {
      const errorKeyMap: Record<string, string> = {
        offline: 'errors.offline',
        timeout: 'errors.timeout',
        server: 'errors.serverError',
        'rate-limit': 'errors.rateLimited',
      }
      toast.error(t(errorKeyMap[err.type] ?? fallbackKey))
    } else {
      toast.error(t(fallbackKey))
    }
  }

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

    try {
      const useClientSide = canProcessClientSide(files, usage?.plan ?? 'free')
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
          toastFetchError(err, 'messages.processFailed')
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
        const processTimeout = setTimeout(
          () => processController.abort(),
          60_000,
        )
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
              toast.error(
                data.errorCode
                  ? t(`messages.${data.errorCode}`, data)
                  : t('messages.processFailed'),
              )
            }
            return
          }

          setProcessingPhase('downloading')
          const blob = await response.blob()
          const timestamp = new Date().toISOString().split('T')[0]
          downloadBlob(blob, `tablix-unificado-${timestamp}.xlsx`)
        } catch (processErr) {
          clearTimeout(processTimeout)
          if (
            processErr instanceof DOMException &&
            processErr.name === 'AbortError'
          ) {
            toast.error(t('errors.timeout'))
          } else {
            toastFetchError(processErr, 'messages.processFailed')
          }
          return
        }

        setResultData({
          fileCount: files.length,
          rowCount: 0,
          columnCount: selectedColumns.length,
        })

        refetchUsage()
        setStep('result')
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[handleProcess]', err)
      }
      toastFetchError(err, 'messages.processFailed')
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
      toast.error(
        t('messages.unificationLimitExceeded', {
          current: usage.unifications.current,
          max: usage.unifications.max,
        }),
      )
      return
    }

    setIsUploading(true)

    try {
      const allColumns: Set<string>[] = []
      let totalRowCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        toast.info(
          t('messages.parsingFile', {
            current: i + 1,
            total: files.length,
            name: sanitizeFileName(file.name),
          }),
        )

        const result = await parseFile(file)
        allColumns.push(new Set(result.columns))
        totalRowCount += result.rowCount
      }

      if (usage && totalRowCount > usage.limits.maxRows) {
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
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[handleUpload]', err)
      }
      toastFetchError(err, 'upload.error')
    } finally {
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
