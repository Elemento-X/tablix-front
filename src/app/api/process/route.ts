import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/security/rate-limit'
import {
  sanitizeFileName,
  validateFileContent,
} from '@/lib/security/file-validator'
import {
  validateFileLimits,
  validateColumnSelection,
  sanitizeString,
  validateContentType,
} from '@/lib/security/validation-schemas'
import {
  getUserFingerprint,
  setFingerprintCookie,
  getUserPlan,
} from '@/lib/fingerprint'
import { getPlanLimits } from '@/lib/limits'
import { checkUnificationLimit } from '@/lib/usage-tracker'

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

    // Apply rate limiting
    const rateLimitResult = await rateLimiters.process.check(request)

    if (!rateLimitResult.success) {
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
    const { isNew, cookieId } = getUserFingerprint(request)
    const plan = getUserPlan(request)
    const limits = getPlanLimits(plan)

    // Check unification limit (monthly quota)
    const unificationCheck = await checkUnificationLimit(request)

    if (!unificationCheck.allowed) {
      const response = NextResponse.json(
        {
          error: unificationCheck.error,
          errorCode: unificationCheck.errorCode,
        },
        { status: 403 },
      )

      if (isNew) {
        setFingerprintCookie(response, cookieId)
      }

      return response
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const columnsJson = formData.get('columns') as string

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
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
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
