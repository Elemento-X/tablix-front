import { z } from 'zod'

/**
 * Frontmatter contract for every blog article (`content/blog/<slug>/<locale>.mdx`).
 *
 * Validated at load time so a malformed article fails loudly during build/dev
 * instead of silently shipping broken SEO metadata. Lengths are SEO-oriented
 * (title ≤ ~70, description ≤ ~160) but kept generous to avoid build breakage on
 * a slightly-long string — the @seo agent enforces the tighter target.
 */
export const frontmatterSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  /** ISO date (YYYY-MM-DD) the article was first published. */
  datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datePublished must be YYYY-MM-DD'),
  /** ISO date of the last meaningful edit. Defaults to datePublished. */
  dateModified: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateModified must be YYYY-MM-DD')
    .optional(),
  /**
   * Locale-free path of the transactional landing this guide funnels into.
   * Must be an internal path: a single leading "/" (rejects "//host" which the
   * browser treats as protocol-relative → open redirect).
   */
  relatedLanding: z
    .string()
    .regex(/^\/(?![/\\])/, 'relatedLanding must be an internal path starting with a single "/"')
    .optional(),
  /** Sort weight in the listing (lower = first). */
  order: z.number().int().default(0),
})

export type Frontmatter = z.infer<typeof frontmatterSchema>

/** A fully resolved article: its slug, validated frontmatter and raw MDX body. */
export interface Post {
  slug: string
  frontmatter: Frontmatter
  body: string
}

/** Listing-only shape: slug + frontmatter, no body (cheaper to load in bulk). */
export interface PostMeta {
  slug: string
  frontmatter: Frontmatter
}
