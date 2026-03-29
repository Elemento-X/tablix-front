import { z } from 'zod'

// Column name validation
export const columnNameSchema = z
  .string()
  .min(1, 'Column name cannot be empty')
  .max(255, 'Column name too long')
  .regex(/^[a-zA-Z0-9\s_\-À-ÿ]+$/, 'Column name contains invalid characters')

// Array of column names (base schema — plan-specific max enforced in route)
export const columnsArraySchema = z
  .array(columnNameSchema)
  .min(1, 'At least one column must be selected')

// File metadata validation
export const fileMetadataSchema = z.object({
  name: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[^<>:"|?*\0]+$/, 'File name contains invalid characters'),
  size: z.number().positive('File size must be positive'),
  type: z.enum([
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
})

// Process request validation
export const processRequestSchema = z.object({
  selectedColumns: columnsArraySchema,
  fileName: z.string().min(1).max(255),
})

// Preview request validation
export const previewRequestSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
})

// Plan validation (for future use if implementing plans)
export const planLimitSchema = z.object({
  maxSheetsPerMonth: z.number().int().positive(),
  maxRowsPerSheet: z.number().int().positive(),
  maxColumns: z.number().int().positive(),
})

// Sanitize string inputs
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '') // Remove non-printable and special chars (keep accents)
    .trim()
}

// Sanitize array of strings
export function sanitizeStringArray(arr: string[]): string[] {
  return arr.map(sanitizeString).filter((s) => s.length > 0)
}

// Validate and sanitize column selection
export function validateColumnSelection(columns: unknown): {
  valid: boolean
  data?: string[]
  error?: string
} {
  try {
    const parsed = columnsArraySchema.parse(columns)
    const sanitized = sanitizeStringArray(parsed)

    if (sanitized.length === 0) {
      return { valid: false, error: 'No valid columns after sanitization' }
    }

    return { valid: true, data: sanitized }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors[0]?.message || 'Invalid column selection',
      }
    }
    return { valid: false, error: 'Invalid column selection' }
  }
}

// Validate Content-Type header
export function validateContentType(
  request: { headers: { get(name: string): string | null } },
  expected: 'multipart' | 'json',
): { valid: boolean; error?: string } {
  const contentType = request.headers.get('content-type') || ''

  if (expected === 'multipart') {
    if (!contentType.includes('multipart/form-data')) {
      return { valid: false, error: 'Content-Type must be multipart/form-data' }
    }
  } else if (expected === 'json') {
    if (!contentType.includes('application/json')) {
      return { valid: false, error: 'Content-Type must be application/json' }
    }
  }

  return { valid: true }
}

// Validate file size and count limits
export function validateFileLimits(
  files: File[],
  maxFiles: number,
  maxSize: number,
): {
  valid: boolean
  error?: string
} {
  if (files.length === 0) {
    return { valid: false, error: 'No files provided' }
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Too many files. Maximum ${maxFiles} file(s) allowed`,
    }
  }

  for (const file of files) {
    // Sanitize file name before including in error messages to prevent XSS
    const safeName = sanitizeString(file.name).slice(0, 50)

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File "${safeName}" exceeds maximum size of ${maxSize / (1024 * 1024)}MB`,
      }
    }

    if (file.size === 0) {
      return { valid: false, error: `File "${safeName}" is empty` }
    }
  }

  return { valid: true }
}
