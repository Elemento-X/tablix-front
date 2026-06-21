// Branch coverage for posts.ts paths that real content can't trigger:
// locale fallback, invalid-frontmatter throw, and a missing content dir.
jest.mock('node:fs', () => ({
  promises: { readFile: jest.fn(), readdir: jest.fn() },
}))

import { promises as fs } from 'node:fs'
import { getPost, getAllSlugs, getAllPostsMeta } from '@/lib/blog/posts'

const readFile = fs.readFile as jest.Mock
const readdir = fs.readdir as jest.Mock

const VALID_MDX = `---
title: Título
description: Descrição
datePublished: 2026-06-21
order: 1
---
Corpo.`

const mdx = (order: number, date: string) =>
  `---\ntitle: T${order}\ndescription: D\ndatePublished: ${date}\norder: ${order}\n---\nCorpo.`
const dir = (name: string) => ({ name, isDirectory: () => true })

beforeEach(() => {
  readFile.mockReset()
  readdir.mockReset()
})

describe('getPost — locale fallback', () => {
  it('falls back to the default locale when the requested locale is missing', async () => {
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    readFile
      .mockRejectedValueOnce(enoent) // requested locale (en) missing
      .mockResolvedValueOnce(VALID_MDX) // default locale (pt-BR) present

    const post = await getPost('guia-x', 'en')
    expect(post?.frontmatter.title).toBe('Título')
    expect(readFile).toHaveBeenCalledTimes(2)
  })
})

describe('getPost — invalid frontmatter', () => {
  it('throws when the frontmatter fails validation', async () => {
    // Missing required title.
    readFile.mockResolvedValue(`---\ndescription: D\ndatePublished: 2026-06-21\n---\nCorpo.`)
    await expect(getPost('guia-x', 'pt-BR')).rejects.toThrow(/Invalid frontmatter/)
  })
})

describe('getAllSlugs — missing content dir', () => {
  it('returns an empty array when the directory cannot be read', async () => {
    readdir.mockRejectedValue(new Error('ENOENT'))
    expect(await getAllSlugs()).toEqual([])
  })
})

describe('getAllPostsMeta — ghost slug (both locale files missing)', () => {
  it('skips a slug when neither the requested locale nor the default locale file can be read', async () => {
    // Covers the `if (!parsed) return null` branch in getAllPostsMeta (line 108).
    // The slug directory exists (getAllSlugs returns it) but every readFile call throws.
    readdir.mockResolvedValue([dir('ghost')])
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })
    readFile.mockRejectedValue(enoent)

    const metas = await getAllPostsMeta('en')
    expect(metas).toHaveLength(0)
    // Two attempts: once for 'en', once for the defaultLocale fallback 'pt-BR'.
    expect(readFile).toHaveBeenCalledTimes(2)
  })
})

describe('getAllPostsMeta — fallback, skip and tie-break', () => {
  it('falls back per locale, skips invalid frontmatter and sorts ties by date desc', async () => {
    readdir.mockResolvedValue([dir('alpha'), dir('beta'), dir('gamma')])
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' })

    readFile.mockImplementation(async (p: string) => {
      const path = String(p)
      if (path.includes('alpha')) {
        if (path.includes('en.mdx')) throw enoent // missing → falls back to pt-BR
        return mdx(1, '2026-06-21')
      }
      if (path.includes('beta')) {
        // Missing title → invalid frontmatter → skipped from the listing.
        return `---\ndescription: D\ndatePublished: 2026-06-21\n---\nCorpo.`
      }
      if (path.includes('gamma')) return mdx(1, '2026-06-22')
      throw enoent
    })

    const metas = await getAllPostsMeta('en')
    // beta dropped; alpha and gamma share order 1 → newer date first.
    expect(metas.map((m) => m.slug)).toEqual(['gamma', 'alpha'])
  })
})
