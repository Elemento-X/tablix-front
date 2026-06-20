import { SpreadsheetParseError, type ParseErrorCode } from '@/lib/spreadsheet-errors'

describe('SpreadsheetParseError', () => {
  describe('constructor basics', () => {
    it('sets .code correctly', () => {
      const err = new SpreadsheetParseError('CORRUPT_FILE', 'bad file')
      expect(err.code).toBe('CORRUPT_FILE')
    })

    it('sets .message correctly', () => {
      const err = new SpreadsheetParseError('NO_SHEETS', 'no sheets found')
      expect(err.message).toBe('no sheets found')
    })

    it('sets .name to "SpreadsheetParseError"', () => {
      const err = new SpreadsheetParseError('UNKNOWN', 'something')
      expect(err.name).toBe('SpreadsheetParseError')
    })

    it('is instanceof Error', () => {
      const err = new SpreadsheetParseError('TIMEOUT', 'timed out')
      expect(err).toBeInstanceOf(Error)
    })

    it('is instanceof SpreadsheetParseError', () => {
      const err = new SpreadsheetParseError('NO_COLUMNS', 'no columns')
      expect(err).toBeInstanceOf(SpreadsheetParseError)
    })

    it('has a stack property (inherits from Error)', () => {
      const err = new SpreadsheetParseError('UNKNOWN', 'test')
      expect(typeof err.stack).toBe('string')
      expect(err.stack!.length).toBeGreaterThan(0)
    })
  })

  describe('params', () => {
    it('sets .params when provided', () => {
      const params = { total: '600', max: '500', plan: 'FREE' }
      const err = new SpreadsheetParseError('ROW_LIMIT', 'too many rows', params)
      expect(err.params).toEqual(params)
    })

    it('leaves .params undefined when not provided', () => {
      const err = new SpreadsheetParseError('EMPTY_SHEET', 'empty')
      expect(err.params).toBeUndefined()
    })

    it('accepts empty params object', () => {
      const err = new SpreadsheetParseError('ROW_LIMIT', 'msg', {})
      expect(err.params).toEqual({})
    })

    it('params values are accessible by key', () => {
      const err = new SpreadsheetParseError('ROW_LIMIT', 'msg', {
        total: '42',
        max: '10',
        plan: 'PRO',
      })
      expect(err.params!.total).toBe('42')
      expect(err.params!.max).toBe('10')
      expect(err.params!.plan).toBe('PRO')
    })
  })

  describe('all ParseErrorCode values', () => {
    const codes: ParseErrorCode[] = [
      'INVALID_INPUT',
      'CORRUPT_FILE',
      'NO_SHEETS',
      'EMPTY_SHEET',
      'NO_COLUMNS',
      'ROW_LIMIT',
      'UNSUPPORTED_FORMAT',
      'TIMEOUT',
      'WORKER_ERROR',
      'UNKNOWN',
    ]

    it.each(codes)('constructs with code %s without throwing', (code) => {
      expect(() => new SpreadsheetParseError(code, `msg for ${code}`)).not.toThrow()
    })

    it.each(codes)('instanceof Error is true for code %s', (code) => {
      expect(new SpreadsheetParseError(code, 'msg')).toBeInstanceOf(Error)
    })

    it.each(codes)('instanceof SpreadsheetParseError is true for code %s', (code) => {
      expect(new SpreadsheetParseError(code, 'msg')).toBeInstanceOf(SpreadsheetParseError)
    })

    it.each(codes)('.code matches constructor arg for %s', (code) => {
      expect(new SpreadsheetParseError(code, 'msg').code).toBe(code)
    })
  })

  describe('edge cases', () => {
    it('handles empty message string', () => {
      const err = new SpreadsheetParseError('UNKNOWN', '')
      expect(err.message).toBe('')
    })

    it('handles message with unicode and emojis', () => {
      const msg = 'Arquivo corrompido: é inválido'
      const err = new SpreadsheetParseError('CORRUPT_FILE', msg)
      expect(err.message).toBe(msg)
    })

    it('two independent instances do not share state', () => {
      const a = new SpreadsheetParseError('NO_SHEETS', 'msg-a', { x: '1' })
      const b = new SpreadsheetParseError('EMPTY_SHEET', 'msg-b', { x: '2' })
      expect(a.code).toBe('NO_SHEETS')
      expect(b.code).toBe('EMPTY_SHEET')
      expect(a.params!.x).toBe('1')
      expect(b.params!.x).toBe('2')
    })
  })
})
