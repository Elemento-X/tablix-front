/**
 * @jest-environment jsdom
 */

const mockInit = jest.fn()
const mockOptInCapturing = jest.fn()
const mockDebug = jest.fn()
const mockCapture = jest.fn()

const mockPosthog = {
  init: (...args: unknown[]) => mockInit(...args),
  opt_in_capturing: mockOptInCapturing,
  debug: mockDebug,
  capture: mockCapture,
}

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: mockPosthog,
}))

let initPostHog: typeof import('@/lib/analytics/posthog').initPostHog
let getPostHog: typeof import('@/lib/analytics/posthog').getPostHog
let optInCapturing: typeof import('@/lib/analytics/posthog').optInCapturing

beforeEach(() => {
  jest.resetModules()
  mockInit.mockClear()
  mockOptInCapturing.mockClear()
  mockDebug.mockClear()
  mockCapture.mockClear()
  delete (process.env as Record<string, unknown>).NEXT_PUBLIC_POSTHOG_KEY
  delete (process.env as Record<string, unknown>).NEXT_PUBLIC_POSTHOG_HOST
})

async function loadModule() {
  const mod = await import('@/lib/analytics/posthog')
  initPostHog = mod.initPostHog
  getPostHog = mod.getPostHog
  optInCapturing = mod.optInCapturing
}

describe('posthog.ts', () => {
  describe('initPostHog()', () => {
    it('returns null when NEXT_PUBLIC_POSTHOG_KEY is not set', async () => {
      await loadModule()
      const result = await initPostHog()
      expect(result).toBeNull()
      expect(mockInit).not.toHaveBeenCalled()
    })

    it('calls posthog.init with correct config when key is set', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()

      const result = await initPostHog()
      expect(result).not.toBeNull()
      expect(mockInit).toHaveBeenCalledTimes(1)

      const [key, config] = mockInit.mock.calls[0]
      expect(key).toBe('phc_test123')
      expect(config.persistence).toBe('memory')
      expect(config.autocapture).toBe(false)
      expect(config.capture_pageview).toBe(false)
      expect(config.disable_session_recording).toBe(true)
      expect(config.opt_out_capturing_by_default).toBe(true)
      expect(config.ip).toBe(false)
      expect(config.person_profiles).toBe('identified_only')
      expect(config.property_denylist).toEqual(['$device_id'])
    })

    it('uses default host when NEXT_PUBLIC_POSTHOG_HOST is not set', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()
      await initPostHog()

      const [, config] = mockInit.mock.calls[0]
      expect(config.api_host).toBe('https://us.i.posthog.com')
    })

    it('uses custom host when NEXT_PUBLIC_POSTHOG_HOST is set', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com'
      await loadModule()
      await initPostHog()

      const [, config] = mockInit.mock.calls[0]
      expect(config.api_host).toBe('https://eu.i.posthog.com')
    })

    it('returns singleton on subsequent calls', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()

      const first = await initPostHog()
      const second = await initPostHog()
      expect(first).toBe(second)
      expect(mockInit).toHaveBeenCalledTimes(1)
    })

    it('resets initPromise on failure so retry is possible', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()

      // Make init throw on first call to trigger the .catch() path
      mockInit.mockImplementationOnce(() => {
        throw new Error('Init failed')
      })

      const result1 = await initPostHog()
      expect(result1).toBeNull()

      // Second call should retry (initPromise was reset by .catch)
      const result2 = await initPostHog()
      expect(result2).not.toBeNull()
      expect(mockInit).toHaveBeenCalledTimes(2)
    })
  })

  describe('getPostHog()', () => {
    it('returns null before init', async () => {
      await loadModule()
      expect(getPostHog()).toBeNull()
    })

    it('returns client after init', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()
      await initPostHog()
      expect(getPostHog()).not.toBeNull()
    })
  })

  describe('optInCapturing()', () => {
    it('calls client.opt_in_capturing when initialized', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()
      await initPostHog()
      await optInCapturing()
      expect(mockOptInCapturing).toHaveBeenCalledTimes(1)
    })

    it('initializes and then opts in when client is not yet loaded', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()
      // Don't call initPostHog first — optInCapturing should handle it
      await optInCapturing()
      expect(mockInit).toHaveBeenCalledTimes(1)
      expect(mockOptInCapturing).toHaveBeenCalledTimes(1)
    })

    it('is no-op when key is missing', async () => {
      await loadModule()
      await optInCapturing()
      expect(mockOptInCapturing).not.toHaveBeenCalled()
    })
  })

  describe('privacy config', () => {
    it('disables all automatic data collection', async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test123'
      await loadModule()
      await initPostHog()

      const [, config] = mockInit.mock.calls[0]
      expect(config.mask_all_text).toBe(true)
      expect(config.mask_all_element_attributes).toBe(true)
      expect(config.disable_surveys).toBe(true)
      expect(config.advanced_disable_flags).toBe(true)
      expect(config.capture_pageleave).toBe(false)
    })
  })
})
