/**
 * Domain errors for spreadsheet parsing.
 *
 * Kept in a dedicated module (no Worker / SheetJS imports) so it can be imported
 * anywhere — including mocked test contexts — without `instanceof` ever breaking.
 */

/**
 * Machine-readable parse error codes. Consumers map these to localized,
 * descriptive messages — never surface a generic "parse failed" to the user.
 */
export type ParseErrorCode =
  | 'INVALID_INPUT'
  | 'CORRUPT_FILE'
  | 'NO_SHEETS'
  | 'EMPTY_SHEET'
  | 'NO_COLUMNS'
  | 'ROW_LIMIT'
  | 'UNSUPPORTED_FORMAT'
  | 'TIMEOUT'
  | 'WORKER_ERROR'
  | 'UNKNOWN'

/** Error carrying a stable code (and optional params) for precise i18n mapping. */
export class SpreadsheetParseError extends Error {
  readonly code: ParseErrorCode
  readonly params?: Record<string, string>

  constructor(code: ParseErrorCode, message: string, params?: Record<string, string>) {
    super(message)
    this.name = 'SpreadsheetParseError'
    this.code = code
    this.params = params
  }
}
