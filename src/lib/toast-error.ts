import { toast } from 'sonner'
import { FetchError } from '@/lib/fetch-client'
import { SpreadsheetParseError, type ParseErrorCode } from '@/lib/spreadsheet-errors'
import { getPlanName } from '@/lib/plan-name'

const FETCH_ERROR_KEY_MAP: Record<string, string> = {
  offline: 'errors.offline',
  timeout: 'errors.timeout',
  server: 'errors.serverError',
  'rate-limit': 'errors.rateLimited',
}

/**
 * Map each parse error code to a descriptive i18n key. Every code resolves to a
 * message that reflects what actually happened — never a generic "parse failed".
 * UNKNOWN/WORKER_ERROR fall back to a safe message that does not leak internals.
 */
const PARSE_CODE_KEY_MAP: Record<ParseErrorCode, string> = {
  CORRUPT_FILE: 'errors.parseCorrupt',
  NO_SHEETS: 'errors.parseNoSheets',
  EMPTY_SHEET: 'errors.parseEmpty',
  NO_COLUMNS: 'errors.parseNoColumns',
  ROW_LIMIT: 'errors.parseRowLimit',
  UNSUPPORTED_FORMAT: 'errors.parseUnsupported',
  TIMEOUT: 'errors.timeout',
  INVALID_INPUT: 'errors.parseFailed',
  WORKER_ERROR: 'errors.parseFailed',
  UNKNOWN: 'errors.parseFailed',
}

/**
 * Show a toast for fetch/parse errors with i18n-aware messages.
 *
 * Handles FetchError types (offline, timeout, server, rate-limit) and
 * SpreadsheetParseError codes (corrupt, no columns, no sheets, empty, row limit…).
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

  if (err instanceof SpreadsheetParseError) {
    const key = PARSE_CODE_KEY_MAP[err.code] ?? fallbackKey
    // params.plan carries the plan TYPE ("free") — resolve to the localized name.
    const params = err.params?.plan
      ? { ...err.params, plan: getPlanName(t, err.params.plan) }
      : err.params
    toast.error(t(key, params))
    return
  }

  toast.error(t(fallbackKey))
}
