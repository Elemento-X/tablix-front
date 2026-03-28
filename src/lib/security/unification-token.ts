import { randomBytes } from 'crypto'
import { storage } from '../redis'

const TOKEN_PREFIX = 'front:unification-token:'
const TOKEN_TTL_SECONDS = 5 * 60 // 5 minutes

/**
 * Generate a one-time unification token bound to a fingerprint
 * Stored in Redis with short TTL, consumed on use
 * Prevents replay attacks on /api/unification/complete
 */
export async function generateUnificationToken(fingerprint: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const key = `${TOKEN_PREFIX}${fingerprint}:${token}`

  // Store 1 as marker (token exists = valid)
  await storage.set(key, 1, TOKEN_TTL_SECONDS)

  return token
}

/**
 * Validate and consume a one-time unification token
 * Returns true if valid (correct fingerprint + not expired + not already used)
 */
export async function consumeUnificationToken(
  token: string,
  fingerprint: string,
): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return false
  }

  const key = `${TOKEN_PREFIX}${fingerprint}:${token}`
  const value = await storage.getAndDel(key)

  return value !== null
}
