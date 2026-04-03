import type React from 'react'
import type { Metadata } from 'next'
// eslint-disable-next-line camelcase
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/i18n'
import { getServerLocale, getMessages } from '@/lib/i18n/server'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { CookieConsent } from '@/components/cookie-consent'
import { SkipLink } from '@/components/skip-link'
import { SITE_URL } from '@/lib/constants'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'] })
// eslint-disable-next-line camelcase
const geistMono = Geist_Mono({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  // hreflang requires different URLs per locale (e.g., /en/, /es/).
  // Since Tablix uses client-side locale switching without URL-based routing,
  // hreflang tags would all point to the same URL — which Google ignores.
  // This will be added when locale-based routing is implemented.

  return {
    title: messages.meta.title,
    description: messages.meta.description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      url: SITE_URL,
      siteName: 'Tablix',
      locale: locale === 'pt-BR' ? 'pt_BR' : locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: messages.meta.title,
      description: messages.meta.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        {
          url: '/icon-light-32x32.png',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/icon-dark-32x32.png',
          media: '(prefers-color-scheme: dark)',
        },
        {
          url: '/icon.svg',
          type: 'image/svg+xml',
        },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const locale = await getServerLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistMono.className} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          nonce={nonce}
        >
          <LocaleProvider>
            <SkipLink />
            {children}
            <Analytics />
            <Toaster position="top-right" richColors />
            <CookieConsent />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
