import { type NextRequest, NextResponse } from "next/server"
import { getUserUsage } from "@/lib/usage-tracker"
import { setFingerprintCookie, getUserFingerprint } from "@/lib/fingerprint"

/**
 * GET /api/usage
 * Returns current usage statistics for the user
 */
export async function GET(request: NextRequest) {
  try {
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
    console.error("[Usage API] Error:", error)
    return NextResponse.json({ error: "Failed to get usage statistics" }, { status: 500 })
  }
}
