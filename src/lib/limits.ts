/**
 * Plan limits configuration for Tablix
 * Centralized configuration for upload limits, file size, rows, and columns
 */

export type PlanType = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  name: string

  // Unification limits (output)
  unificationsPerMonth: number

  // Input limits (per unification)
  maxInputFiles: number
  maxFileSize: number // in bytes (per file for Pro, total for Free)
  maxTotalSize: number // in bytes (sum of all input files)

  // Processing limits
  maxRows: number // total for Free, per file for Pro
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
    unificationsPerMonth: 1,
    maxInputFiles: 3,
    maxFileSize: 1 * 1024 * 1024, // 1MB (total, not per file)
    maxTotalSize: 1 * 1024 * 1024, // 1MB total
    maxRows: 500, // total across all input files
    maxColumns: 3,
    priorityProcessing: false,
    noWatermark: false,
    fileHistory: false,
  },

  pro: {
    name: 'Pro',
    unificationsPerMonth: 40,
    maxInputFiles: 15,
    maxFileSize: 2 * 1024 * 1024, // 2MB per file
    maxTotalSize: 30 * 1024 * 1024, // 30MB total (15 files x 2MB)
    maxRows: 5000, // per file
    maxColumns: 10,
    priorityProcessing: true,
    noWatermark: true,
    fileHistory: true,
    fileHistoryDays: 30,
  },

  enterprise: {
    name: 'Enterprise',
    unificationsPerMonth: Infinity, // Unlimited
    maxInputFiles: Infinity, // Unlimited
    maxFileSize: 50 * 1024 * 1024, // 50MB per file
    maxTotalSize: Infinity, // Unlimited
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
 * Check if unification count is within plan limits
 */
export function isUnificationAllowed(currentUnifications: number, plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return currentUnifications < limits.unificationsPerMonth
}

/**
 * Get remaining unifications for a plan
 */
export function getRemainingUnifications(currentUnifications: number, plan: PlanType): number {
  const limits = getPlanLimits(plan)
  const remaining = limits.unificationsPerMonth - currentUnifications
  return Math.max(0, remaining)
}

/**
 * Check if input file count is within plan limits
 */
export function isInputFilesAllowed(fileCount: number, plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return fileCount <= limits.maxInputFiles
}

/**
 * Check if total file size is within plan limits
 */
export function isTotalSizeAllowed(totalSize: number, plan: PlanType): boolean {
  const limits = getPlanLimits(plan)
  return totalSize <= limits.maxTotalSize
}
