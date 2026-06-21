/**
 * Tests for src/app/blog/[slug]/opengraph-image.tsx
 * Focus: locale is resolved from the x-locale header (via getServerLocale), NOT
 * a cookie — social crawlers send no cookies, so the localized article title must
 * still render. Also validates the canonical-slug resolution feeding getPost.
 */

jest.mock('next/og', () => ({
  ImageResponse: jest.fn().mockImplementation(function (this: object) {
    return { type: 'image-response', mocked: true }
  }),
}))

const mockGetServerLocale = jest.fn()
jest.mock('@/lib/i18n/server', () => ({
  getServerLocale: () => mockGetServerLocale(),
}))

const mockGetPost = jest.fn()
jest.mock('@/lib/blog/posts', () => ({
  getPost: (slug: string, locale: string) => mockGetPost(slug, locale),
}))

const params = (slug: string) => Promise.resolve({ slug })

describe('blog opengraph-image metadata exports', () => {
  it('runs on the nodejs runtime (fs read needs it)', async () => {
    const mod = await import('@/app/blog/[slug]/opengraph-image')
    expect(mod.runtime).toBe('nodejs')
  })

  it('exports 1200x630 png with non-empty alt mentioning Tablix', async () => {
    const mod = await import('@/app/blog/[slug]/opengraph-image')
    expect(mod.size).toEqual({ width: 1200, height: 630 })
    expect(mod.contentType).toBe('image/png')
    expect(mod.alt).toContain('Tablix')
  })
})

describe('blog opengraph-image locale resolution', () => {
  beforeEach(() => {
    mockGetServerLocale.mockReset()
    mockGetPost.mockReset()
  })

  it('resolves the localized slug to its canonical and loads the post in the header locale', async () => {
    mockGetServerLocale.mockResolvedValue('en')
    mockGetPost.mockResolvedValue({
      slug: 'como-juntar-planilhas-no-excel',
      frontmatter: { title: 'How to merge spreadsheets in Excel' },
      body: '',
    })

    const mod = await import('@/app/blog/[slug]/opengraph-image')
    const { ImageResponse } = await import('next/og')
    ;(ImageResponse as jest.Mock).mockClear()

    await mod.default({ params: params('how-to-merge-spreadsheets-in-excel') })

    // The localized EN slug must resolve to the canonical pt-BR directory slug,
    // loaded under the header-derived locale (en) — not a cookie default.
    expect(mockGetPost).toHaveBeenCalledWith('como-juntar-planilhas-no-excel', 'en')
    expect(ImageResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 1200, height: 630 }),
    )
  })

  it('falls back to a generic title (still renders an image) when the article is missing', async () => {
    mockGetServerLocale.mockResolvedValue('en')
    mockGetPost.mockResolvedValue(null)

    const mod = await import('@/app/blog/[slug]/opengraph-image')
    const { ImageResponse } = await import('next/og')
    ;(ImageResponse as jest.Mock).mockClear()

    const result = await mod.default({ params: params('how-to-merge-spreadsheets-in-excel') })
    expect(result).toBeDefined()
    expect(ImageResponse).toHaveBeenCalled()
  })

  it('uses the slug directly as canonical for the default locale (pt-BR)', async () => {
    mockGetServerLocale.mockResolvedValue('pt-BR')
    mockGetPost.mockResolvedValue({
      slug: 'como-juntar-planilhas-no-excel',
      frontmatter: { title: 'Como juntar planilhas no Excel' },
      body: '',
    })

    const mod = await import('@/app/blog/[slug]/opengraph-image')
    await mod.default({ params: params('como-juntar-planilhas-no-excel') })

    expect(mockGetPost).toHaveBeenCalledWith('como-juntar-planilhas-no-excel', 'pt-BR')
  })

  it('does not load a post when the canonical pt-BR slug is requested under a non-default locale', async () => {
    // canonicalFromLocalizedSlug returns null here → no getPost call, generic image.
    mockGetServerLocale.mockResolvedValue('en')

    const mod = await import('@/app/blog/[slug]/opengraph-image')
    const { ImageResponse } = await import('next/og')
    ;(ImageResponse as jest.Mock).mockClear()

    const result = await mod.default({ params: params('como-juntar-planilhas-no-excel') })
    expect(mockGetPost).not.toHaveBeenCalled()
    expect(result).toBeDefined()
    expect(ImageResponse).toHaveBeenCalled()
  })
})
