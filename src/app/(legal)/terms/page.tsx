import type { Metadata } from 'next'
import {
  getServerLocale,
  getMessages,
  toOpenGraphLocale,
} from '@/lib/i18n/server'
import { SITE_URL } from '@/lib/constants'
import { TermsContent } from './components/TermsContent'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  return {
    title: messages.meta.termsTitle,
    description: messages.meta.termsDescription,
    alternates: {
      canonical: `${SITE_URL}/terms`,
    },
    openGraph: {
      title: messages.meta.termsTitle,
      description: messages.meta.termsDescription,
      url: `${SITE_URL}/terms`,
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
      type: 'website',
    },
  }
}

export default function TermsPage() {
  return <TermsContent />
}
