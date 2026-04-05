/**
 * @jest-environment jsdom
 */
import { toastFetchError } from '@/lib/toast-error'
import { FetchError } from '@/lib/fetch-client'

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toast: mockToast } = require('sonner')

// Minimal i18n translation mock — returns interpolated string for inspection
function t(key: string, params?: Record<string, string>): string {
  if (params) return `${key}:${JSON.stringify(params)}`
  return key
}

describe('toastFetchError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── FetchError types ──────────────────────────────────────────────────────

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
      toastFetchError(t, new FetchError('rate-limit', 'Too many requests', 429, 30000), 'fallback.key')
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

    it('calls toast.error exactly once per FetchError', () => {
      toastFetchError(t, new FetchError('server', 'err'), 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledTimes(1)
    })
  })

  // ── Parse error messages ─────────────────────────────────────────────────

  describe('parse error messages — row limit', () => {
    it('shows errors.parseRowLimit with extracted numbers and plan', () => {
      const err = new Error('exceeds row limit: 600 rows (max 500 for free plan)')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith(
        'errors.parseRowLimit:{"total":"600","max":"500","plan":"FREE"}',
      )
    })

    it('uppercases the plan name in row limit error', () => {
      const err = new Error('exceeds row limit: 5100 rows (max 5000 for pro plan)')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith(
        'errors.parseRowLimit:{"total":"5100","max":"5000","plan":"PRO"}',
      )
    })

    it('shows errors.parseRowLimit for enterprise plan', () => {
      const err = new Error('exceeds row limit: 99999 rows (max 50000 for enterprise plan)')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith(
        'errors.parseRowLimit:{"total":"99999","max":"50000","plan":"ENTERPRISE"}',
      )
    })
  })

  describe('parse error messages — structural errors', () => {
    it('shows errors.parseNoColumns when message contains "No columns found"', () => {
      const err = new Error('No columns found in spreadsheet')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoColumns')
    })

    it('shows errors.parseNoSheets when message contains "No sheets found"', () => {
      const err = new Error('No sheets found in workbook')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseNoSheets')
    })

    it('shows errors.parseEmpty when message contains "Empty spreadsheet"', () => {
      const err = new Error('Empty spreadsheet')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.parseEmpty')
    })
  })

  // ── Fallback path ────────────────────────────────────────────────────────

  describe('fallback path', () => {
    it('shows fallbackKey for generic Error without recognized message', () => {
      const err = new Error('Something went wrong entirely')
      toastFetchError(t, err, 'errors.genericFallback')
      expect(mockToast.error).toHaveBeenCalledWith('errors.genericFallback')
    })

    it('shows fallbackKey for Error with empty message', () => {
      const err = new Error('')
      toastFetchError(t, err, 'errors.empty')
      expect(mockToast.error).toHaveBeenCalledWith('errors.empty')
    })

    it('shows fallbackKey for plain object with message property', () => {
      const err = { message: 'Some plain object error' }
      toastFetchError(t, err, 'errors.plainObject')
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
  })

  // ── Priority: FetchError wins over message matching ──────────────────────

  describe('FetchError takes priority over message content', () => {
    it('does not match row limit pattern when error is a FetchError', () => {
      // FetchError whose message happens to contain row limit text — should use type mapping
      const err = new FetchError('server', 'exceeds row limit: 600 rows (max 500 for free plan)')
      toastFetchError(t, err, 'fallback.key')
      expect(mockToast.error).toHaveBeenCalledWith('errors.serverError')
    })
  })

  // ── Single toast call guarantee ──────────────────────────────────────────

  describe('always calls toast.error exactly once', () => {
    it.each([
      ['FetchError offline', new FetchError('offline', 'x')],
      ['FetchError server', new FetchError('server', 'x')],
      ['Row limit error', new Error('exceeds row limit: 10 rows (max 5 for free plan)')],
      ['No columns error', new Error('No columns found')],
      ['No sheets error', new Error('No sheets found')],
      ['Empty spreadsheet', new Error('Empty spreadsheet')],
      ['Generic error', new Error('generic')],
      ['null', null],
    ])('calls toast.error once for: %s', (_label, err) => {
      toastFetchError(t, err, 'fallback')
      expect(mockToast.error).toHaveBeenCalledTimes(1)
    })
  })
})
