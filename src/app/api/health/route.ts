import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/security/rate-limit'

/**
 * GET /api/health
 *
 * Shallow health check: returns { status: "ok" } if the server is responding.
 * Deep health check (?deep=true): verifies Redis connectivity.
 * Deep check requires X-Health-Secret header matching HEALTH_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api.check(request)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { status: 'error' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      },
    )
  }

  const isDeep = request.nextUrl.searchParams.get('deep') === 'true'
  const timestamp = new Date().toISOString()

  if (!isDeep) {
    return NextResponse.json({ status: 'ok', timestamp })
  }

  // Deep health check requires secret
  const secret = request.headers.get('x-health-secret')
  const expectedSecret = process.env.HEALTH_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ status: 'ok', timestamp })
  }

  // Deep check: verify Redis connectivity
  const checks: Record<string, 'ok' | 'error'> = {}

  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })
    await redis.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'error'
  }

  const overallStatus = Object.values(checks).every((c) => c === 'ok')
    ? 'ok'
    : 'degraded'

  return NextResponse.json({
    status: overallStatus,
    timestamp,
    checks,
  })
}
