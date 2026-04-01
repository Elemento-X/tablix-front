import type { NextRequest } from 'next/server'

type AuditAction =
  | 'upload.preview'
  | 'upload.process'
  | 'unification.complete'
  | 'rate_limit.hit'
  | 'quota.exceeded'
  | 'validation.failed'
  | 'csrf.blocked'
  | 'auth.token_invalid'

interface AuditEntry {
  action: AuditAction
  fingerprint?: string
  plan?: string
  ip?: string
  detail?: string
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    // Mask last octet for privacy
    const parts = first.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`
    }
    return '***'
  }
  return '***'
}

export function audit(request: NextRequest, entry: AuditEntry): void {
  const timestamp = new Date().toISOString()
  const ip = getClientIp(request)
  const method = request.method
  const path = request.nextUrl.pathname

  const log = {
    t: timestamp,
    action: entry.action,
    method,
    path,
    ip: entry.ip ?? ip,
    ...(entry.fingerprint && { fp: entry.fingerprint.slice(0, 8) + '...' }),
    ...(entry.plan && { plan: entry.plan }),
    ...(entry.detail && { detail: entry.detail }),
  }

  console.info('[AUDIT]', JSON.stringify(log))
}
