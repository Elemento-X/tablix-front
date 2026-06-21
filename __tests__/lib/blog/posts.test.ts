import { getAllSlugs, getPost, getAllPostsMeta } from '@/lib/blog/posts'
import { locales } from '@/lib/i18n/config'

// Integration tests against the real content/blog tree.
describe('blog posts loader (real content)', () => {
  const EXPECTED_SLUGS = [
    'como-combinar-arquivos-csv',
    'como-juntar-planilhas-no-excel',
    'como-unir-varias-planilhas',
    'csv-ou-xlsx-qual-usar',
  ]

  describe('getAllSlugs', () => {
    it('returns the published slugs, sorted', async () => {
      const slugs = await getAllSlugs()
      expect(slugs).toEqual([...EXPECTED_SLUGS].sort())
    })

    it('every slug matches the safe slug pattern', async () => {
      const slugs = await getAllSlugs()
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/))
    })
  })

  describe('getPost', () => {
    it('loads a known post with frontmatter and a body free of frontmatter remnants', async () => {
      const post = await getPost('como-juntar-planilhas-no-excel', 'pt-BR')
      expect(post).not.toBeNull()
      expect(post?.frontmatter.title).toMatch(/Excel/)
      expect(post?.frontmatter.relatedLanding).toBe('/juntar-planilhas-excel')
      expect(post?.body.length).toBeGreaterThan(100)
      expect(post?.body.trimStart().startsWith('---')).toBe(false)
    })

    it('resolves every locale for every slug', async () => {
      for (const slug of EXPECTED_SLUGS) {
        for (const loc of locales) {
          const post = await getPost(slug, loc)
          expect(post?.slug).toBe(slug)
          expect(post?.frontmatter.title.length).toBeGreaterThan(0)
        }
      }
    })

    it('returns null for an unknown slug', async () => {
      expect(await getPost('does-not-exist', 'pt-BR')).toBeNull()
    })

    it('blocks path traversal in the slug', async () => {
      expect(await getPost('../../package', 'pt-BR')).toBeNull()
      expect(await getPost('foo/bar', 'pt-BR')).toBeNull()
      expect(await getPost('..%2f..%2fetc', 'pt-BR')).toBeNull()
    })

    it('returns null for a slug with uppercase letters (SLUG_RE only allows [a-z0-9-])', async () => {
      expect(await getPost('MySlug', 'pt-BR')).toBeNull()
      expect(await getPost('EXCEL', 'pt-BR')).toBeNull()
    })

    it('returns null for a slug containing accented or non-ASCII characters', async () => {
      expect(await getPost('guia-açúcar', 'pt-BR')).toBeNull()
      expect(await getPost('planilha-日本語', 'pt-BR')).toBeNull()
    })
  })

  describe('getAllPostsMeta', () => {
    it('returns all posts sorted by order ascending', async () => {
      const metas = await getAllPostsMeta('pt-BR')
      expect(metas).toHaveLength(EXPECTED_SLUGS.length)
      const orders = metas.map((m) => m.frontmatter.order)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    })

    it('every meta entry carries a valid title and description', async () => {
      const metas = await getAllPostsMeta('en')
      metas.forEach((m) => {
        expect(m.frontmatter.title.length).toBeGreaterThan(0)
        expect(m.frontmatter.description.length).toBeGreaterThan(0)
      })
    })
  })
})
