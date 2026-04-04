import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getServerLocale, getMessages } from '@/lib/i18n/server'
import { SITE_URL } from '@/lib/constants'
import { PricingPageContent } from './components/PricingPageContent'
import { FAQ_KEYS } from './constants'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  const title = messages.pricingPage.metaTitle
  const description = messages.pricingPage.metaDescription

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/pricing`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/pricing`,
    },
    twitter: {
      title,
      description,
    },
  }
}

export default async function PricingPage() {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: messages.pricingPage.faq.items[key].question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: messages.pricingPage.faq.items[key].answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <PricingPageContent />
    </>
  )
}
