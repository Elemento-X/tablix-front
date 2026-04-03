import ptBR from '@/lib/i18n/messages/pt-BR.json'

export const runtime = 'edge'

// alt is a static export (Next.js convention constraint — cannot be dynamic).
// Default locale (pt-BR) is used as the accessible fallback text.
export const alt = ptBR.meta.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export { default } from './opengraph-image'
