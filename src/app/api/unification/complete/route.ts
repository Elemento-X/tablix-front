import { type NextRequest, NextResponse } from 'next/server'
import { atomicIncrementUnification } from '@/lib/usage-tracker'
import { setFingerprintCookie, getUserFingerprint } from '@/lib/fingerprint'
import { consumeUnificationToken } from '@/lib/security/unification-token'
import {
  validateContentType,
  validateBodySize,
} from '@/lib/security/validation-schemas'
import { rateLimiters } from '@/lib/security/rate-limit'
import { audit } from '@/lib/audit-logger'

/**
 * POST /api/unification/complete
 * Atomically checks limit and increments the unification counter
 * Requires a one-time token from /api/preview (prevents replay attacks)
 * Uses Redis Lua script to prevent TOCTOU race conditions
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.api.check(request)

    if (!rateLimitResult.success) {
      audit(request, { action: 'rate_limit.hit', detail: 'unification' })
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

    // Validate Content-Type
    const contentTypeCheck = validateContentType(request, 'json')
    if (!contentTypeCheck.valid) {
      return NextResponse.json(
        { error: contentTypeCheck.error },
        { status: 415 },
      )
    }

    // Reject oversized bodies before parsing
    const bodySizeCheck = validateBodySize(request, 'json')
    if (!bodySizeCheck.valid) {
      return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 })
    }

    // Get user fingerprint
    const { isNew, cookieId, fingerprint } = getUserFingerprint(request)

    // Parse and validate request body
    let body: { token?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    // Validate one-time token (must come from /api/preview)
    if (!body.token) {
      return NextResponse.json(
        { error: 'Missing unification token' },
        { status: 400 },
      )
    }

    const tokenValid = await consumeUnificationToken(body.token, fingerprint)
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

    // Atomic check + increment (no TOCTOU race condition)
    const result = await atomicIncrementUnification(request)

    if (!result.success) {
      audit(request, {
        action: 'quota.exceeded',
        fingerprint,
        detail: 'unification limit',
      })
      return NextResponse.json(
        {
          error: `Unification limit reached for your plan.`,
          code: 'LIMIT_EXCEEDED',
        },
        { status: 403 },
      )
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      unifications: {
        current: result.newCount,
        max: result.maxUnifications,
        remaining: result.maxUnifications - result.newCount,
      },
    })

    // Set fingerprint cookie if it's a new user
    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    audit(request, {
      action: 'unification.complete',
      fingerprint,
      detail: `${result.newCount}/${result.maxUnifications}`,
    })

    return response
  } catch (error) {
    console.error(
      '[Unification Complete API] Error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      { error: 'Failed to record unification' },
      { status: 500 },
    )
  }
}
