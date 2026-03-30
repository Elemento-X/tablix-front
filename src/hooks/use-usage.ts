'use client'

import { useState, useEffect } from 'react'

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

  const fetchUsage = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/usage')

      if (!response.ok) {
        throw new Error('Failed to fetch usage')
      }

      const data = await response.json()
      setUsage(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
