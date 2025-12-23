import { z } from "zod"

// Column name validation
export const columnNameSchema = z
  .string()
  .min(1, "Column name cannot be empty")
  .max(255, "Column name too long")
  .regex(/^[a-zA-Z0-9\s_\-À-ÿ]+$/, "Column name contains invalid characters")

// Array of column names
export const columnsArraySchema = z
  .array(columnNameSchema)
  .min(1, "At least one column must be selected")
  .max(50, "Too many columns selected (max 50)")

// File metadata validation
export const fileMetadataSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name too long")
    .regex(/^[^<>:"|?*\0]+$/, "File name contains invalid characters"),
  size: z.number().positive("File size must be positive").max(10 * 1024 * 1024, "File too large (max 10MB)"),
  type: z.enum(["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
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
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, "") // Remove non-printable and special chars (keep accents)
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
      return { valid: false, error: "No valid columns after sanitization" }
    }

    return { valid: true, data: sanitized }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || "Invalid column selection" }
    }
    return { valid: false, error: "Invalid column selection" }
  }
}

// Validate file size and count limits
export function validateFileLimits(files: File[], maxFiles: number = 1, maxSize: number = 10 * 1024 * 1024): {
  valid: boolean
  error?: string
} {
  if (files.length === 0) {
    return { valid: false, error: "No files provided" }
  }

  if (files.length > maxFiles) {
    return { valid: false, error: `Too many files. Maximum ${maxFiles} file(s) allowed` }
  }

  for (const file of files) {
    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" exceeds maximum size of ${maxSize / (1024 * 1024)}MB` }
    }

    if (file.size === 0) {
      return { valid: false, error: `File "${file.name}" is empty` }
    }
  }

  return { valid: true }
}
