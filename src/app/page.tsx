import { headers } from 'next/headers'
import { getServerLocale, getMessages } from '@/lib/i18n/server'
import { SITE_URL } from '@/lib/constants'
import { LandingPageContent } from './components/LandingPageContent'

export default async function LandingPage() {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tablix',
    description: messages.meta.description,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: [locale],
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        description: messages.meta.description,
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '29.90',
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '29.90',
          priceCurrency: 'BRL',
          billingDuration: 'P1M',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd)
            .replace(/</g, '\\u003c')
            .replace(/-->/g, '--\\u003e')
            .replace(/]]>/g, ']]\\u003e'),
        }}
      />
      <LandingPageContent />
    </>
  )
}
