import type React from 'react'
import type { Metadata } from 'next'
// eslint-disable-next-line camelcase
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'] })
// eslint-disable-next-line camelcase
const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tablix - Transforme planilhas complexas em arquivos prontos para uso',
  description:
    'Envie sua planilha, selecione as colunas que você precisa e gere um novo arquivo em segundos. Ferramenta web para processamento e geração de planilhas personalizadas.',
  generator: 'v0.app',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
            {children}
            <Analytics />
            <Toaster position="top-right" richColors />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
