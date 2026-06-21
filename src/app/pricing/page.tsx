import type { Metadata } from 'next'
import { getServerLocale, getMessages } from '@/lib/i18n/server'
import { buildAlternates, localizedUrl } from '@/lib/i18n/routing'
import { headers } from 'next/headers'
import { PricingPageContent } from './components/PricingPageContent'
import { FAQ_KEYS } from './constants'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  const title = messages.pricingPage.metaTitle
  const description = messages.pricingPage.metaDescription
  const alternates = buildAlternates(locale, '/pricing')

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: localizedUrl(locale, '/pricing'),
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
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <PricingPageContent />
    </>
  )
}
