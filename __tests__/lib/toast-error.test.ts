/**
 * @jest-environment jsdom
 *
 * Tests for toastFetchError — maps FetchError types and SpreadsheetParseError codes
 * to i18n keys. Post-refactor: code-based mapping only (no message-pattern matching).
 */
import { toastFetchError } from '@/lib/toast-error'
import { FetchError } from '@/lib/fetch-client'
import { SpreadsheetParseError } from '@/lib/spreadsheet-errors'

// SpreadsheetParseError is NOT mocked — must be the real class for instanceof to work.

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toast: mockToast } = require('sonner')

/** Minimal i18n stub — returns the key, plus serialised params for inspection. */
function t(key: string, params?: Record<string, string>): string {
  if (params && Object.keys(params).length > 0) return `${key}:${JSON.stringify(params)}`
  return key
}

describe('toastFetchError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── FetchError type mapping ───────────────────────────────────────────────

  describe('FetchError type mapping', () => {
    it('shows errors.offline for FetchError(offline)', () => {
      toastFetchError(t, new FetchError('offline', 'No internet'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.offline')
    })

    it('shows errors.timeout for FetchError(timeout)', () => {
      toastFetchError(t, new FetchError('timeout', 'Request timed out'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.timeout')
    })

    it('shows errors.serverError for FetchError(server)', () => {
      toastFetchError(t, new FetchError('server', 'Server error'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
    })

    it('shows errors.rateLimited for FetchError(rate-limit)', () => {
      toastFetchError(
        t,
        new FetchError('rate-limit', 'Too many requests', 429, 30000),
        'fallback.key',
      )
      expect(mockToast.error).toHaveBeenCalledWith('errors.rateLimited')
    })

    it('shows fallbackKey for FetchError with unmapped type (client)', () => {
      toastFetchError(t, new FetchError('client', 'Client error', 400), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('fallback.key')
    })

    it('shows fallbackKey for FetchError with unmapped type (unknown)', () => {
      toastFetchError(t, new FetchError('unknown', 'Unknown error'), 'fallback.unknown')
      expect(mockToast.error).toHaveBeenCalledWith('fallback.unknown')
    })
  })

  // ── SpreadsheetParseError code mapping ────────────────────────────────────

  describe('SpreadsheetParseError — distinct i18n keys per code', () => {
    it('maps CORRUPT_FILE → errors.parseCorrupt', () => {
      toastFetchError(t, new SpreadsheetParseError('CORRUPT_FILE', 'bad file'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseCorrupt')
    })

    it('maps NO_SHEETS → errors.parseNoSheets', () => {
      toastFetchError(t, new SpreadsheetParseError('NO_SHEETS', 'no sheets'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoSheets')
    })

    it('maps EMPTY_SHEET → errors.parseEmpty', () => {
      toastFetchError(t, new SpreadsheetParseError('EMPTY_SHEET', 'empty'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseEmpty')
    })

    it('maps NO_COLUMNS → errors.parseNoColumns', () => {
      toastFetchError(t, new SpreadsheetParseError('NO_COLUMNS', 'no cols'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoColumns')
    })

    it('maps UNSUPPORTED_FORMAT → errors.parseUnsupported', () => {
      toastFetchError(t, new SpreadsheetParseError('UNSUPPORTED_FORMAT', 'bad format'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseUnsupported')
    })

    it('maps TIMEOUT → errors.timeout', () => {
      toastFetchError(t, new SpreadsheetParseError('TIMEOUT', 'timed out'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.timeout')
    })

    it('maps INVALID_INPUT → errors.parseFailed', () => {
      toastFetchError(t, new SpreadsheetParseError('INVALID_INPUT', 'invalid'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseFailed')
    })

    it('maps WORKER_ERROR → errors.parseFailed', () => {
      toastFetchError(t, new SpreadsheetParseError('WORKER_ERROR', 'worker crashed'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseFailed')
    })

    it('maps UNKNOWN → errors.parseFailed', () => {
      toastFetchError(t, new SpreadsheetParseError('UNKNOWN', 'unknown'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseFailed')
    })
  })

  describe('SpreadsheetParseError — ROW_LIMIT with params', () => {
    it('passes params to t() for ROW_LIMIT', () => {
      const params = { total: '600', max: '500', plan: 'FREE' }
      toastFetchError(
        t,
        new SpreadsheetParseError('ROW_LIMIT', 'too many rows', params),
        'fallback',
      )
      expect(mockToast.error).toHaveBeenCalledWith(`errors.parseRowLimit:${JSON.stringify(params)}`)
    })

    it('passes PRO plan params correctly', () => {
      const params = { total: '5100', max: '5000', plan: 'PRO' }
      toastFetchError(t, new SpreadsheetParseError('ROW_LIMIT', 'too many', params), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith(`errors.parseRowLimit:${JSON.stringify(params)}`)
    })

    it('passes ENTERPRISE plan params correctly', () => {
      const params = { total: '99999', max: '50000', plan: 'ENTERPRISE' }
      toastFetchError(t, new SpreadsheetParseError('ROW_LIMIT', 'too many', params), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith(`errors.parseRowLimit:${JSON.stringify(params)}`)
    })

    it('passes undefined params (no params property) without crashing', () => {
      // ROW_LIMIT without params — unusual but should not throw
      toastFetchError(t, new SpreadsheetParseError('ROW_LIMIT', 'too many'), 'fallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseRowLimit')
    })
  })

  // ── Fallback path (generic Error, plain objects, primitives) ─────────────

  describe('fallback path', () => {
    it('shows fallbackKey for generic Error (not SpreadsheetParseError)', () => {
      toastFetchError(t, new Error('Something went wrong'), 'errors.genericFallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.genericFallback')
    })

    it('shows fallbackKey for Error with empty message', () => {
      toastFetchError(t, new Error(''), 'errors.empty')
      expect(mockToast.error).toHaveBeenCalledWith('errors.empty')
    })

    it('shows fallbackKey for plain object with message property', () => {
      toastFetchError(t, { message: 'Some plain object' }, 'errors.plainObject')
      expect(mockToast.error).toHaveBeenCalledWith('errors.plainObject')
    })

    it('shows fallbackKey for null', () => {
      toastFetchError(t, null, 'errors.null')
      expect(mockToast.error).toHaveBeenCalledWith('errors.null')
    })

    it('shows fallbackKey for undefined', () => {
      toastFetchError(t, undefined, 'errors.undefined')
      expect(mockToast.error).toHaveBeenCalledWith('errors.undefined')
    })

    it('shows fallbackKey for number thrown', () => {
      toastFetchError(t, 42, 'errors.number')
      expect(mockToast.error).toHaveBeenCalledWith('errors.number')
    })

    it('shows fallbackKey for string thrown', () => {
      toastFetchError(t, 'raw string error', 'errors.string')
      expect(mockToast.error).toHaveBeenCalledWith('errors.string')
    })

    it('generic Error falls to fallback even if its message looks like a parse error (no message matching)', () => {
      // Confirms the old message-pattern matching is gone — only instanceof matters now
      toastFetchError(t, new Error('No columns found in spreadsheet'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('fallback.key')
    })

    it('generic Error with "No sheets found" message falls to fallback', () => {
      toastFetchError(t, new Error('No sheets found in workbook'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('fallback.key')
    })

    it('generic Error with row limit message falls to fallback', () => {
      toastFetchError(
        t,
        new Error('exceeds row limit: 600 rows (max 500 for free plan)'),
        'fallback.key',
      )
      expect(mockToast.error).toHaveBeenCalledWith('fallback.key')
    })
  })

  // ── Priority: FetchError is checked before SpreadsheetParseError ─────────

  describe('instanceof priority', () => {
    it('FetchError is handled via type mapping, not as fallback', () => {
      const err = new FetchError('server', 'server error')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
    })

    it('SpreadsheetParseError is handled via code mapping, not as fallback', () => {
      const err = new SpreadsheetParseError('NO_COLUMNS', 'no cols')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoColumns')
    })
  })

  // ── Single toast call guarantee ───────────────────────────────────────────

  describe('always calls toast.error exactly once per invocation', () => {
    it.each([
      ['FetchError offline', new FetchError('offline', 'x')],
      ['FetchError server', new FetchError('server', 'x')],
      ['SpreadsheetParseError CORRUPT_FILE', new SpreadsheetParseError('CORRUPT_FILE', 'x')],
      ['SpreadsheetParseError NO_SHEETS', new SpreadsheetParseError('NO_SHEETS', 'x')],
      ['SpreadsheetParseError EMPTY_SHEET', new SpreadsheetParseError('EMPTY_SHEET', 'x')],
      ['SpreadsheetParseError NO_COLUMNS', new SpreadsheetParseError('NO_COLUMNS', 'x')],
      [
        'SpreadsheetParseError ROW_LIMIT',
        new SpreadsheetParseError('ROW_LIMIT', 'x', { total: '10', max: '5', plan: 'FREE' }),
      ],
      ['SpreadsheetParseError UNKNOWN', new SpreadsheetParseError('UNKNOWN', 'x')],
      ['Generic Error', new Error('generic')],
      ['null', null],
    ])('calls toast.error once for: %s', (_label, err) => {
      toastFetchError(t, err, 'fallback')
      expect(mockToast.error).toHaveBeenCalledTimes(1)
    })
  })
})
