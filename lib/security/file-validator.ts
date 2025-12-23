const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(file: File): ValidationResult {
  // Check file size
  if (file.size === 0) {
    return { valid: false, error: "File is empty" }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
    }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid MIME type. Expected CSV or Excel file.`,
    }
  }

  // Check for suspicious file names
  if (containsSuspiciousPatterns(fileName)) {
    return {
      valid: false,
      error: "File name contains suspicious patterns",
    }
  }

  return { valid: true }
}

export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "")

  // Remove or replace special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_")

  // Prevent hidden files
  if (sanitized.startsWith(".")) {
    sanitized = "_" + sanitized
  }

  // Limit length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = sanitized.substring(sanitized.lastIndexOf("."))
    const name = sanitized.substring(0, maxLength - ext.length)
    sanitized = name + ext
  }

  return sanitized
}

function containsSuspiciousPatterns(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.\./g, // Path traversal
    /[<>:"|?*]/g, // Invalid filename characters
    /\0/g, // Null bytes
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i, // Windows reserved names
    /\.exe$/i, // Executable files
    /\.bat$/i, // Batch files
    /\.cmd$/i, // Command files
    /\.sh$/i, // Shell scripts
    /\.php$/i, // PHP files
    /\.js$/i, // JavaScript (if not expected)
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(fileName))
}

export async function validateFileContent(file: File): Promise<ValidationResult> {
  try {
    // Read first few bytes to check file signature (magic numbers)
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check for ZIP signature (XLSX files are ZIP archives)
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)

    // Check for CSV/plain text
    const isText = bytes.every((byte) => byte < 128 || byte === 0xff || byte === 0xfe)

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith(".xlsx") && !isZip) {
      return { valid: false, error: "File claims to be XLSX but has invalid format" }
    }

    if (fileName.endsWith(".csv") && !isText) {
      return { valid: false, error: "File claims to be CSV but has invalid format" }
    }

    // Additional check: Prevent zip bombs
    if (isZip) {
      const compressionRatio = buffer.byteLength / file.size
      if (compressionRatio > 0.9) {
        // Suspiciously high compression
        return { valid: false, error: "Suspicious file compression detected" }
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: "Failed to validate file content" }
  }
}

export const FILE_VALIDATOR = {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  validateFile,
  validateFileContent,
  sanitizeFileName,
} as const
