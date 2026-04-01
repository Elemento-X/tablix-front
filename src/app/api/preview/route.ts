import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/security/rate-limit'
import {
  sanitizeFileName,
  validateFileContent,
  FILE_VALIDATOR,
} from '@/lib/security/file-validator'
import {
  validateContentType,
  validateBodySize,
  sanitizeString,
} from '@/lib/security/validation-schemas'
import { checkUnificationLimit, checkFileSizeLimit } from '@/lib/usage-tracker'
import {
  getUserFingerprint,
  setFingerprintCookie,
  getUserPlan,
} from '@/lib/fingerprint'
import { generateUnificationToken } from '@/lib/security/unification-token'
import { audit } from '@/lib/audit-logger'

const MAX_FILES = 1 // Only 1 file per upload

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

    // Apply rate limiting (anti-DDoS protection)
    const rateLimitResult = await rateLimiters.upload.check(request)

    if (!rateLimitResult.success) {
      audit(request, { action: 'rate_limit.hit', detail: 'upload' })
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

    // Check unification limit (monthly quota)
    const unificationCheck = await checkUnificationLimit(request)

    if (!unificationCheck.allowed) {
      audit(request, {
        action: 'quota.exceeded',
        fingerprint,
        plan,
        detail: `${unificationCheck.currentUnifications}/${unificationCheck.maxUnifications}`,
      })
      const response = NextResponse.json(
        {
          error: unificationCheck.error,
          errorCode: unificationCheck.errorCode,
          usage: {
            current: unificationCheck.currentUnifications,
            max: unificationCheck.maxUnifications,
            remaining: unificationCheck.remainingUnifications,
          },
        },
        { status: 403 },
      )

      // Set cookie even on error to track user
      if (isNew) {
        setFingerprintCookie(response, cookieId)
      }

      return response
    }

    const formData = await request.formData()
    const files = formData
      .getAll('files')
      .filter((f): f is File => f instanceof File)

    // Validate file count (only 1 file allowed)
    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: 'Only 1 file allowed per upload' },
        { status: 400 },
      )
    }

    const file = files[0]

    // Check file size against plan limit
    const fileSizeCheck = checkFileSizeLimit(file.size, plan)

    if (!fileSizeCheck.allowed) {
      return NextResponse.json(
        {
          error: fileSizeCheck.error,
          errorCode: fileSizeCheck.errorCode,
          maxSize: fileSizeCheck.maxSize,
        },
        { status: 403 },
      )
    }

    // Validate file types
    if (
      !(FILE_VALIDATOR.ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.type,
      )
    ) {
      return NextResponse.json(
        { error: `Invalid file type. Only CSV and XLSX files are allowed.` },
        { status: 400 },
      )
    }

    // Sanitize file name and use sanitized version from here on
    const safeName = sanitizeFileName(file.name)
    const safeNameLower = safeName.toLowerCase()

    // Validate file extension on sanitized name
    if (
      !safeNameLower.endsWith('.csv') &&
      !safeNameLower.endsWith('.xlsx') &&
      !safeNameLower.endsWith('.xls')
    ) {
      return NextResponse.json(
        {
          error: `Invalid file extension. Only .csv, .xls and .xlsx files are allowed.`,
        },
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

    // TODO: Implement actual file parsing logic
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Example columns - replace with actual parsing logic
    const rawColumns = [
      'ID',
      'Nome',
      'Email',
      'Telefone',
      'Endereço',
      'Cidade',
      'Estado',
      'CEP',
      'Data de Cadastro',
      'Status',
    ]

    // Sanitize column names to prevent XSS via spreadsheet content
    const columns = rawColumns.map((col) => sanitizeString(col))

    // Generate one-time token for /api/unification/complete (prevents replay attacks)
    const unificationToken = await generateUnificationToken(fingerprint)

    // Create response with usage info and token
    // NOTE: Unification counter is incremented in /api/unification/complete after successful merge
    const response = NextResponse.json(
      {
        columns,
        unificationToken,
        usage: {
          current: unificationCheck.currentUnifications,
          max: unificationCheck.maxUnifications,
          remaining: unificationCheck.remainingUnifications,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      },
    )

    // Set fingerprint cookie if new user
    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    audit(request, {
      action: 'upload.preview',
      fingerprint,
      plan,
    })

    return response
  } catch (error) {
    console.error(
      '[Preview API] Error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      { error: 'Error processing file' },
      { status: 500 },
    )
  }
}
