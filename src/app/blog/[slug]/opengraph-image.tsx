import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/constants'
import { getServerLocale } from '@/lib/i18n/server'
import { getPost } from '@/lib/blog/posts'
import { canonicalFromLocalizedSlug } from '@/lib/blog/slugs'
import ptBR from '@/lib/i18n/messages/pt-BR.json'

// nodejs (not edge): the article title is read from the filesystem via getPost,
// which uses node:fs — unavailable in the edge runtime.
export const runtime = 'nodejs'

export const alt = ptBR.blog.meta.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const siteHost = SITE_URL.replace(/^https?:\/\//, '')

export default async function BlogOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Resolve locale from the x-locale header (set by the proxy) first — social
  // crawlers send no cookies, so a cookie-only read would force pt-BR and show a
  // generic title on every non-pt-BR article OG image.
  const locale = await getServerLocale()

  const canonical = canonicalFromLocalizedSlug(slug, locale)
  const post = canonical ? await getPost(canonical, locale) : null
  const title = post?.frontmatter.title ?? ptBR.blog.meta.title

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          display: 'flex',
          background: 'linear-gradient(90deg, transparent 0%, #14b8a6 50%, transparent 100%)',
        }}
      />

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <svg viewBox="0 0 32 32" fill="none" width="40" height="40">
          <rect
            x="4"
            y="7"
            width="16"
            height="3"
            rx="1.5"
            fill="#14b8a6"
            transform="rotate(-8 20 8.5)"
          />
          <rect x="4" y="14.5" width="20" height="3" rx="1.5" fill="#14b8a6" />
          <rect
            x="4"
            y="22"
            width="16"
            height="3"
            rx="1.5"
            fill="#14b8a6"
            transform="rotate(8 20 23.5)"
          />
          <circle cx="26" cy="16" r="3" fill="#14b8a6" />
        </svg>
        <span
          style={{ fontSize: '34px', fontWeight: 700, color: '#fafaf9', letterSpacing: '-1px' }}
        >
          Tablix
        </span>
      </div>

      {/* Article title */}
      <div
        style={{
          fontSize: '60px',
          fontWeight: 700,
          color: '#fafaf9',
          lineHeight: 1.15,
          letterSpacing: '-1.5px',
          display: 'flex',
          maxWidth: '1000px',
        }}
      >
        {title}
      </div>

      {/* Site URL */}
      <div style={{ fontSize: '24px', color: '#78716c', display: 'flex' }}>{siteHost}</div>
    </div>,
    { ...size },
  )
}
