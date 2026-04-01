import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/security/rate-limit'
import {
  sanitizeFileName,
  validateFileContent,
  FILE_VALIDATOR,
} from '@/lib/security/file-validator'
import {
  validateFileLimits,
  validateColumnSelection,
  sanitizeString,
  validateContentType,
  validateBodySize,
} from '@/lib/security/validation-schemas'
import {
  getUserFingerprint,
  setFingerprintCookie,
  getUserPlan,
} from '@/lib/fingerprint'
import { getPlanLimits } from '@/lib/limits'
import { atomicIncrementUnification } from '@/lib/usage-tracker'
import { consumeUnificationToken } from '@/lib/security/unification-token'
import { audit } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    // Validate Content-Type
    const contentTypeCheck = validateContentType(request, 'multipart')
    if (!contentTypeCheck.valid) {
      return NextResponse.json(
        { error: contentTypeCheck.error },
        { status: 415 },
      )
    }

    // Reject oversized bodies before parsing
    const bodySizeCheck = validateBodySize(request, 'multipart')
    if (!bodySizeCheck.valid) {
      return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimiters.process.check(request)

    if (!rateLimitResult.success) {
      audit(request, { action: 'rate_limit.hit', detail: 'process' })
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        },
      )
    }

    // Get user fingerprint and plan
    const { isNew, cookieId, fingerprint } = getUserFingerprint(request)
    const plan = getUserPlan(request)
    const limits = getPlanLimits(plan)

    const formData = await request.formData()
    const files = formData
      .getAll('files')
      .filter((f): f is File => f instanceof File)
    const columnsJson = formData.get('columns') as string
    const token = formData.get('token') as string

    // Validate token presence early (cheap check, no Redis call)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing unification token' },
        { status: 400 },
      )
    }

    // Validate file count and per-file size using plan limits
    const fileLimitValidation = validateFileLimits(
      files,
      limits.maxInputFiles,
      limits.maxFileSize,
    )
    if (!fileLimitValidation.valid) {
      return NextResponse.json(
        { error: fileLimitValidation.error },
        { status: 400 },
      )
    }

    // Validate total size across all files
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > limits.maxTotalSize) {
      return NextResponse.json(
        {
          error: `Total file size exceeds limit of ${limits.maxTotalSize / (1024 * 1024)}MB for ${limits.name} plan`,
        },
        { status: 400 },
      )
    }

    // Validate and parse columns JSON
    let selectedColumns: string[]
    try {
      const parsedColumns = JSON.parse(columnsJson)
      const columnValidation = validateColumnSelection(parsedColumns)

      if (!columnValidation.valid) {
        return NextResponse.json(
          { error: columnValidation.error },
          { status: 400 },
        )
      }

      selectedColumns = columnValidation.data!
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid columns format' },
        { status: 400 },
      )
    }

    // Additional column limit check using plan limits
    if (selectedColumns.length > limits.maxColumns) {
      return NextResponse.json(
        { error: `Too many columns selected (max ${limits.maxColumns})` },
        { status: 400 },
      )
    }

    // Validate file types
    for (const file of files) {
      if (
        !(FILE_VALIDATOR.ALLOWED_MIME_TYPES as readonly string[]).includes(
          file.type,
        )
      ) {
        return NextResponse.json(
          { error: 'Invalid file type. Only CSV and XLSX files are allowed.' },
          { status: 400 },
        )
      }

      // Sanitize file name (validate it doesn't contain malicious patterns)
      const safeName = sanitizeFileName(file.name)

      // Validate file extension after sanitization
      const safeNameLower = safeName.toLowerCase()
      if (
        !safeNameLower.endsWith('.csv') &&
        !safeNameLower.endsWith('.xlsx') &&
        !safeNameLower.endsWith('.xls')
      ) {
        return NextResponse.json(
          { error: 'Invalid file extension after sanitization' },
          { status: 400 },
        )
      }

      // Validate file content (magic numbers + zip bomb check)
      const contentValidation = await validateFileContent(file)
      if (!contentValidation.valid) {
        return NextResponse.json(
          { error: contentValidation.error },
          { status: 400 },
        )
      }
    }

    // All validations passed — now consume resources (token + quota)
    // Token consumed AFTER all validations to avoid wasting it on invalid requests
    const tokenValid = await consumeUnificationToken(token, fingerprint)
    if (!tokenValid) {
      audit(request, {
        action: 'auth.token_invalid',
        fingerprint,
        detail: 'unification token',
      })
      return NextResponse.json(
        { error: 'Invalid or expired unification token' },
        { status: 403 },
      )
    }

    // Atomic check + increment quota (after token, so quota only counts real processing)
    const quotaResult = await atomicIncrementUnification(request)
    if (!quotaResult.success) {
      const response = NextResponse.json(
        {
          error: 'Unification limit reached for your plan.',
          errorCode: 'LIMIT_EXCEEDED',
        },
        { status: 403 },
      )

      if (isNew) {
        setFingerprintCookie(response, cookieId)
      }

      return response
    }

    // TODO: Implement actual file processing logic
    // For now, simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Create example response file
    const content = `File processed successfully.\nSelected columns: ${selectedColumns.join(', ')}`
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    // Sanitize output filename
    const outputFileName = sanitizeString('tablix-output.xlsx')

    const response = new NextResponse(blob, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    })

    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    audit(request, {
      action: 'upload.process',
      fingerprint,
      plan,
      detail: `${files.length} files, ${selectedColumns.length} columns`,
    })

    return response
  } catch (error) {
    console.error(
      '[Process API] Error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      { error: 'Error processing files' },
      { status: 500 },
    )
  }
}
