import { z } from 'zod'

/**
 * Public environment variables — safe for client and server bundles.
 *
 * Only NODE_ENV and NEXT_PUBLIC_* vars belong here.
 * Server-only secrets live in env.server.ts (guarded by `server-only`).
 *
 * VERCEL_ENV is NOT included — it's platform-injected and read directly
 * in proxy.ts where needed.
 *
 * Build-time Sentry vars (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
 * are NOT included — consumed by the Sentry webpack plugin, not our code.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['production', 'development', 'test'])
    .default('development'),

  // Sentry — public (inlined by Next.js at build time), optional (disabled when missing)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Reads process.env and parses through Zod schema.
 * Filters "undefined" strings — a Node.js footgun where
 * `process.env.X = undefined` produces the string "undefined".
 */
function parseRawEnv(): Env {
  const raw: Record<string, string | undefined> = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  }

  for (const key of Object.keys(raw)) {
    if (raw[key] === 'undefined') {
      console.warn(`[env] Filtered "undefined" string from ${key}`)
      raw[key] = undefined
    }
  }

  return envSchema.parse(raw)
}

/**
 * Production/Development: parsed eagerly at startup (fail-fast).
 * Test: Proxy that re-reads process.env on every access, so tests
 * that manipulate process.env work without mocking this module.
 */
export const env: Env =
  process.env.NODE_ENV === 'test'
    ? new Proxy({} as Env, {
        get(_, prop: string) {
          return parseRawEnv()[prop as keyof Env]
        },
        ownKeys() {
          return Object.keys(parseRawEnv())
        },
        getOwnPropertyDescriptor(_, prop: string) {
          const parsed = parseRawEnv()
          if (prop in parsed) {
            return {
              configurable: true,
              enumerable: true,
              value: parsed[prop as keyof Env],
            }
          }
          return undefined
        },
      })
    : parseRawEnv()
