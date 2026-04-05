import 'server-only'
import { z } from 'zod'

/**
 * Server-only environment variables — NEVER import in client components.
 *
 * The `server-only` import guarantees a build error if this module
 * is accidentally included in a client bundle.
 *
 * These are secrets and infrastructure credentials that must stay server-side.
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),

    // Redis — required in production (rate limiting is ineffective without it in serverless)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // Health check — requires minimum 32 chars for brute-force resistance
    HEALTH_SECRET: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.string().min(32).optional(),
    ),
  })
  .refine(
    (data) =>
      data.NODE_ENV !== 'production' ||
      !!process.env.CI ||
      (!!data.UPSTASH_REDIS_REST_URL && !!data.UPSTASH_REDIS_REST_TOKEN),
    {
      message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production',
    },
  )
  .refine(
    (data) => {
      const hasUrl = !!data.UPSTASH_REDIS_REST_URL
      const hasToken = !!data.UPSTASH_REDIS_REST_TOKEN
      return hasUrl === hasToken
    },
    {
      message:
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set or both be absent',
    },
  )

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Reads process.env and parses through Zod schema.
 * Filters "undefined" strings — a Node.js footgun where
 * `process.env.X = undefined` produces the string "undefined".
 */
function parseRawServerEnv(): ServerEnv {
  const raw: Record<string, string | undefined> = {
    NODE_ENV: process.env.NODE_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    HEALTH_SECRET: process.env.HEALTH_SECRET,
  }

  for (const key of Object.keys(raw)) {
    if (raw[key] === 'undefined') {
      console.warn(`[env.server] Filtered "undefined" string from ${key}`)
      raw[key] = undefined
    }
  }

  return serverEnvSchema.parse(raw)
}

/**
 * Production/Development: parsed eagerly at startup (fail-fast).
 * Test / Build phase: Proxy that re-reads process.env on every access.
 *
 * During `next build`, NODE_ENV is "production" but env vars like
 * UPSTASH_REDIS_REST_URL may not be available (they're injected at runtime).
 * NEXT_PHASE is set by Next.js to "phase-production-build" during build.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

export const serverEnv: ServerEnv =
  process.env.NODE_ENV === 'test' || isBuildPhase
    ? new Proxy({} as ServerEnv, {
        get(_, prop: string) {
          return parseRawServerEnv()[prop as keyof ServerEnv]
        },
        ownKeys() {
          return Object.keys(parseRawServerEnv())
        },
        getOwnPropertyDescriptor(_, prop: string) {
          const parsed = parseRawServerEnv()
          if (prop in parsed) {
            return {
              configurable: true,
              enumerable: true,
              value: parsed[prop as keyof ServerEnv],
            }
          }
          return undefined
        },
      })
    : parseRawServerEnv()
