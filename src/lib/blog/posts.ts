import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { frontmatterSchema, type Post, type PostMeta } from './schema'
import { localizedBlogSlug } from './slugs'
import { defaultLocale, type Locale } from '@/lib/i18n/config'

/** Root of the article tree: content/blog/<slug>/<locale>.mdx */
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/**
 * Whitelist for slugs. The slug arrives from the URL ([slug] param), so it must
 * never be interpolated into a filesystem path without this guard — otherwise a
 * crafted value ("../../etc/passwd") could escape BLOG_DIR (path traversal).
 */
const SLUG_RE = /^[a-z0-9-]+$/

/**
 * Parse a YAML-ish frontmatter block. The input is fully author-controlled (our
 * own .mdx files), so a minimal `key: value` parser is enough and avoids pulling
 * a full YAML dependency. Values may contain colons (split on the first one),
 * support surrounding quotes, and coerce plain integers (e.g. `order`).
 */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }

  const [, block, body] = match
  const data: Record<string, unknown> = {}

  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sep = trimmed.indexOf(':')
    if (sep === -1) continue

    const key = trimmed.slice(0, sep).trim()
    let value = trimmed.slice(sep + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    data[key] = /^-?\d+$/.test(value) ? Number(value) : value
  }

  return { data, body }
}

/** Read+parse a single article file, or null if it doesn't exist. */
async function readArticle(
  slug: string,
  locale: Locale,
): Promise<{ data: Record<string, unknown>; body: string } | null> {
  if (!SLUG_RE.test(slug)) return null
  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, slug, `${locale}.mdx`), 'utf8')
    return parseFrontmatter(raw)
  } catch {
    return null
  }
}

/** Every article slug (one directory per slug), alphabetically sorted. */
export async function getAllSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && SLUG_RE.test(e.name))
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * Resolve a single post for a locale, falling back to the default locale when
 * the translation is missing (so a not-yet-translated article still renders in
 * pt-BR rather than 404-ing). Returns null if the article doesn't exist at all.
 * Throws on invalid frontmatter — that's an authoring bug, not a missing page.
 */
export async function getPost(slug: string, locale: Locale): Promise<Post | null> {
  const parsed = (await readArticle(slug, locale)) ?? (await readArticle(slug, defaultLocale))
  if (!parsed) return null

  const result = frontmatterSchema.safeParse(parsed.data)
  if (!result.success) {
    throw new Error(`Invalid frontmatter in blog/${slug} (${locale}): ${result.error.message}`)
  }

  return { slug, frontmatter: result.data, body: parsed.body }
}

/**
 * Resolve a list of guide slugs to {href, title} for the given locale, skipping
 * any that don't exist. Used by the transactional landings to link back to their
 * related guides (reciprocal hub-and-spoke internal linking).
 */
export async function getRelatedGuides(
  slugs: string[],
  locale: Locale,
): Promise<Array<{ href: string; title: string }>> {
  const posts = await Promise.all(slugs.map((slug) => getPost(slug, locale)))
  return posts
    .filter((p): p is Post => p !== null)
    .map((p) => ({
      href: `/blog/${localizedBlogSlug(p.slug, locale)}`,
      title: p.frontmatter.title,
    }))
}

/**
 * All posts' metadata for a locale (no MDX body), sorted by `order` then date
 * (newest first). Articles with broken frontmatter are skipped here (the listing
 * must not crash because of one bad file) — getPost still surfaces the error.
 */
export async function getAllPostsMeta(locale: Locale): Promise<PostMeta[]> {
  const slugs = await getAllSlugs()
  const metas = await Promise.all(
    slugs.map(async (slug) => {
      const parsed = (await readArticle(slug, locale)) ?? (await readArticle(slug, defaultLocale))
      if (!parsed) return null
      const result = frontmatterSchema.safeParse(parsed.data)
      return result.success ? ({ slug, frontmatter: result.data } satisfies PostMeta) : null
    }),
  )

  return metas
    .filter((m): m is PostMeta => m !== null)
    .sort(
      (a, b) =>
        a.frontmatter.order - b.frontmatter.order ||
        b.frontmatter.datePublished.localeCompare(a.frontmatter.datePublished),
    )
}
