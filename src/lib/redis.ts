import { Redis } from "@upstash/redis"

/**
 * Upstash Redis client
 * Requires environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

let redis: Redis | null = null

/**
 * Get Redis client instance
 * Returns null if Redis is not configured (development mode)
 */
export function getRedisClient(): Redis | null {
  // Check if Redis is configured
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      "[Redis] Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
    )
    return null
  }

  // Create singleton instance
  if (!redis) {
    redis = new Redis({
      url,
      token,
    })
  }

  return redis
}

/**
 * In-memory fallback store for development
 * Used when Redis is not configured
 */
class InMemoryStore {
  private store = new Map<string, { value: number; expiresAt: number }>()

  async get(key: string): Promise<number | null> {
    const item = this.store.get(key)

    if (!item) {
      return null
    }

    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.store.delete(key)
      return null
    }

    return item.value
  }

  async set(key: string, value: number, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get(key)) || 0
    const newValue = current + 1

    // Set with 31 days TTL (monthly reset)
    await this.set(key, newValue, 31 * 24 * 60 * 60)

    return newValue
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key)
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key)
      }
    }
  }
}

// Singleton in-memory store
const inMemoryStore = new InMemoryStore()

// Cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    inMemoryStore.cleanup()
  }, 10 * 60 * 1000)
}

/**
 * Storage abstraction that uses Redis if available, otherwise falls back to in-memory
 */
export const storage = {
  async get(key: string): Promise<number | null> {
    const redis = getRedisClient()

    if (redis) {
      try {
        return await redis.get<number>(key)
      } catch (error) {
        console.error("[Redis] Error getting key:", error)
        return null
      }
    }

    return inMemoryStore.get(key)
  },

  async incr(key: string): Promise<number> {
    const redis = getRedisClient()

    if (redis) {
      try {
        return await redis.incr(key)
      } catch (error) {
        console.error("[Redis] Error incrementing key:", error)
        throw new Error("Failed to increment counter")
      }
    }

    return inMemoryStore.incr(key)
  },

  async expire(key: string, seconds: number): Promise<void> {
    const redis = getRedisClient()

    if (redis) {
      try {
        await redis.expire(key, seconds)
      } catch (error) {
        console.error("[Redis] Error setting expiration:", error)
      }
      return
    }

    inMemoryStore.expire(key, seconds)
  },

  async set(key: string, value: number, exSeconds?: number): Promise<void> {
    const redis = getRedisClient()

    if (redis) {
      try {
        if (exSeconds) {
          await redis.set(key, value, { ex: exSeconds })
        } else {
          await redis.set(key, value)
        }
      } catch (error) {
        console.error("[Redis] Error setting key:", error)
        throw new Error("Failed to set value")
      }
      return
    }

    inMemoryStore.set(key, value, exSeconds || 31 * 24 * 60 * 60)
  },
}

export default storage
