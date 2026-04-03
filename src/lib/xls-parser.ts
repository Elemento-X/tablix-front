/**
 * Wrapper for parsing legacy .xls (BIFF) files via Web Worker.
 *
 * SheetJS runs inside a Worker to isolate CVE-2023-30533 prototype pollution.
 * The Worker receives an ArrayBuffer and returns plain JSON — no prototype
 * pollution can escape to the main thread.
 */

export interface XlsParseResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

/** Timeout for Worker parsing (30 seconds) */
const WORKER_TIMEOUT_MS = 30_000

/**
 * Parse a .xls file using SheetJS in an isolated Web Worker.
 * Returns columns, rows and rowCount as plain JSON.
 * Terminates the Worker after response, error, or timeout.
 */
export function parseXls(buffer: ArrayBuffer): Promise<XlsParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./workers/xls-parser.worker.ts', import.meta.url),
    )

    let settled = false

    const timeoutId = setTimeout(() => {
      // istanbul ignore next — the false-branch (already settled when timeout fires)
      // is tested functionally in "settled guard — line 32 branch" but Istanbul cannot
      // track it because the closure executes outside the async instrumentation context
      // when using jest fake timers + Promise microtasks.
      if (!settled) {
        settled = true
        worker.terminate()
        reject(new Error('XLS parsing timed out'))
      }
    }, WORKER_TIMEOUT_MS)

    worker.onmessage = (
      event: MessageEvent<XlsParseResult | { error: string }>,
    ) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      worker.terminate()

      if ('error' in event.data) {
        reject(new Error(event.data.error))
        return
      }

      resolve(event.data)
    }

    worker.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      worker.terminate()
      reject(new Error('Failed to parse XLS file'))
    }

    // Transfer the buffer to avoid copying (zero-copy)
    worker.postMessage({ buffer }, [buffer])
  })
}
