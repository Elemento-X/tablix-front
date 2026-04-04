import { Redis } from '@upstash/redis'
import { serverEnv } from '@/config/env.server'

const REDIS_TIMEOUT_MS = 5000 // 5 second timeout for all Redis operations

let redis: Redis | null = null

/**
 * Reset Redis singleton for testing only.
 * Forces re-creation on next getRedisClient() call.
 * Guarded: no-op in production to prevent abuse.
 */
export function __resetRedisClient() {
  if (serverEnv.NODE_ENV !== 'test') return
  redis = null
}

/**
 * Get Redis client instance
 * Returns null if Redis is not configured (development mode)
 */
export function getRedisClient(): Redis | null {
  // Check if Redis is configured
  const url = serverEnv.UPSTASH_REDIS_REST_URL
  const token = serverEnv.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      '[Redis] Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.',
    )
    return null
  }

  // Create singleton instance
  if (!redis) {
    redis = new Redis({
      url,
      token,
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.min(retryCount * 100, 1000),
      },
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

  async atomicCheckAndIncr(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<number> {
    const current = (await this.get(key)) || 0
    if (current >= limit) {
      return -1
    }
    const newValue = current + 1
    await this.set(key, newValue, ttlSeconds)
    return newValue
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
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
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      inMemoryStore.cleanup()
    },
    10 * 60 * 1000,
  )
}

/**
 * Storage abstraction that uses Redis if available, otherwise falls back to in-memory
 */
/**
 * Lua script for atomic get-and-delete (one-time token consumption)
 * Returns the value if it existed, nil otherwise
 */
const ATOMIC_GET_AND_DEL_SCRIPT = `
local val = redis.call('GET', KEYS[1])
if val then
  redis.call('DEL', KEYS[1])
end
return val
`

/**
 * Lua script for atomic check-and-increment
 * Returns new count if under limit, or -1 if limit reached
 */
const ATOMIC_CHECK_AND_INCR_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return -1
end
local newVal = redis.call('INCR', key)
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end
return newVal
`

export const storage = {
  async get(key: string): Promise<number | null> {
    const redis = getRedisClient()

    if (redis) {
      try {
        return await redis.get<number>(key)
      } catch (error) {
        console.error(
          '[Redis] Error getting key:',
          error instanceof Error ? error.message : 'Unknown error',
        )
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
        console.error(
          '[Redis] Error incrementing key:',
          error instanceof Error ? error.message : 'Unknown error',
        )
        throw new Error('Failed to increment counter')
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
        console.error(
          '[Redis] Error setting expiration:',
          error instanceof Error ? error.message : 'Unknown error',
        )
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
        console.error(
          '[Redis] Error setting key:',
          error instanceof Error ? error.message : 'Unknown error',
        )
        throw new Error('Failed to set value')
      }
      return
    }

    inMemoryStore.set(key, value, exSeconds || 31 * 24 * 60 * 60)
  },

  /**
   * Atomically get and delete a key (for one-time token consumption)
   * Returns the value if it existed, null otherwise
   */
  async getAndDel(key: string): Promise<string | null> {
    const redis = getRedisClient()

    if (redis) {
      try {
        const result = await redis.eval(ATOMIC_GET_AND_DEL_SCRIPT, [key], [])
        return result !== null ? String(result) : null
      } catch (error) {
        console.error(
          '[Redis] Error in get-and-delete:',
          error instanceof Error ? error.message : 'Unknown error',
        )
        return null
      }
    }

    const value = await inMemoryStore.get(key)
    if (value !== null) {
      await inMemoryStore.del(key)
    }
    return value !== null ? String(value) : null
  },

  /**
   * Atomic check-and-increment: increments key only if current value < limit
   * Returns new count on success, -1 if limit reached
   */
  async atomicCheckAndIncr(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<number> {
    const redis = getRedisClient()

    if (redis) {
      try {
        const result = await redis.eval(
          ATOMIC_CHECK_AND_INCR_SCRIPT,
          [key],
          [limit, ttlSeconds],
        )
        return result as number
      } catch (error) {
        console.error(
          '[Redis] Error in atomic check-and-increment:',
          error instanceof Error ? error.message : 'Unknown error',
        )
        throw new Error('Failed to check and increment counter')
      }
    }

    return inMemoryStore.atomicCheckAndIncr(key, limit, ttlSeconds)
  },
}

export default storage
