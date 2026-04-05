import { toast } from 'sonner'
import { FetchError } from '@/lib/fetch-client'

const FETCH_ERROR_KEY_MAP: Record<string, string> = {
  offline: 'errors.offline',
  timeout: 'errors.timeout',
  server: 'errors.serverError',
  'rate-limit': 'errors.rateLimited',
}

/**
 * Show a toast for fetch/parse errors with i18n-aware messages.
 *
 * Handles FetchError types (offline, timeout, server, rate-limit) and
 * common parse errors from use-file-parser (row limit, no columns, no sheets, empty).
 *
 * @param t - i18n translation function
 * @param err - the caught error
 * @param fallbackKey - i18n key to use if no specific match is found
 */
export function toastFetchError(
  t: (key: string, params?: Record<string, string>) => string,
  err: unknown,
  fallbackKey: string,
) {
  if (err instanceof FetchError) {
    toast.error(t(FETCH_ERROR_KEY_MAP[err.type] ?? fallbackKey))
    return
  }

  const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
  if (msg) {
    const rowLimitMatch = msg.match(/exceeds row limit: (\d+) rows \(max (\d+) for (\w+) plan\)/)
    const validPlans = ['free', 'pro', 'enterprise']
    if (rowLimitMatch && validPlans.includes(rowLimitMatch[3].toLowerCase())) {
      toast.error(
        t('errors.parseRowLimit', {
          total: rowLimitMatch[1],
          max: rowLimitMatch[2],
          plan: rowLimitMatch[3].toUpperCase(),
        }),
      )
      return
    }
    if (msg.includes('No columns found')) {
      toast.error(t('errors.parseNoColumns'))
      return
    }
    if (msg.includes('No sheets found')) {
      toast.error(t('errors.parseNoSheets'))
      return
    }
    if (msg.includes('Empty spreadsheet')) {
      toast.error(t('errors.parseEmpty'))
      return
    }
  }

  toast.error(t(fallbackKey))
}
