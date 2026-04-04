'use client'

import { useState, useEffect } from 'react'
import {
  fetchWithResilience,
  FetchError,
  type FetchErrorType,
} from '@/lib/fetch-client'

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
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<FetchErrorType | null>(null)

  const fetchUsage = async () => {
    try {
      setIsLoading(true)
      const { data } = await fetchWithResilience<UsageInfo>('/api/usage')
      setUsage(data)
      setError(null)
      setErrorType(null)
    } catch (err) {
      if (err instanceof FetchError) {
        setError(err.message)
        setErrorType(err.type)
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setErrorType('unknown')
      }
      setUsage(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  return {
    usage,
    isLoading,
    error,
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
