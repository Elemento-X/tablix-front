/**
 * @jest-environment jsdom
 *
 * Separate test file to cover the production env branch of ErrorDisplay.
 * The `jest.mock` calls here override `@/config/env` with NODE_ENV='production'
 * before the module is imported, which is required to exercise the production
 * logging path (logs digest instead of message).
 */
import { render } from '@testing-library/react'
import { ErrorDisplay } from '@/components/error-display'

jest.mock('@/config/env', () => ({
  env: { NODE_ENV: 'production' },
}))

jest.mock('@/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}))

function makeError(message: string, digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string }
  if (digest) err.digest = digest
  return err
}

const baseProps = {
  reset: jest.fn(),
  logPrefix: 'ProdBoundary',
  titleKey: 'errorBoundary.title',
  descriptionKey: 'errorBoundary.description',
}

describe('ErrorDisplay — production env logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logs digest when production and digest is present', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = makeError('internal details', 'digest-abc-123')

    render(<ErrorDisplay {...baseProps} error={err} />)

    expect(consoleSpy).toHaveBeenCalledWith('[ProdBoundary]', 'digest-abc-123')
    consoleSpy.mockRestore()
  })

  it('logs "unknown" when production and digest is absent', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = makeError('internal details') // no digest

    render(<ErrorDisplay {...baseProps} error={err} />)

    expect(consoleSpy).toHaveBeenCalledWith('[ProdBoundary]', 'unknown')
    consoleSpy.mockRestore()
  })

  it('does NOT log error.message in production (hides internals from logs)', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = makeError('sensitive internal message', 'safe-digest')

    render(<ErrorDisplay {...baseProps} error={err} />)

    const calls = consoleSpy.mock.calls
    const loggedValues = calls.flatMap((args) => args)
    expect(loggedValues).not.toContain('sensitive internal message')
    consoleSpy.mockRestore()
  })
})
