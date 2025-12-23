import type { NextRequest } from "next/server"

interface RateLimitStore {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitStore>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}, 10 * 60 * 1000)

interface RateLimitOptions {
  interval: number // in milliseconds
  maxRequests: number
}

export function rateLimit(options: RateLimitOptions) {
  return {
    check: async (request: NextRequest): Promise<{ success: boolean; remaining: number }> => {
      // Get identifier (IP address or a unique identifier)
      const identifier = getIdentifier(request)

      const now = Date.now()
      const record = store.get(identifier)

      if (!record || now > record.resetTime) {
        // Create new record
        store.set(identifier, {
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
      store.set(identifier, record)

      return { success: true, remaining: options.maxRequests - record.count }
    },
  }
}

function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIp) {
    return realIp.trim()
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  // Fallback to a random identifier (not ideal but prevents crashes)
  return "unknown-" + Math.random().toString(36).substring(7)
}

// Preset configurations
export const rateLimiters = {
  // 10 requests per minute for file uploads
  upload: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),

  // 30 requests per minute for processing
  process: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),

  // 100 requests per minute for general API calls
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),
}
