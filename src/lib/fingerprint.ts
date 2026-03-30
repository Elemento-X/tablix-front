import type { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

const FINGERPRINT_COOKIE_NAME = 'tablix_fp'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

/**
 * Extract IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Priority: cf-connecting-ip (set by Cloudflare, not spoofable by client)
  // > x-real-ip (set by reverse proxy) > x-forwarded-for (can be spoofed)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const realIp = request.headers.get('x-real-ip')
  const forwarded = request.headers.get('x-forwarded-for')

  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  if (realIp) {
    return realIp.trim()
  }

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Fallback for local development
  return '127.0.0.1'
}

/**
 * Generate a random fingerprint ID
 */
function generateFingerprintId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(8).toString('hex')
  return `${timestamp}-${random}`
}

/**
 * Hash fingerprint components for privacy
 */
function hashFingerprint(components: string[]): string {
  const combined = components.join('|')
  return createHash('sha256').update(combined).digest('hex').substring(0, 32)
}

/**
 * Get or create user fingerprint
 * Combines cookie-based ID with IP address for better tracking
 */
export function getUserFingerprint(request: NextRequest): {
  fingerprint: string
  cookieId: string
  ip: string
  isNew: boolean
} {
  const ip = getClientIP(request)

  // Check for existing cookie
  const existingCookie = request.cookies.get(FINGERPRINT_COOKIE_NAME)
  let cookieId: string
  let isNew = false

  if (existingCookie?.value) {
    cookieId = existingCookie.value
  } else {
    // Generate new fingerprint ID
    cookieId = generateFingerprintId()
    isNew = true
  }

  // Create composite fingerprint (hashed for privacy)
  const fingerprint = hashFingerprint([cookieId, ip])

  return {
    fingerprint,
    cookieId,
    ip,
    isNew,
  }
}

/**
 * Set fingerprint cookie in response
 */
export function setFingerprintCookie(
  response: NextResponse,
  cookieId: string,
): void {
  response.cookies.set(FINGERPRINT_COOKIE_NAME, cookieId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Get plan type from request
 * For now, always returns 'free' since there's no authentication
 * TODO: Implement plan detection when authentication is added
 */
export function getUserPlan(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
): 'free' | 'pro' | 'enterprise' {
  // TODO: When authentication is implemented, get plan from JWT token
  // const token = request.headers.get('authorization')
  // const user = await verifyToken(token)
  // return user.plan

  // Always return free until backend auth (Fastify JWT) is integrated
  return 'free'
}

/**
 * Get current month key for tracking uploads
 */
export function getCurrentMonthKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Create Redis key for upload tracking
 */
export function createUploadCountKey(
  fingerprint: string,
  monthKey: string,
): string {
  return `upload:${fingerprint}:${monthKey}`
}
