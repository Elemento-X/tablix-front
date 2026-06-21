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

  // HowTo schema from the "How it works" section (4 steps) — eligible for rich results.
  const steps = messages.howItWorks.steps
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: messages.howItWorks.title,
    inLanguage: locale,
    step: [steps.upload, steps.visualize, steps.choose, steps.generate].map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.description,
    })),
  }

  const escapeJsonLd = (obj: unknown) =>
    JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/-->/g, '--\\u003e')
      .replace(/]]>/g, ']]\\u003e')

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(howToJsonLd) }}
      />
      <LandingPageContent />
    </>
  )
}
