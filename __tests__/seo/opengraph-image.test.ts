/**
 * Tests for src/app/opengraph-image.tsx and src/app/twitter-image.tsx
 * Validates exported metadata: size, contentType, alt, runtime
 * ImageResponse is mocked to allow calling the default export function.
 */

// Mock next/og before module imports to allow executing OGImage()
jest.mock('next/og', () => ({
  ImageResponse: jest.fn().mockImplementation(function (
    this: object,
    _element: unknown,
    _options: unknown,
  ) {
    // Return a mock response-like object
    return { type: 'image-response', mocked: true }
  }),
}))

// Mock next/headers for cookies() used in OGImage()
const mockCookieGet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}))

describe('opengraph-image metadata exports', () => {
  it('exports runtime as "edge"', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(mod.runtime).toBe('edge')
  })

  it('exports size with width 1200 and height 630', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(mod.size).toEqual({ width: 1200, height: 630 })
  })

  it('exports contentType as "image/png"', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(mod.contentType).toBe('image/png')
  })

  it('exports non-empty alt text', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(typeof mod.alt).toBe('string')
    expect(mod.alt.length).toBeGreaterThan(0)
  })

  it('alt text mentions Tablix', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(mod.alt).toContain('Tablix')
  })

  it('exports a default function', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(typeof mod.default).toBe('function')
  })

  it('default function is callable and returns an ImageResponse', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const mod = await import('@/app/opengraph-image')
    const result = await mod.default()
    expect(result).toBeDefined()
    // ImageResponse is mocked — verify it was called (function body executed)
    const { ImageResponse } = await import('next/og')
    expect(ImageResponse).toHaveBeenCalled()
  })

  it('default function passes size to ImageResponse', async () => {
    // Reset modules to get fresh mock
    jest.resetModules()
    jest.mock('next/headers', () => ({
      cookies: () => Promise.resolve({ get: mockCookieGet }),
    }))
    mockCookieGet.mockReturnValue(undefined)
    const { ImageResponse } = await import('next/og')
    ;(ImageResponse as jest.Mock).mockClear()
    const mod = await import('@/app/opengraph-image')
    await mod.default()
    expect(ImageResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 1200, height: 630 }),
    )
  })

  it('size width is numeric', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(typeof mod.size.width).toBe('number')
  })

  it('size height is numeric', async () => {
    const mod = await import('@/app/opengraph-image')
    expect(typeof mod.size.height).toBe('number')
  })
})

describe('twitter-image metadata exports', () => {
  it('exports runtime as "edge"', async () => {
    const mod = await import('@/app/twitter-image')
    expect(mod.runtime).toBe('edge')
  })

  it('exports size with width 1200 and height 630', async () => {
    const mod = await import('@/app/twitter-image')
    expect(mod.size).toEqual({ width: 1200, height: 630 })
  })

  it('exports contentType as "image/png"', async () => {
    const mod = await import('@/app/twitter-image')
    expect(mod.contentType).toBe('image/png')
  })

  it('exports non-empty alt text', async () => {
    const mod = await import('@/app/twitter-image')
    expect(typeof mod.alt).toBe('string')
    expect(mod.alt.length).toBeGreaterThan(0)
  })

  it('re-exports the same default function as opengraph-image', async () => {
    const og = await import('@/app/opengraph-image')
    const twitter = await import('@/app/twitter-image')
    expect(twitter.default).toBe(og.default)
  })

  it('alt text matches opengraph-image alt text', async () => {
    const og = await import('@/app/opengraph-image')
    const twitter = await import('@/app/twitter-image')
    expect(twitter.alt).toBe(og.alt)
  })
})
