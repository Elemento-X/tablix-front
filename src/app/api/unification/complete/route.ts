import { type NextRequest, NextResponse } from 'next/server'
import { incrementUnificationCount, checkUnificationLimit } from '@/lib/usage-tracker'
import { setFingerprintCookie, getUserFingerprint } from '@/lib/fingerprint'

/**
 * POST /api/unification/complete
 * Increments the unification counter after successful client-side merge
 */
export async function POST(request: NextRequest) {
  try {
    // Get user fingerprint
    const { isNew, cookieId } = getUserFingerprint(request)

    // Check if user has remaining unifications
    const limitCheck = await checkUnificationLimit(request)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.error, code: limitCheck.errorCode },
        { status: 403 }
      )
    }

    // Increment the counter
    const newCount = await incrementUnificationCount(request)

    // Create response
    const response = NextResponse.json({
      success: true,
      unifications: {
        current: newCount,
        max: limitCheck.maxUnifications,
        remaining: limitCheck.maxUnifications - newCount,
      },
    })

    // Set fingerprint cookie if it's a new user
    if (isNew) {
      setFingerprintCookie(response, cookieId)
    }

    return response
  } catch (error) {
    console.error('[Unification Complete API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to record unification' },
      { status: 500 }
    )
  }
}
