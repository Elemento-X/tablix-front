import type { NextRequest } from "next/server"
import { storage } from "./redis"
import { getUserFingerprint, getCurrentMonthKey, createUploadCountKey, getUserPlan } from "./fingerprint"
import { getPlanLimits, isUploadAllowed, getRemainingUploads, type PlanType } from "./limits"

export interface UploadCheckResult {
  allowed: boolean
  plan: PlanType
  currentUploads: number
  maxUploads: number
  remainingUploads: number
  error?: string
  errorCode?: "LIMIT_EXCEEDED" | "FILE_TOO_LARGE" | "PLAN_LIMIT_REACHED"
}

/**
 * Check if user can upload a file
 * Returns detailed information about usage and limits
 */
export async function checkUploadLimit(request: NextRequest): Promise<UploadCheckResult> {
  // Get user fingerprint and plan
  const { fingerprint } = getUserFingerprint(request)
  const plan = getUserPlan(request)
  const limits = getPlanLimits(plan)

  // Get current month key for tracking
  const monthKey = getCurrentMonthKey()
  const uploadKey = createUploadCountKey(fingerprint, monthKey)

  // Get current upload count from storage
  let currentUploads = (await storage.get(uploadKey)) || 0

  // Check if user has exceeded upload limit
  if (!isUploadAllowed(currentUploads, plan)) {
    return {
      allowed: false,
      plan,
      currentUploads,
      maxUploads: limits.uploadsPerMonth,
      remainingUploads: 0,
      error: `Upload limit exceeded. ${plan === "free" ? "Upgrade to Pro for more uploads." : "Contact support for enterprise plan."}`,
      errorCode: "LIMIT_EXCEEDED",
    }
  }

  return {
    allowed: true,
    plan,
    currentUploads,
    maxUploads: limits.uploadsPerMonth,
    remainingUploads: getRemainingUploads(currentUploads, plan),
  }
}

/**
 * Increment upload counter for user
 * Call this ONLY after successful file validation and upload
 */
export async function incrementUploadCount(request: NextRequest): Promise<number> {
  const { fingerprint } = getUserFingerprint(request)
  const monthKey = getCurrentMonthKey()
  const uploadKey = createUploadCountKey(fingerprint, monthKey)

  // Increment counter
  const newCount = await storage.incr(uploadKey)

  // Set expiration to end of next month (to ensure data cleanup)
  const now = new Date()
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
  const secondsUntilExpiry = Math.floor((endOfNextMonth.getTime() - now.getTime()) / 1000)

  await storage.expire(uploadKey, secondsUntilExpiry)

  return newCount
}

/**
 * Check if file size is within plan limits
 */
export function checkFileSizeLimit(fileSize: number, plan: PlanType): {
  allowed: boolean
  maxSize: number
  error?: string
  errorCode?: "FILE_TOO_LARGE"
} {
  const limits = getPlanLimits(plan)

  if (fileSize > limits.maxFileSize) {
    return {
      allowed: false,
      maxSize: limits.maxFileSize,
      error: `File too large. Maximum file size for ${limits.name} plan is ${formatBytes(limits.maxFileSize)}.`,
      errorCode: "FILE_TOO_LARGE",
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
  currentUploads: number
  maxUploads: number
  remainingUploads: number
  maxFileSize: number
  maxRows: number
  maxColumns: number
}> {
  const { fingerprint } = getUserFingerprint(request)
  const plan = getUserPlan(request)
  const limits = getPlanLimits(plan)

  const monthKey = getCurrentMonthKey()
  const uploadKey = createUploadCountKey(fingerprint, monthKey)

  const currentUploads = (await storage.get(uploadKey)) || 0

  return {
    plan,
    currentUploads,
    maxUploads: limits.uploadsPerMonth,
    remainingUploads: getRemainingUploads(currentUploads, plan),
    maxFileSize: limits.maxFileSize,
    maxRows: limits.maxRows,
    maxColumns: limits.maxColumns,
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
