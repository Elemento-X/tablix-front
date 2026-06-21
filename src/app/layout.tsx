import type React from 'react'
import type { Metadata } from 'next'
// eslint-disable-next-line camelcase
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { LocaleProvider } from '@/lib/i18n'
import { getServerLocale, getMessages, toOpenGraphLocale } from '@/lib/i18n/server'
import { buildAlternates } from '@/lib/i18n/routing'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { CookieConsent } from '@/components/cookie-consent'
import { MotionProvider } from '@/components/motion-provider'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PostHogProvider } from '@/components/posthog-provider'
import { SkipLink } from '@/components/skip-link'
import { SITE_URL } from '@/lib/constants'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'] })

const geistMono = Geist_Mono({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const messages = getMessages(locale)

  // hreflang + canonical per locale, from the URL prefix resolved by proxy.ts.
  // This is the home ('/'); other pages override with their own path.
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    metadataBase: new URL(SITE_URL),
    alternates: buildAlternates(locale, '/'),
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      url: buildAlternates(locale, '/')?.canonical as string,
      siteName: 'Tablix',
      locale: toOpenGraphLocale(locale),
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

  // Organization schema — base for brand recognition / Knowledge Panel.
  // Present on every page (root layout). sameAs left empty until social profiles exist.
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tablix',
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistMono.className} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd)
              .replace(/</g, '\\u003c')
              .replace(/-->/g, '--\\u003e')
              .replace(/]]>/g, ']]\\u003e'),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem nonce={nonce}>
          <PostHogProvider>
            <MotionProvider>
              <LocaleProvider initialLocale={locale}>
                <SkipLink />
                <OfflineIndicator />
                {children}
                <Analytics />
                <SpeedInsights />
                <Toaster position="top-right" richColors />
                <CookieConsent />
              </LocaleProvider>
            </MotionProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
