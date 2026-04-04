import type { Metadata } from 'next'
import {
  getServerLocale,
  getMessages,
  toOpenGraphLocale,
} from '@/lib/i18n/server'
import { SITE_URL } from '@/lib/constants'
import { PrivacyPolicyContent } from './components/PrivacyPolicyContent'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  return {
    title: messages.meta.privacyTitle,
    description: messages.meta.privacyDescription,
    alternates: {
      canonical: `${SITE_URL}/privacy-policy`,
    },
    openGraph: {
      title: messages.meta.privacyTitle,
      description: messages.meta.privacyDescription,
      url: `${SITE_URL}/privacy-policy`,
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
      type: 'website',
    },
  }
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />
}
