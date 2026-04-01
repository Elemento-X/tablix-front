const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(file: File): ValidationResult {
  // Check file size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext),
  )

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  // Check MIME type
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type. Expected CSV or Excel file.`,
    }
  }

  // Check for suspicious file names
  if (containsSuspiciousPatterns(fileName)) {
    return {
      valid: false,
      error: 'File name contains suspicious patterns',
    }
  }

  return { valid: true }
}

export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '')

  // Remove or replace special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized
  }

  // Limit length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    const name = sanitized.substring(0, maxLength - ext.length)
    sanitized = name + ext
  }

  return sanitized
}

function containsSuspiciousPatterns(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /[<>:"|?*]/, // Invalid filename characters
    /\0/, // Null bytes
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

export async function validateFileContent(
  file: File,
): Promise<ValidationResult> {
  try {
    // Read first few bytes to check file signature (magic numbers)
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check for ZIP signature (XLSX files are ZIP archives)
    const isZip =
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05)

    // Check for Microsoft Compound Document signature (XLS files)
    const isCDF =
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1

    // Check for CSV/plain text
    // If file starts with a BOM, treat as valid text (UTF-8 or UTF-16)
    const hasUtf16BOM =
      (bytes[0] === 0xff && bytes[1] === 0xfe) ||
      (bytes[0] === 0xfe && bytes[1] === 0xff)
    const hasUtf8BOM =
      bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf

    const isText =
      hasUtf16BOM ||
      hasUtf8BOM ||
      bytes.every(
        (byte) =>
          (byte >= 0x20 && byte <= 0x7e) || // Printable ASCII
          byte === 0x09 || // Tab
          byte === 0x0a || // Line feed
          byte === 0x0d, // Carriage return
      )

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.xlsx') && !isZip) {
      return {
        valid: false,
        error: 'File claims to be XLSX but has invalid format',
      }
    }

    if (fileName.endsWith('.xls') && !isCDF) {
      return {
        valid: false,
        error: 'File claims to be XLS but has invalid format',
      }
    }

    if (fileName.endsWith('.csv')) {
      // Reject PDF files disguised as CSV (%PDF magic bytes are printable ASCII)
      if (
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
      ) {
        return {
          valid: false,
          error: 'File appears to be a PDF, not a CSV',
        }
      }

      if (!isText) {
        return {
          valid: false,
          error: 'File claims to be CSV but has invalid format',
        }
      }
    }

    // Zip bomb protection: check compression ratio for XLSX files
    if (isZip && fileName.endsWith('.xlsx')) {
      const ratioCheck = await checkZipCompressionRatio(file)
      if (!ratioCheck.valid) {
        return ratioCheck
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Failed to validate file content' }
  }
}

const MAX_COMPRESSION_RATIO = 100 // Reject if uncompressed/compressed > 100:1

async function checkZipCompressionRatio(file: File): Promise<ValidationResult> {
  try {
    const buffer = await file.arrayBuffer()
    const view = new DataView(buffer)

    // Find End of Central Directory record (EOCD)
    // EOCD signature: 0x06054b50
    let eocdOffset = -1
    for (
      let i = buffer.byteLength - 22;
      i >= 0 && i >= buffer.byteLength - 65557;
      i--
    ) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i
        break
      }
    }

    if (eocdOffset === -1) {
      // Cannot find EOCD in a file with ZIP magic bytes — reject (fail-closed)
      return {
        valid: false,
        error: 'Invalid ZIP structure: missing end-of-central-directory',
      }
    }

    // Read central directory offset and size from EOCD
    const cdOffset = view.getUint32(eocdOffset + 16, true)
    const cdSize = view.getUint32(eocdOffset + 12, true)

    if (cdOffset + cdSize > buffer.byteLength) {
      // Corrupted central directory — reject (fail-closed)
      return {
        valid: false,
        error: 'Invalid ZIP structure: corrupted central directory',
      }
    }

    // Walk the central directory entries
    let totalCompressed = 0
    let totalUncompressed = 0
    let offset = cdOffset

    while (offset < cdOffset + cdSize) {
      // Central directory file header signature: 0x02014b50
      if (view.getUint32(offset, true) !== 0x02014b50) break

      const compressedSize = view.getUint32(offset + 20, true)
      const uncompressedSize = view.getUint32(offset + 24, true)
      const fileNameLength = view.getUint16(offset + 28, true)
      const extraFieldLength = view.getUint16(offset + 30, true)
      const commentLength = view.getUint16(offset + 32, true)

      totalCompressed += compressedSize
      totalUncompressed += uncompressedSize

      // Move to next entry
      offset += 46 + fileNameLength + extraFieldLength + commentLength
    }

    // Check ratio (only if compressed size > 0 to avoid division by zero)
    if (totalCompressed > 0) {
      const ratio = totalUncompressed / totalCompressed
      if (ratio > MAX_COMPRESSION_RATIO) {
        return {
          valid: false,
          error: 'File rejected: suspicious compression ratio',
        }
      }
    }

    return { valid: true }
  } catch {
    // If we can't parse the ZIP structure, reject as invalid
    return { valid: false, error: 'Invalid XLSX: cannot read ZIP structure' }
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
