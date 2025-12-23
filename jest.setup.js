import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { Blob } from 'buffer'

// Polyfill for Next.js web APIs
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.Blob = Blob

// Polyfill for Web Crypto API
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto')
  global.crypto = webcrypto
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
