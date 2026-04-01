/**
 * Tests for xls-parser.ts — Web Worker wrapper for SheetJS legacy XLS parsing.
 *
 * The Worker itself runs in a separate thread and cannot be instantiated in jsdom.
 * We test the wrapper's contract: it creates a Worker, sends the buffer, and
 * correctly handles success, error from worker protocol, and onerror events.
 */

import { parseXls, type XlsParseResult } from '@/lib/xls-parser'

// Worker mock: captures postMessage calls and exposes event hooks
const mockTerminate = jest.fn()
const mockPostMessage = jest.fn()

let capturedOnMessage: ((event: MessageEvent<XlsParseResult | { error: string }>) => void) | null =
  null
let capturedOnError: ((error: ErrorEvent) => void) | null = null

const MockWorker = jest.fn().mockImplementation(() => ({
  terminate: mockTerminate,
  postMessage: mockPostMessage,
  set onmessage(cb: (event: MessageEvent<XlsParseResult | { error: string }>) => void) {
    capturedOnMessage = cb
  },
  set onerror(cb: (error: ErrorEvent) => void) {
    capturedOnError = cb
  },
}))

// Replace global Worker with mock
;(global as unknown as Record<string, unknown>).Worker = MockWorker

describe('xls-parser.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnMessage = null
    capturedOnError = null
  })

  describe('parseXls', () => {
    it('should create a Worker and post the buffer', () => {
      const buffer = new ArrayBuffer(8)
      // Don't await — just start to capture the call
      parseXls(buffer)

      expect(MockWorker).toHaveBeenCalledTimes(1)
      expect(mockPostMessage).toHaveBeenCalledWith({ buffer }, [buffer])
    })

    it('should resolve with parsed data on successful worker message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      const successResult: XlsParseResult = {
        columns: ['Name', 'Email'],
        rows: [{ Name: 'John', Email: 'john@test.com' }],
        rowCount: 1,
      }

      // Simulate worker success message
      capturedOnMessage!(new MessageEvent('message', { data: successResult }))

      const result = await promise

      expect(result).toEqual(successResult)
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('should terminate the worker after successful message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      capturedOnMessage!(
        new MessageEvent('message', {
          data: { columns: [], rows: [], rowCount: 0 },
        }),
      )

      await promise
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('should reject with error when worker sends { error: string }', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      capturedOnMessage!(
        new MessageEvent('message', {
          data: { error: 'No sheets found in workbook' },
        }),
      )

      await expect(promise).rejects.toThrow('No sheets found in workbook')
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('should reject with empty spreadsheet error from worker', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      capturedOnMessage!(
        new MessageEvent('message', {
          data: { error: 'Empty spreadsheet' },
        }),
      )

      await expect(promise).rejects.toThrow('Empty spreadsheet')
    })

    it('should reject with generic message on onerror (no info disclosure)', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // onerror always uses generic message to avoid leaking internal details
      capturedOnError!({ message: 'Worker crashed' } as ErrorEvent)

      await expect(promise).rejects.toThrow('Failed to parse XLS file')
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('should reject with same generic message when onerror has no message', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      capturedOnError!({ message: '' } as ErrorEvent)

      await expect(promise).rejects.toThrow('Failed to parse XLS file')
    })

    it('should terminate the worker on onerror', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      capturedOnError!({ message: 'Fatal error' } as ErrorEvent)

      await expect(promise).rejects.toThrow()
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })

    it('should transfer the buffer (zero-copy) in postMessage', () => {
      const buffer = new ArrayBuffer(16)
      parseXls(buffer)

      // Second argument to postMessage must be the transferable array
      expect(mockPostMessage).toHaveBeenCalledWith({ buffer }, [buffer])
    })

    it('should reject with timeout when worker takes too long', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // Advance past the 30s timeout
      jest.advanceTimersByTime(30_000)

      await expect(promise).rejects.toThrow('XLS parsing timed out')
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should ignore late messages after timeout', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // Timeout fires first
      jest.advanceTimersByTime(30_000)
      await expect(promise).rejects.toThrow('XLS parsing timed out')

      // Late message arrives — should be ignored (no double-resolve)
      capturedOnMessage!(
        new MessageEvent('message', {
          data: { columns: [], rows: [], rowCount: 0 },
        }),
      )

      // terminate called once for timeout, not again for late message
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should handle a large result with many columns and rows', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      const columns = Array.from({ length: 50 }, (_, i) => `Col${i}`)
      const rows = Array.from({ length: 1000 }, (_, i) =>
        Object.fromEntries(columns.map((c) => [c, `row${i}`])),
      )

      capturedOnMessage!(
        new MessageEvent('message', {
          data: { columns, rows, rowCount: 1000 },
        }),
      )

      const result = await promise
      expect(result.rowCount).toBe(1000)
      expect(result.columns).toHaveLength(50)
    })

    it('should not fire timeout rejection if promise already resolved (settled guard — line 32 branch)', async () => {
      jest.useFakeTimers()
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // Resolve BEFORE timeout fires — sets settled = true
      capturedOnMessage!(
        new MessageEvent('message', {
          data: { columns: ['A'], rows: [{ A: '1' }], rowCount: 1 },
        }),
      )

      // Flush microtasks so the promise resolves
      await Promise.resolve()

      // Advance past timeout — settled is already true, so the timeout
      // callback hits the `if (!settled)` false-branch and does nothing
      jest.advanceTimersByTime(30_000)

      const result = await promise
      expect(result.columns).toEqual(['A'])

      // terminate called exactly once (from the resolve path, not timeout)
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      jest.useRealTimers()
    })

    it('should ignore onerror after promise already resolved (settled guard — line 56 branch)', async () => {
      const buffer = new ArrayBuffer(8)
      const promise = parseXls(buffer)

      // Resolve first
      capturedOnMessage!(
        new MessageEvent('message', {
          data: { columns: ['B'], rows: [], rowCount: 0 },
        }),
      )

      await promise

      // Late onerror — should be ignored, no double-reject
      capturedOnError!({ message: 'Late crash' } as ErrorEvent)

      // terminate called once from the resolve path only
      expect(mockTerminate).toHaveBeenCalledTimes(1)
    })
  })
})
