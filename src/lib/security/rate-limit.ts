import type { NextRequest } from 'next/server'

// In-memory fallback implementation
// WARNING: This fallback is for DEVELOPMENT ONLY.
// In serverless environments (Vercel, AWS Lambda), each invocation gets fresh memory,
// making in-memory rate limiting ineffective. Production MUST use Redis (Upstash).
interface RateLimitStore {
  count: number
  resetTime: number
}

const inMemoryStore = new Map<string, RateLimitStore>()

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

// Export reset function for testing
export function __resetRateLimitStore() {
  inMemoryStore.clear()
}

interface RateLimitOptions {
  interval: number // in milliseconds
  maxRequests: number
  namespace?: string // Optional namespace to avoid collisions between different limiters
}

// Lazy load Redis and Ratelimit to avoid ESM issues in tests
let redisClient: ReturnType<
  typeof import('@/lib/redis').getRedisClient
> | null = null
let redisChecked = false

function getRedis() {
  if (!redisChecked) {
    try {
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

      // Use Upstash Rate Limit if available
      const limiter = getUpstashLimiter()
      if (limiter) {
        try {
          const result = await limiter.limit(baseIdentifier)
          return {
            success: result.success,
            remaining: result.remaining,
          }
        } catch (error) {
          console.warn(
            '[Rate Limit] Redis failed, falling back to in-memory:',
            error instanceof Error ? error.message : 'Unknown error',
          )
          // Fall through to in-memory implementation
        }
      }

      // In-memory fallback implementation
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

  // 30 requests per minute for processing
  process: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 30,
    namespace: 'process',
  }),

  // 100 requests per minute for general API calls
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 100,
    namespace: 'api',
  }),
}
