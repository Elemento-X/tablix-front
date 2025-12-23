/**
 * Plan limits configuration for Tablix
 * Centralized configuration for upload limits, file size, rows, and columns
 */

export type PlanType = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  name: string

  // Upload limits
  uploadsPerMonth: number
  maxFileSize: number // in bytes

  // Processing limits
  maxRows: number
  maxColumns: number

  // Features
  priorityProcessing: boolean
  noWatermark: boolean
  fileHistory: boolean
  fileHistoryDays?: number
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    name: 'Free',
    uploadsPerMonth: 3,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxRows: 500,
    maxColumns: 3,
    priorityProcessing: false,
    noWatermark: false,
    fileHistory: false,
  },

  pro: {
    name: 'Pro',
    uploadsPerMonth: 20,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRows: 5000,
    maxColumns: 10,
    priorityProcessing: true,
    noWatermark: true,
    fileHistory: true,
    fileHistoryDays: 30,
  },

  enterprise: {
    name: 'Enterprise',
    uploadsPerMonth: Infinity, // Unlimited
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxRows: Infinity,
    maxColumns: Infinity,
    priorityProcessing: true,
    noWatermark: true,
    fileHistory: true,
    fileHistoryDays: 90,
  },
}

/**
 * Get plan limits by plan type
 */
export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan]
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if file size is within plan limits
 */
export function isFileSizeAllowed(fileSize: number, plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return fileSize <= limits.maxFileSize
}

/**
 * Check if upload count is within plan limits
 */
export function isUploadAllowed(currentUploads: number, plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return currentUploads < limits.uploadsPerMonth
}

/**
 * Get remaining uploads for a plan
 */
export function getRemainingUploads(currentUploads: number, plan: PlanType): number {
  const limits = getPlanLimits(plan)
  const remaining = limits.uploadsPerMonth - currentUploads
  return Math.max(0, remaining)
}
