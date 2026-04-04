import { type NextRequest, NextResponse } from 'next/server'
import { getUserUsage } from '@/lib/usage-tracker'
import { setFingerprintCookie, getUserFingerprint } from '@/lib/fingerprint'
import { rateLimiters } from '@/lib/security/rate-limit'
import { env } from '@/config/env'

/**
 * GET /api/usage
 * Returns current usage statistics for the user
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.api.check(request)

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

    // Get user fingerprint
    const { isNew, cookieId } = getUserFingerprint(request)

    // Get usage statistics
    const usage = await getUserUsage(request)

    // Create response
    const response = NextResponse.json({
      plan: usage.plan,
      unifications: {
        current: usage.currentUnifications,
        max: usage.maxUnifications,
        remaining: usage.remainingUnifications,
      },
      limits: {
        maxInputFiles: usage.maxInputFiles,
        maxFileSize: usage.maxFileSize,
        maxTotalSize: usage.maxTotalSize,
        maxRows: usage.maxRows,
        maxColumns: usage.maxColumns,
      },
    })

    // Set fingerprint cookie if it's a new user
    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    return response
  } catch (error) {
    if (env.NODE_ENV !== 'production') {
      console.error('[Usage API] Error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json({ error: 'Failed to get usage statistics' }, { status: 500 })
  }
}
