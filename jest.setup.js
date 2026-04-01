import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { Blob } from 'buffer'

// Polyfill for Next.js web APIs
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.Blob = Blob

// Polyfill for Web Crypto API
if (typeof global.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { webcrypto } = require('crypto')
  global.crypto = webcrypto
}

// Polyfill for window.matchMedia (used by use-reduced-motion hook)
// Guard: only define when window exists (skips server-side test environments)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables
process.env.UPSTASH_REDIS_REST_URL = undefined
process.env.UPSTASH_REDIS_REST_TOKEN = undefined

// Mock @upstash/ratelimit to avoid ESM issues
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      remaining: 10,
      limit: 10,
      reset: Date.now() + 60000,
    }),
  })),
}))
