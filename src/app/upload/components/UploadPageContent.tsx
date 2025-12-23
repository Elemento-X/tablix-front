'use client'

import type React from 'react'

import { LanguageSelector } from '@/components/language-selector'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { Input } from './input'
import { formatFileSize, useUsage } from '@/hooks/use-usage'
import { useLocale } from '@/lib/i18n'
import { validateFile, validateFileContent } from '@/lib/security'
import { ArrowLeft, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function UploadPageContent() {
  const router = useRouter()
  const { t } = useLocale()
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsage()
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'upload' | 'columns'>('upload')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const selectedFiles = Array.from(e.target.files)

    if (selectedFiles.length > 1) {
      toast.error('Only 1 file allowed per upload')
      return
    }

    const file = selectedFiles[0]

    if (usage && file.size > usage.limits.maxFileSize) {
      toast.error(
        `File too large. Maximum file size for ${usage.plan.toUpperCase()} plan is ${formatFileSize(
          usage.limits.maxFileSize
        )}.`
      )
      return
    }

    const basicValidation = validateFile(file)
    if (!basicValidation.valid) {
      toast.error(basicValidation.error || t('upload.error') || 'Invalid file')
      return
    }

    const contentValidation = await validateFileContent(file)
    if (!contentValidation.valid) {
      toast.error(contentValidation.error || t('upload.error') || 'Invalid file content')
      return
    }

    setFiles([file])
    toast.success('File selected successfully')
  }

  const handleToggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    )
  }

  const handleProcess = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column')
      return
    }

    if (usage && selectedColumns.length > usage.limits.maxColumns) {
      toast.error(
        `Too many columns selected. Maximum ${usage.limits.maxColumns} columns for ${usage.plan.toUpperCase()} plan.`
      )
      return
    }

    setIsProcessing(true)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('columns', JSON.stringify(selectedColumns))

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to process file')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tablix-output.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('File processed successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error(t('upload.selectAtLeastOne'))
      return
    }

    if (usage && usage.uploads.remaining <= 0) {
      toast.error(
        `Upload limit exceeded. You have used ${usage.uploads.current}/${usage.uploads.max} uploads this month.`
      )
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          if (data.errorCode === 'LIMIT_EXCEEDED') {
            toast.error(data.error || 'Upload limit exceeded for this month')
            refetchUsage()
          } else if (data.errorCode === 'FILE_TOO_LARGE') {
            toast.error(data.error || 'File size exceeds plan limit')
          } else {
            toast.error(data.error || 'Access denied')
          }
        } else {
          toast.error(data.error || t('upload.error'))
        }
        return
      }

      if (data.usage) {
        refetchUsage()
      }

      toast.success('File uploaded successfully!')
      setDetectedColumns(data.columns || [])
      setSelectedColumns(data.columns || [])
      setStep('columns')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('upload.error'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">{t('upload.back') || 'Voltar'}</span>
            </Link>

            <Link href="/" className="text-xl font-semibold text-neutral-900">
              {t('header.brand')}
            </Link>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
                {t('pricing.plans.free.name')}
              </Badge>

              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900">
            {step === 'upload' ? t('upload.title') : 'Select Columns'}
          </h1>

          <p className="mt-4 text-lg text-neutral-600">
            {step === 'upload'
              ? t('upload.subtitle')
              : 'Choose which columns to include in your processed file'}
          </p>
        </div>

        {usage && !isLoadingUsage && (
          <Card className="border-neutral-200 mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <section className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-900">
                      Plan: {usage.plan.toUpperCase()}
                    </span>

                    <span className="text-sm font-medium text-neutral-900">
                      {usage.uploads.remaining}/{usage.uploads.max} uploads remaining
                    </span>
                  </div>

                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usage.uploads.remaining === 1
                          ? 'bg-red-500'
                          : usage.uploads.remaining <= 2
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(usage.uploads.remaining / usage.uploads.max) * 100}%` }}
                    />
                  </div>

                  <p className="text-xs text-neutral-600 mt-2">
                    Max file size: {formatFileSize(usage.limits.maxFileSize)} • Max{' '}
                    {usage.limits.maxRows} rows • Max {usage.limits.maxColumns} columns
                  </p>
                </div>
              </section>
            </CardContent>
          </Card>
        )}

{step === 'upload' && (
          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <section className="flex flex-col items-center gap-6">
                <div className="rounded-full bg-neutral-100 p-4">
                  <FileSpreadsheet className="h-8 w-8 text-neutral-700" />
                </div>

                <div className="w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 bg-white p-12 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <Upload className="h-8 w-8 text-neutral-600" />
                    <div className="text-center">
                      <span className="text-base font-medium text-neutral-700 block">
                        {files.length > 0
                          ? `${files.length} ${t('upload.dropzoneWithFiles')}`
                          : t('upload.dropzone')}
                      </span>
                      <span className="text-sm text-neutral-500 mt-2 block">
                        {t('upload.maxSize')}
                      </span>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".csv,.xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="w-full space-y-2 bg-neutral-50 rounded-lg p-4">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <FileSpreadsheet className="h-4 w-4 text-neutral-600" />
                        <span className="truncate text-neutral-900 flex-1">{file.name}</span>
                        <span className="text-xs text-neutral-500">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="w-full text-center py-4">
                  <p className="text-sm text-neutral-600">{t('upload.securityNote')}</p>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-12"
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
        )}

        {step === 'columns' && (
          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <section className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Detected Columns ({detectedColumns.length})
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {selectedColumns.length} of {detectedColumns.length} columns selected
                      {usage && ` (max ${usage.limits.maxColumns})`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep('upload')
                      setDetectedColumns([])
                      setSelectedColumns([])
                      setFiles([])
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                  {detectedColumns.map((column) => (
                    <button
                      key={column}
                      onClick={() => handleToggleColumn(column)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedColumns.includes(column)
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedColumns.includes(column)
                            ? 'border-white bg-white'
                            : 'border-neutral-300'
                        }`}
                      >
                        {selectedColumns.includes(column) && (
                          <div className="w-2 h-2 bg-neutral-900 rounded-sm" />
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{column}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedColumns([])}
                    className="flex-1"
                    disabled={selectedColumns.length === 0}
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedColumns([...detectedColumns])}
                    className="flex-1"
                    disabled={selectedColumns.length === detectedColumns.length}
                  >
                    Select All
                  </Button>
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={selectedColumns.length === 0 || isProcessing}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-12"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process & Download'
                  )}
                </Button>
              </section>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
