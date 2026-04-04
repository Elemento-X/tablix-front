import type { NextRequest } from 'next/server'
import { storage } from './redis'
import {
  getUserFingerprint,
  getCurrentMonthKey,
  createUploadCountKey,
  getUserPlan,
} from './fingerprint'
import {
  getPlanLimits,
  isUnificationAllowed,
  getRemainingUnifications,
  type PlanType,
} from './limits'

export interface UnificationCheckResult {
  allowed: boolean
  plan: PlanType
  currentUnifications: number
  maxUnifications: number
  remainingUnifications: number
  error?: string
  errorCode?: 'LIMIT_EXCEEDED' | 'FILE_TOO_LARGE' | 'PLAN_LIMIT_REACHED'
}

/**
 * Check if user can create a unification
 * Returns detailed information about usage and limits
 */
export async function checkUnificationLimit(request: NextRequest): Promise<UnificationCheckResult> {
  // Get user fingerprint and plan
  const { fingerprint } = getUserFingerprint(request)
  const plan = getUserPlan(request)
  const limits = getPlanLimits(plan)

  // Get current month key for tracking
  const monthKey = getCurrentMonthKey()
  const unificationKey = createUploadCountKey(fingerprint, monthKey)

  // Get current unification count from storage
  const currentUnifications = (await storage.get(unificationKey)) || 0

  // Check if user has exceeded unification limit
  if (!isUnificationAllowed(currentUnifications, plan)) {
    return {
      allowed: false,
      plan,
      currentUnifications,
      maxUnifications: limits.unificationsPerMonth,
      remainingUnifications: 0,
      error: `Unification limit exceeded. ${plan === 'free' ? 'Upgrade to Pro for more unifications.' : 'Contact support for enterprise plan.'}`,
      errorCode: 'LIMIT_EXCEEDED',
    }
  }

  return {
    allowed: true,
    plan,
    currentUnifications,
    maxUnifications: limits.unificationsPerMonth,
    remainingUnifications: getRemainingUnifications(currentUnifications, plan),
  }
}

/**
 * Atomically check limit and increment unification counter
 * Uses Redis Lua script to prevent TOCTOU race conditions
 * Returns new count on success, or null if limit reached
 */
export async function atomicIncrementUnification(request: NextRequest): Promise<{
  success: boolean
  newCount: number
  plan: PlanType
  maxUnifications: number
}> {
  const { fingerprint } = getUserFingerprint(request)
  const plan = getUserPlan(request)
  const limits = getPlanLimits(plan)
  const monthKey = getCurrentMonthKey()
  const unificationKey = createUploadCountKey(fingerprint, monthKey)

  // Calculate TTL: end of next month
  const now = new Date()
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
  const ttlSeconds = Math.floor((endOfNextMonth.getTime() - now.getTime()) / 1000)

  const result = await storage.atomicCheckAndIncr(
    unificationKey,
    limits.unificationsPerMonth,
    ttlSeconds,
  )

  if (result === -1) {
    return {
      success: false,
      newCount: limits.unificationsPerMonth,
      plan,
      maxUnifications: limits.unificationsPerMonth,
    }
  }

  return {
    success: true,
    newCount: result,
    plan,
    maxUnifications: limits.unificationsPerMonth,
  }
}

/**
 * Check if file size is within plan limits
 */
export function checkFileSizeLimit(
  fileSize: number,
  plan: PlanType,
): {
  allowed: boolean
  maxSize: number
  error?: string
  errorCode?: 'FILE_TOO_LARGE'
} {
  const limits = getPlanLimits(plan)

  if (fileSize > limits.maxFileSize) {
    return {
      allowed: false,
      maxSize: limits.maxFileSize,
      error: `File too large. Maximum file size for ${limits.name} plan is ${formatBytes(limits.maxFileSize)}.`,
      errorCode: 'FILE_TOO_LARGE',
    }
  }

  return {
    allowed: true,
    maxSize: limits.maxFileSize,
  }
}

/**
 * Get current usage statistics for user
 */
export async function getUserUsage(request: NextRequest): Promise<{
  plan: PlanType
  currentUnifications: number
  maxUnifications: number
  remainingUnifications: number
  maxInputFiles: number
  maxFileSize: number
  maxTotalSize: number
  maxRows: number
  maxColumns: number
}> {
  const { fingerprint } = getUserFingerprint(request)
  const plan = getUserPlan(request)
  const limits = getPlanLimits(plan)

  const monthKey = getCurrentMonthKey()
  const unificationKey = createUploadCountKey(fingerprint, monthKey)

  const currentUnifications = (await storage.get(unificationKey)) || 0

  return {
    plan,
    currentUnifications,
    maxUnifications: limits.unificationsPerMonth,
    remainingUnifications: getRemainingUnifications(currentUnifications, plan),
    maxInputFiles: limits.maxInputFiles,
    maxFileSize: limits.maxFileSize,
    maxTotalSize: limits.maxTotalSize,
    maxRows: limits.maxRows,
    maxColumns: limits.maxColumns,
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
