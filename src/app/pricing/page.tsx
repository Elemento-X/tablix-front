import type { Metadata } from 'next'
import { getServerLocale, getMessages } from '@/lib/i18n/server'
import { SITE_URL } from '@/lib/constants'
import { PricingPageContent } from './components/PricingPageContent'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  const titles: Record<string, string> = {
    'pt-BR': `${messages.pricing.title} | Tablix`,
    en: `Plans & Pricing | Tablix`,
    es: `Planes y Precios | Tablix`,
  }

  const descriptions: Record<string, string> = {
    'pt-BR':
      'Compare os planos Free, Pro e Enterprise do Tablix. Comece gratis, sem cadastro.',
    en: 'Compare Tablix Free, Pro, and Enterprise plans. Start free, no signup needed.',
    es: 'Compare los planes Free, Pro y Enterprise de Tablix. Comience gratis, sin registro.',
  }

  return {
    title: titles[locale] ?? titles['pt-BR'],
    description: descriptions[locale] ?? descriptions['pt-BR'],
    alternates: {
      canonical: `${SITE_URL}/pricing`,
    },
  }
}

export default function PricingPage() {
  return <PricingPageContent />
}
