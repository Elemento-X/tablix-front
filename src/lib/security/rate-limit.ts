import type { NextRequest } from 'next/server'
import { serverEnv } from '@/config/env.server'

// In-memory fallback implementation
// WARNING: This fallback is for DEVELOPMENT ONLY.
// In serverless environments (Vercel, AWS Lambda), each invocation gets fresh memory,
// making in-memory rate limiting ineffective. Production MUST use Redis (Upstash).
interface RateLimitStore {
  count: number
  resetTime: number
}

const inMemoryStore = new Map<string, RateLimitStore>()

/**
 * Circuit breaker for Redis rate limiter.
 * Prevents cascading failures when Redis is down by stopping attempts
 * after consecutive failures and periodically retrying.
 *
 * States:
 * - CLOSED: normal operation, requests go to Redis
 * - OPEN: Redis is down, skip Redis for OPEN_DURATION_MS, use in-memory fallback
 * - HALF_OPEN: try one request to Redis to check if it's back
 */
const CIRCUIT_BREAKER_THRESHOLD = 3 // consecutive failures to open circuit
const CIRCUIT_BREAKER_OPEN_DURATION_MS = 30_000 // 30s before half-open retry

interface CircuitBreakerState {
  failures: number
  state: 'closed' | 'open' | 'half-open'
  openedAt: number
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  state: 'closed',
  openedAt: 0,
}

function shouldSkipRedis(): boolean {
  if (circuitBreaker.state === 'closed') return false

  if (circuitBreaker.state === 'open') {
    // Check if enough time has passed to try half-open
    if (
      Date.now() - circuitBreaker.openedAt >=
      CIRCUIT_BREAKER_OPEN_DURATION_MS
    ) {
      circuitBreaker.state = 'half-open'
      return false // allow one request through
    }
    return true // still open, skip Redis
  }

  // half-open: allow request through (already returned false above on transition)
  return false
}

function recordRedisSuccess() {
  circuitBreaker.failures = 0
  circuitBreaker.state = 'closed'
}

function recordRedisFailure() {
  circuitBreaker.failures++
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'open'
    circuitBreaker.openedAt = Date.now()
    console.error(
      `[Rate Limit] Circuit breaker OPEN after ${circuitBreaker.failures} consecutive Redis failures. Falling back to in-memory for ${CIRCUIT_BREAKER_OPEN_DURATION_MS / 1000}s.`,
    )
  }
}

// Cleanup old entries every 10 minutes
const cleanupInterval = setInterval(
  () => {
    const now = Date.now()
    for (const [key, value] of inMemoryStore.entries()) {
      if (now > value.resetTime) {
        inMemoryStore.delete(key)
      }
    }
  },
  10 * 60 * 1000,
)

// Prevent interval from keeping process alive in tests
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref()
}

/**
 * Reset in-memory rate limit store for testing only.
 * Guarded: no-op in production to prevent abuse.
 */
export function __resetRateLimitStore() {
  if (serverEnv.NODE_ENV !== 'test') return
  inMemoryStore.clear()
}

interface RateLimitOptions {
  interval: number // in milliseconds
  maxRequests: number
  namespace?: string // Optional namespace to avoid collisions between different limiters
}

// Lazy load Redis and Ratelimit to avoid ESM issues in tests.
// Note: serverEnv is imported eagerly (top-level) while Redis is lazy (require).
// This asymmetry is intentional — serverEnv uses a Proxy in test mode that handles
// dynamic process.env reads, but Redis SDK requires lazy loading to avoid ESM errors.
let redisClient: ReturnType<
  typeof import('@/lib/redis').getRedisClient
> | null = null
let redisChecked = false

function getRedis() {
  if (!redisChecked) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRedisClient } = require('@/lib/redis')
      redisClient = getRedisClient()
    } catch {
      // Redis not available in test environment
      redisClient = null
    }
    redisChecked = true
  }
  return redisClient
}

export function rateLimit(options: RateLimitOptions) {
  // Create a unique namespace for this limiter instance if not provided
  const namespace = options.namespace ?? `limiter-${Date.now()}`

  // Lazy create Upstash Rate Limit instance
  let upstashLimiter: {
    limit: (id: string) => Promise<{ success: boolean; remaining: number }>
  } | null = null
  let upstashChecked = false

  function getUpstashLimiter() {
    if (!upstashChecked) {
      const redis = getRedis()
      if (redis) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { Ratelimit } = require('@upstash/ratelimit')
          upstashLimiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(
              options.maxRequests,
              `${options.interval}ms`,
            ),
            analytics: true,
            prefix: `ratelimit:${namespace}`,
          })
        } catch {
          // Upstash not available in test environment
          upstashLimiter = null
        }
      }
      upstashChecked = true
    }
    return upstashLimiter
  }

  return {
    check: async (
      request: NextRequest,
    ): Promise<{ success: boolean; remaining: number }> => {
      const baseIdentifier = getIdentifier(request)
      const identifier = `${namespace}:${baseIdentifier}`

      // Use Upstash Rate Limit if available (with circuit breaker)
      const limiter = getUpstashLimiter()
      if (limiter && !shouldSkipRedis()) {
        try {
          const result = await limiter.limit(baseIdentifier)
          recordRedisSuccess()
          return {
            success: result.success,
            remaining: result.remaining,
          }
        } catch (error) {
          recordRedisFailure()
          console.error(
            '[Rate Limit] Redis failed:',
            error instanceof Error ? error.message : 'Unknown error',
          )

          // If circuit is not open yet, fail-closed in production
          if (
            serverEnv.NODE_ENV === 'production' &&
            circuitBreaker.state !== 'open'
          ) {
            return { success: false, remaining: 0 }
          }

          // Circuit is open: fall through to in-memory as degraded fallback
        }
      }

      // In-memory fallback (degraded mode during circuit breaker open, or development/test)
      const now = Date.now()
      const record = inMemoryStore.get(identifier)

      if (!record || now > record.resetTime) {
        // Create new record
        inMemoryStore.set(identifier, {
          count: 1,
          resetTime: now + options.interval,
        })
        return { success: true, remaining: options.maxRequests - 1 }
      }

      if (record.count >= options.maxRequests) {
        return { success: false, remaining: 0 }
      }

      // Increment count
      record.count++
      inMemoryStore.set(identifier, record)

      return { success: true, remaining: options.maxRequests - record.count }
    },
  }
}

function getIdentifier(request: NextRequest): string {
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

// Preset configurations
export const rateLimiters = {
  // 10 requests per minute for file uploads
  upload: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 10,
    namespace: 'upload',
  }),

  // 5 requests per minute for processing (heavy operation: file upload + validation + merge)
  process: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 5,
    namespace: 'process',
  }),

  // 100 requests per minute for general API calls
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 100,
    namespace: 'api',
  }),
}
