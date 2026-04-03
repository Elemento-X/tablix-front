import { ImageResponse } from 'next/og'
import { cookies } from 'next/headers'
import { type Locale, defaultLocale, locales } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/constants'
import ptBR from '@/lib/i18n/messages/pt-BR.json'
import en from '@/lib/i18n/messages/en.json'
import es from '@/lib/i18n/messages/es.json'

export const runtime = 'edge'

// alt is a static export (Next.js convention constraint — cannot be dynamic).
// Default locale (pt-BR) is used as the accessible fallback text.
export const alt = ptBR.meta.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const messages = { 'pt-BR': ptBR, en, es } as const

const siteHost = SITE_URL.replace(/^https?:\/\//, '')

// Social media crawlers (Twitter, Facebook, Slack, etc.) never send cookies,
// so the OG image will always render with defaultLocale (pt-BR) for them.
// Cookie-based locale only applies when a real user visits the OG endpoint directly.
export default async function OGImage() {
  const cookieStore = await cookies()
  const stored = cookieStore.get('tablix-locale')?.value
  const locale: Locale =
    stored && locales.includes(stored as Locale) ? (stored as Locale) : defaultLocale

  const t = messages[locale]

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Grid pattern overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          opacity: 0.06,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Teal accent line */}
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 700,
          }}
        >
          T
        </div>
        <span
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#fafaf9',
            letterSpacing: '-1px',
          }}
        >
          Tablix
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: '32px',
          fontWeight: 500,
          color: '#d6d3d1',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.4,
          display: 'flex',
        }}
      >
        {t.hero.title}
      </div>

      {/* Site URL */}
      <div
        style={{
          fontSize: '20px',
          color: '#78716c',
          marginTop: '16px',
          display: 'flex',
        }}
      >
        {siteHost}
      </div>
    </div>,
    { ...size },
  )
}
