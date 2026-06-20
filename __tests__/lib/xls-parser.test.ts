/**
 * Tests for xls-parser.ts — Web Worker wrapper for SheetJS parsing.
 *
 * The Worker runs in a separate thread and cannot be instantiated in jsdom.
 * We test the wrapper's contract: creates a Worker, sends the buffer, and
 * correctly handles success, worker-protocol errors (with code), and onerror.
 *
 * Protocol change (post-refactor):
 *   Error path: { error: string, code: ParseErrorCode }
 *   Success path: { columns, rows, rowCount }
 * Rejections must be SpreadsheetParseError instances with the correct .code.
 */

import { parseXls, type XlsParseResult } from '@/lib/xls-parser'
import { SpreadsheetParseError } from '@/lib/spreadsheet-errors'

// ── Worker mock ───────────────────────────────────────────────────────────────

const mockTerminate = jest.fn()
const mockPostMessage = jest.fn()

type WorkerMessageData = XlsParseResult | { error: string; code?: string }

let capturedOnMessage: ((event: MessageEvent<WorkerMessageData>) => void) | null = null
let capturedOnError: ((error: ErrorEvent) => void) | null = null

const MockWorker = jest.fn().mockImplementation(() => ({
  terminate: mockTerminate,
  postMessage: mockPostMessage,
  set onmessage(cb: (event: MessageEvent<WorkerMessageData>) => void) {
    capturedOnMessage = cb
  },
  set onerror(cb: (error: ErrorEvent) => void) {
    capturedOnError = cb
  },
}))

;(global as unknown as Record<string, unknown>).Worker = MockWorker

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendWorkerMessage(data: WorkerMessageData) {
  capturedOnMessage!(new MessageEvent('message', { data }))
}

function sendWorkerError(message: string) {
  capturedOnError!({ message } as ErrorEvent)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('xls-parser.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnMessage = null
    capturedOnError = null
  })

  describe('parseXls — setup', () => {
    it('creates a Worker and posts the buffer with zero-copy transfer', () => {
      const buffer = new ArrayBuffer(8)
      parseXls(buffer)
      expect(MockWorker).toHaveBeenCalledTimes(1)
      expect(mockPostMessage).toHaveBeenCalledWith({ buffer }, [buffer])
    })

    it('passes the buffer as the transferable argument (not a copy)', () => {
      const buffer = new ArrayBuffer(16)
      parseXls(buffer)
      const [, transferables] = mockPostMessage.mock.calls[0]
      expect(transferables).toContain(buffer)
    })
  })

  describe('parseXls — success path', () => {
    it('resolves with parsed data on successful worker message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      const successResult: XlsParseResult = {
        columns: ['Name', 'Email'],
        rows: [{ Name: 'John', Email: 'john@test.com' }],
        rowCount: 1,
      }
      sendWorkerMessage(successResult)

      const result = await promise
      expect(result).toEqual(successResult)
    })

    it('terminates the worker after a successful message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)
      sendWorkerMessage({ columns: [], rows: [], rowCount: 0 })
      await promise
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('handles a large result (50 columns, 1000 rows)', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      const columns = Array.from({ length: 50 }, (_, i) => `Col${i}`)
      const rows = Array.from({ length: 1000 }, (_, i) =>
        Object.fromEntries(columns.map((c) => [c, `row${i}`])),
      )
      sendWorkerMessage({ columns, rows, rowCount: 1000 })

      const result = await promise
      expect(result.rowCount).toBe(1000)
      expect(result.columns).toHaveLength(50)
    })
  })

  describe('parseXls — worker error protocol ({ error, code })', () => {
    it('rejects with SpreadsheetParseError when worker sends NO_SHEETS', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ error: 'No sheets found in workbook', code: 'NO_SHEETS' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('NO_SHEETS')
      expect(err.message).toBe('No sheets found in workbook')
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('rejects with code CORRUPT_FILE when worker sends corrupt file error', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ error: 'Could not read the spreadsheet file', code: 'CORRUPT_FILE' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('CORRUPT_FILE')
    })

    it('rejects with code EMPTY_SHEET when worker sends empty sheet error', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ error: 'Empty spreadsheet', code: 'EMPTY_SHEET' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('EMPTY_SHEET')
    })

    it('rejects with code NO_COLUMNS when worker sends no columns error', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ error: 'No columns found in first row', code: 'NO_COLUMNS' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('NO_COLUMNS')
    })

    it('rejects with code INVALID_INPUT when worker sends invalid input error', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ error: 'Invalid input: expected ArrayBuffer', code: 'INVALID_INPUT' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('INVALID_INPUT')
    })

    it('falls back to WORKER_ERROR code when worker sends error without code field', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // No `code` property — uses ?? 'WORKER_ERROR'
      sendWorkerMessage({ error: 'Something went wrong' })

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('WORKER_ERROR')
      expect(err.message).toBe('Something went wrong')
    })
  })

  describe('parseXls — onerror path', () => {
    it('rejects with SpreadsheetParseError(WORKER_ERROR) on onerror', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerError('Worker crashed')

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('WORKER_ERROR')
    })

    it('uses a safe generic message on onerror (no info disclosure)', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerError('Internal native crash — do not surface')

      const err = await promise.catch((e) => e)
      expect(err.message).toBe('Failed to parse spreadsheet')
    })

    it('uses the same generic message even when onerror has empty message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerError('')

      const err = await promise.catch((e) => e)
      expect(err.message).toBe('Failed to parse spreadsheet')
    })

    it('terminates the worker on onerror', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerError('Fatal error')

      await promise.catch(() => {})
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })
  })

  describe('parseXls — timeout', () => {
    it('rejects with SpreadsheetParseError(TIMEOUT) when worker exceeds 30s', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      jest.advanceTimersByTime(30_000)

      const err = await promise.catch((e) => e)
      expect(err).toBeInstanceOf(SpreadsheetParseError)
      expect(err.code).toBe('TIMEOUT')
      expect(err.message).toBe('Spreadsheet parsing timed out')
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('ignores late worker messages after timeout fires (settled guard)', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      jest.advanceTimersByTime(30_000)
      await promise.catch(() => {})

      // Late message arrives — must be silently ignored
      sendWorkerMessage({ columns: [], rows: [], rowCount: 0 })

      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })
  })

  describe('parseXls — settled guard (double-resolution prevention)', () => {
    it('does not fire timeout rejection when promise already resolved', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // Resolve first — sets settled = true
      sendWorkerMessage({ columns: ['A'], rows: [{ A: '1' }], rowCount: 1 })

      // Flush microtasks so the executor runs and settled=true before the timer fires
      await Promise.resolve()
      await Promise.resolve()

      // runAllTimers runs the setTimeout callback; settled=true → no-op inside it
      jest.runAllTimers()

      const result = await promise
      expect(result.columns).toEqual(['A'])
      // terminate called exactly once (from the resolve path, not from timeout)
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('ignores onerror after promise already resolved (settled guard)', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      sendWorkerMessage({ columns: ['B'], rows: [], rowCount: 0 })
      await promise

      // Late onerror — must be ignored
      sendWorkerError('Late crash')

      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })
  })
})
