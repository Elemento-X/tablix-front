'use client'

import type React from 'react'

import { LanguageSelector } from '@/components/language-selector'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatFileSize, useUsage } from '@/hooks/use-usage'
import { useLocale } from '@/lib/i18n'
import { validateFile, validateFileContent } from '@/lib/security'
import { AlertCircle, ArrowLeft, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function UploadPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsage()
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')

    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const selectedFiles = Array.from(e.target.files)

    if (selectedFiles.length > 1) {
      setError('Only 1 file allowed per upload')
      return
    }

    const file = selectedFiles[0]

    if (usage && file.size > usage.limits.maxFileSize) {
      setError(
        `File too large. Maximum file size for ${usage.plan.toUpperCase()} plan is ${formatFileSize(
          usage.limits.maxFileSize
        )}.`
      )
      return
    }

    const basicValidation = validateFile(file)
    if (!basicValidation.valid) {
      setError(basicValidation.error || t('upload.error') || 'Invalid file')
      return
    }

    const contentValidation = await validateFileContent(file)
    if (!contentValidation.valid) {
      setError(contentValidation.error || t('upload.error') || 'Invalid file content')
      return
    }

    setFiles([file])
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError(t('upload.selectAtLeastOne'))
      return
    }

    if (usage && usage.uploads.remaining <= 0) {
      setError(
        `Upload limit exceeded. You have used ${usage.uploads.current}/${usage.uploads.max} uploads this month.`
      )
      return
    }

    setIsUploading(true)
    setError('')

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
            setError(data.error || 'Upload limit exceeded for this month')
            refetchUsage()
          } else if (data.errorCode === 'FILE_TOO_LARGE') {
            setError(data.error || 'File size exceeds plan limit')
          } else {
            setError(data.error || 'Access denied')
          }
        } else {
          setError(data.error || t('upload.error'))
        }
        return
      }

      if (data.usage) {
        refetchUsage()
      }

      sessionStorage.setItem('detectedColumns', JSON.stringify(data.columns))
      sessionStorage.setItem('uploadedFiles', JSON.stringify(files.map((f) => f.name)))
      router.push('/columns')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.error'))
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
          <h1 className="text-4xl font-bold text-neutral-900">{t('upload.title')}</h1>

          <p className="mt-4 text-lg text-neutral-600">{t('upload.subtitle')}</p>
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

              {error && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
      </main>
    </div>
  )
}
