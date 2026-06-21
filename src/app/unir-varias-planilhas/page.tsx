import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getServerLocale, getMessages, toOpenGraphLocale } from '@/lib/i18n/server'
import { buildAlternates, localizedUrl } from '@/lib/i18n/routing'
import { getRelatedGuides } from '@/lib/blog/posts'
import { UseCaseLanding } from '@/components/use-case-landing'

const PATH = '/unir-varias-planilhas'
const USE_CASE = 'combineMultiple'
const GUIDE_SLUGS = ['como-unir-varias-planilhas']

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const uc = getMessages(locale).useCases[USE_CASE]

  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    alternates: buildAlternates(locale, PATH),
    openGraph: {
      type: 'website',
      title: uc.metaTitle,
      description: uc.metaDescription,
      url: localizedUrl(locale, PATH),
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: uc.metaTitle,
      description: uc.metaDescription,
    },
  }
}

export default async function CombineMultipleLandingPage() {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()
  const uc = getMessages(locale).useCases[USE_CASE]
  const relatedGuides = await getRelatedGuides(GUIDE_SLUGS, locale)

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: uc.howToTitle,
    inLanguage: locale,
    step: [
      { '@type': 'HowToStep', position: 1, name: uc.step1Title, text: uc.step1Desc },
      { '@type': 'HowToStep', position: 2, name: uc.step2Title, text: uc.step2Desc },
      { '@type': 'HowToStep', position: 3, name: uc.step3Title, text: uc.step3Desc },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { q: uc.faq1Q, a: uc.faq1A },
      { q: uc.faq2Q, a: uc.faq2A },
      { q: uc.faq3Q, a: uc.faq3A },
    ].map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
  const escape = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: escape(faqJsonLd) }}
      />
      <UseCaseLanding useCaseKey={USE_CASE} relatedGuides={relatedGuides} />
    </>
  )
}
