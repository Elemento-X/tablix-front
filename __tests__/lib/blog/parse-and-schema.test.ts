import { parseFrontmatter } from '@/lib/blog/posts'
import { frontmatterSchema } from '@/lib/blog/schema'

describe('parseFrontmatter', () => {
  it('parses keys, coerces integers and returns the body', () => {
    const raw = `---
title: Como juntar planilhas
description: Guia rápido
datePublished: 2026-06-21
order: 3
relatedLanding: /juntar-planilhas-excel
---
Corpo do artigo.`
    const { data, body } = parseFrontmatter(raw)
    expect(data.title).toBe('Como juntar planilhas')
    expect(data.description).toBe('Guia rápido')
    expect(data.datePublished).toBe('2026-06-21')
    expect(data.order).toBe(3)
    expect(data.relatedLanding).toBe('/juntar-planilhas-excel')
    expect(body.trim()).toBe('Corpo do artigo.')
  })

  it('strips surrounding quotes (single and double)', () => {
    const { data } = parseFrontmatter(
      `---\ntitle: "Aspas duplas"\ndescription: 'Aspas simples'\n---\n`,
    )
    expect(data.title).toBe('Aspas duplas')
    expect(data.description).toBe('Aspas simples')
  })

  it('keeps colons inside the value (splits on the first colon only)', () => {
    const { data } = parseFrontmatter(`---\ntitle: CSV ou XLSX: qual usar\n---\n`)
    expect(data.title).toBe('CSV ou XLSX: qual usar')
  })

  it('ignores comments and blank lines', () => {
    const { data } = parseFrontmatter(`---\n# um comentário\n\ntitle: T\n---\n`)
    expect(data.title).toBe('T')
    expect(Object.keys(data)).toEqual(['title'])
  })

  it('coerces negative integers', () => {
    const { data } = parseFrontmatter(`---\norder: -2\n---\n`)
    expect(data.order).toBe(-2)
  })

  it('returns the raw content as body when there is no frontmatter', () => {
    const raw = 'Sem frontmatter aqui.'
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({})
    expect(body).toBe(raw)
  })

  it('skips lines without a colon separator', () => {
    const { data } = parseFrontmatter(`---\ntitle: T\nlinhasoltasemdoispontos\n---\n`)
    expect(data).toEqual({ title: 'T' })
  })

  it('handles CRLF line endings (Windows files)', () => {
    const raw = '---\r\ntitle: CRLF Title\r\ndescription: D\r\norder: 7\r\n---\r\nCRLF body.'
    const { data, body } = parseFrontmatter(raw)
    expect(data.title).toBe('CRLF Title')
    expect(data.description).toBe('D')
    expect(data.order).toBe(7)
    expect(body).toBe('CRLF body.')
  })

  it('treats an empty frontmatter block (---\\n---\\n) as no frontmatter — regex requires at least one field line', () => {
    // The regex /^---\r?\n([\s\S]*?)\r?\n---/ cannot match when the first
    // captured group would need to be empty (no newline available between the two ---).
    // Result: the whole raw string is returned as-is with data = {}.
    const raw = '---\n---\nSome body.'
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({})
    expect(body).toBe(raw)
  })

  it('strips only the outermost quote pair — inner same-type quotes are preserved', () => {
    // Documenting the parser's actual contract: slice(1,-1) targets the outer pair only.
    // e.g. title: "A" or "B"  →  A" or "B
    const { data } = parseFrontmatter('---\ntitle: "A" or "B"\n---\n')
    expect(data.title).toBe('A" or "B')
  })

  it('does not coerce floating-point numeric values — keeps as string', () => {
    // Only bare integers match /^-?\d+$/; floats remain strings and will fail schema.
    const { data } = parseFrontmatter('---\norder: 1.5\n---\n')
    expect(typeof data.order).toBe('string')
    expect(data.order).toBe('1.5')
  })

  it('preserves --- HR separators in the body (non-greedy regex captures first block only)', () => {
    const raw =
      '---\ntitle: T\ndescription: D\ndatePublished: 2026-01-01\n---\nParagraph.\n\n---\n\nAfter HR.'
    const { data, body } = parseFrontmatter(raw)
    expect(data.title).toBe('T')
    // The body must not start with the frontmatter delimiter
    expect(body.trimStart().startsWith('---')).toBe(false)
    // But the HR in the body is preserved intact
    expect(body).toContain('---')
    expect(body).toContain('After HR.')
  })

  it('produces an empty string value for a key with nothing after the colon', () => {
    const { data } = parseFrontmatter('---\ntitle: \n---\n')
    expect(data.title).toBe('')
  })

  it('passes a value containing "=" through unchanged', () => {
    const { data } = parseFrontmatter('---\ndescription: key=value pair\n---\n')
    expect(data.description).toBe('key=value pair')
  })
})

describe('frontmatterSchema', () => {
  const valid = {
    title: 'Título',
    description: 'Descrição',
    datePublished: '2026-06-21',
  }

  it('accepts a minimal valid frontmatter and defaults order to 0', () => {
    const parsed = frontmatterSchema.parse(valid)
    expect(parsed.order).toBe(0)
    expect(parsed.dateModified).toBeUndefined()
  })

  it('rejects a missing title', () => {
    expect(frontmatterSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  it('rejects an invalid datePublished format', () => {
    expect(frontmatterSchema.safeParse({ ...valid, datePublished: '21/06/2026' }).success).toBe(
      false,
    )
  })

  it('rejects a relatedLanding that does not start with "/"', () => {
    expect(
      frontmatterSchema.safeParse({ ...valid, relatedLanding: 'juntar-planilhas-excel' }).success,
    ).toBe(false)
  })

  it('rejects a description longer than 200 chars', () => {
    expect(frontmatterSchema.safeParse({ ...valid, description: 'x'.repeat(201) }).success).toBe(
      false,
    )
  })

  it('accepts a valid dateModified', () => {
    const parsed = frontmatterSchema.parse({ ...valid, dateModified: '2026-06-22' })
    expect(parsed.dateModified).toBe('2026-06-22')
  })

  it('accepts a title at the exact maximum length of 80 chars', () => {
    expect(frontmatterSchema.safeParse({ ...valid, title: 'x'.repeat(80) }).success).toBe(true)
  })

  it('rejects a title longer than 80 chars', () => {
    expect(frontmatterSchema.safeParse({ ...valid, title: 'x'.repeat(81) }).success).toBe(false)
  })

  it('accepts a description at the exact maximum length of 200 chars', () => {
    expect(frontmatterSchema.safeParse({ ...valid, description: 'x'.repeat(200) }).success).toBe(
      true,
    )
  })

  it('rejects an invalid dateModified format', () => {
    expect(frontmatterSchema.safeParse({ ...valid, dateModified: '2026/06/22' }).success).toBe(
      false,
    )
  })

  it('rejects a non-integer order value (float as string from parseFrontmatter)', () => {
    // parseFrontmatter yields '1.5' (string) for order: 1.5; schema must reject it.
    expect(frontmatterSchema.safeParse({ ...valid, order: '1.5' }).success).toBe(false)
  })
})
