/**
 * Temporary File Manager
 * Handles cleanup of temporary files to prevent disk space issues
 * Note: In production, files should be processed in-memory when possible
 */

interface TempFileRecord {
  path: string
  createdAt: number
  expiresAt: number
}

class TempFileManager {
  private files: Map<string, TempFileRecord> = new Map()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup process
    this.startCleanup()
  }

  /**
   * Register a temporary file for tracking
   */
  register(fileId: string, path: string, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now()
    this.files.set(fileId, {
      path,
      createdAt: now,
      expiresAt: now + ttl,
    })
  }

  /**
   * Mark file as processed and ready for cleanup
   */
  markForCleanup(fileId: string): void {
    const record = this.files.get(fileId)
    if (record) {
      record.expiresAt = Date.now() // Expire immediately
    }
  }

  /**
   * Get file info
   */
  getFile(fileId: string): TempFileRecord | undefined {
    return this.files.get(fileId)
  }

  /**
   * Remove file from tracking
   */
  unregister(fileId: string): void {
    this.files.delete(fileId)
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return
    }

    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clean up expired files
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredFiles: string[] = []

    for (const [fileId, record] of this.files.entries()) {
      if (now > record.expiresAt) {
        expiredFiles.push(fileId)
      }
    }

    // Remove expired files from tracking
    for (const fileId of expiredFiles) {
      this.files.delete(fileId)
    }

    if (expiredFiles.length > 0) {
      console.log(`[TempFileManager] Cleaned up ${expiredFiles.length} expired file(s)`)
    }
  }

  /**
   * Get statistics
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now()
    let expired = 0

    for (const record of this.files.values()) {
      if (now > record.expiresAt) {
        expired++
      }
    }

    return {
      total: this.files.size,
      expired,
    }
  }

  /**
   * Force cleanup of all files
   */
  cleanupAll(): void {
    this.files.clear()
    console.log("[TempFileManager] All tracked files cleared")
  }
}

// Singleton instance
export const tempFileManager = new TempFileManager()

/**
 * Generate a secure random file ID
 */
export function generateFileId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`
}

/**
 * Validate file path to prevent path traversal
 */
export function validateFilePath(filePath: string): boolean {
  // Check for path traversal attempts
  if (filePath.includes("..")) {
    return false
  }

  // Check for absolute paths
  if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
    return false
  }

  return true
}
