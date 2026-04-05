'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchWithResilience, FetchError, type FetchErrorType } from '@/lib/fetch-client'
import { env } from '@/config/env'

export interface UsageInfo {
  plan: 'free' | 'pro' | 'enterprise'
  unifications: {
    current: number
    max: number
    remaining: number
  }
  limits: {
    maxInputFiles: number
    maxFileSize: number
    maxTotalSize: number
    maxRows: number
    maxColumns: number
  }
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorType, setErrorType] = useState<FetchErrorType | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data } = await fetchWithResilience<UsageInfo>('/api/usage')
      setUsage(data)
      setHasError(false)
      setErrorType(null)
    } catch (err) {
      if (env.NODE_ENV !== 'production') {
        console.error('[useUsage]', err)
      }
      setHasError(true)
      setErrorType(err instanceof FetchError ? err.type : 'unknown')
      setUsage(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  return {
    usage,
    isLoading,
    hasError,
    errorType,
    refetch: fetchUsage,
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
