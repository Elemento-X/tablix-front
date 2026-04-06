/**
 * @jest-environment jsdom
 */

const mockCapture = jest.fn()
let mockClient: { capture: jest.Mock } | null = null

jest.mock('@/lib/analytics/posthog', () => ({
  getPostHog: () => mockClient,
}))

import { trackEvent } from '@/lib/analytics/events'

beforeEach(() => {
  mockCapture.mockClear()
  mockClient = null
})

describe('events.ts', () => {
  describe('trackEvent()', () => {
    it('calls client.capture with event name and properties when PostHog is initialized', () => {
      mockClient = { capture: mockCapture }

      trackEvent('upload_started', { fileCount: 3, totalSizeMB: 2.5 })

      expect(mockCapture).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledWith('upload_started', {
        fileCount: 3,
        totalSizeMB: 2.5,
      })
    })

    it('is no-op when PostHog client is null', () => {
      mockClient = null

      trackEvent('upload_started', { fileCount: 1, totalSizeMB: 0.5 })

      expect(mockCapture).not.toHaveBeenCalled()
    })

    it('tracks landing_cta_click with locale', () => {
      mockClient = { capture: mockCapture }

      trackEvent('landing_cta_click', { locale: 'pt-BR' })

      expect(mockCapture).toHaveBeenCalledWith('landing_cta_click', { locale: 'pt-BR' })
    })

    it('tracks download_completed with all properties (client path)', () => {
      mockClient = { capture: mockCapture }

      trackEvent('download_completed', {
        fileCount: 3,
        rowCount: 500,
        selectedColumns: 5,
        processingMode: 'client',
        processTimeMs: 1234,
      })

      expect(mockCapture).toHaveBeenCalledWith('download_completed', {
        fileCount: 3,
        rowCount: 500,
        selectedColumns: 5,
        processingMode: 'client',
        processTimeMs: 1234,
      })
    })

    it('tracks download_completed with rowCount null (server path)', () => {
      mockClient = { capture: mockCapture }

      trackEvent('download_completed', {
        fileCount: 2,
        rowCount: null,
        selectedColumns: 3,
        processingMode: 'server',
        processTimeMs: 2500,
      })

      expect(mockCapture).toHaveBeenCalledWith('download_completed', {
        fileCount: 2,
        rowCount: null,
        selectedColumns: 3,
        processingMode: 'server',
        processTimeMs: 2500,
      })
    })

    it('tracks plan_limit_reached with limitType and usageBucket', () => {
      mockClient = { capture: mockCapture }

      trackEvent('plan_limit_reached', {
        limitType: 'fileCount',
        usageBucket: 'at_limit',
      })

      expect(mockCapture).toHaveBeenCalledWith('plan_limit_reached', {
        limitType: 'fileCount',
        usageBucket: 'at_limit',
      })
    })

    it('tracks upload_error with errorType', () => {
      mockClient = { capture: mockCapture }

      trackEvent('upload_error', { errorType: 'invalid_format', fileCount: 1 })

      expect(mockCapture).toHaveBeenCalledWith('upload_error', {
        errorType: 'invalid_format',
        fileCount: 1,
      })
    })
  })
})
