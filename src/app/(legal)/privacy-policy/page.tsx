'use client'

import { useMemo } from 'react'
import { LegalTableOfContents } from '@/components/legal-table-of-contents'
import { useLocale } from '@/lib/i18n'

const LAST_UPDATED = '2026-03-30'

export default function PrivacyPolicyPage() {
  const { t } = useLocale()

  const tocItems = useMemo(
    () => [
      { id: 'intro', label: t('legal.privacy.intro.title') },
      { id: 'data-collection', label: t('legal.privacy.dataCollection.title') },
      {
        id: 'spreadsheet-processing',
        label: t('legal.privacy.spreadsheetProcessing.title'),
      },
      { id: 'cookies', label: t('legal.privacy.cookies.title') },
      { id: 'storage', label: t('legal.privacy.storage.title') },
      { id: 'security', label: t('legal.privacy.security.title') },
      { id: 'rights', label: t('legal.privacy.rights.title') },
      { id: 'third-party', label: t('legal.privacy.thirdParty.title') },
      { id: 'changes', label: t('legal.privacy.changes.title') },
      { id: 'contact', label: t('legal.privacy.contact.title') },
    ],
    [t],
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">
          {t('legal.privacy.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('legal.lastUpdated', { date: LAST_UPDATED })}
        </p>
      </div>

      {/* Mobile TOC */}
      <div className="mb-6 lg:hidden">
        <LegalTableOfContents items={tocItems} />
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <article className="prose-legal">
          <section id="intro">
            <h2>{t('legal.privacy.intro.title')}</h2>
            <p>{t('legal.privacy.intro.p1')}</p>
            <p>{t('legal.privacy.intro.p2')}</p>
          </section>

          <section id="data-collection">
            <h2>{t('legal.privacy.dataCollection.title')}</h2>
            <p>{t('legal.privacy.dataCollection.description')}</p>
            <ul>
              <li>{t('legal.privacy.dataCollection.fingerprint')}</li>
              <li>{t('legal.privacy.dataCollection.ipHash')}</li>
              <li>{t('legal.privacy.dataCollection.usageCounters')}</li>
              <li>{t('legal.privacy.dataCollection.locale')}</li>
            </ul>
          </section>

          <section id="spreadsheet-processing">
            <h2>{t('legal.privacy.spreadsheetProcessing.title')}</h2>
            <p>{t('legal.privacy.spreadsheetProcessing.p1')}</p>
            <p>{t('legal.privacy.spreadsheetProcessing.p2')}</p>
            <p>{t('legal.privacy.spreadsheetProcessing.p3')}</p>
          </section>

          <section id="cookies">
            <h2>{t('legal.privacy.cookies.title')}</h2>
            <p>{t('legal.privacy.cookies.description')}</p>
            <ul>
              <li>{t('legal.privacy.cookies.tablixFp')}</li>
              <li>{t('legal.privacy.cookies.theme')}</li>
              <li>{t('legal.privacy.cookies.localePref')}</li>
            </ul>
            <p>{t('legal.privacy.cookies.noCookies')}</p>
          </section>

          <section id="storage">
            <h2>{t('legal.privacy.storage.title')}</h2>
            <p>{t('legal.privacy.storage.p1')}</p>
            <p>{t('legal.privacy.storage.p2')}</p>
            <p>{t('legal.privacy.storage.p3')}</p>
          </section>

          <section id="security">
            <h2>{t('legal.privacy.security.title')}</h2>
            <p>{t('legal.privacy.security.description')}</p>
            <ul>
              <li>{t('legal.privacy.security.csp')}</li>
              <li>{t('legal.privacy.security.rateLimit')}</li>
              <li>{t('legal.privacy.security.headers')}</li>
              <li>{t('legal.privacy.security.validation')}</li>
              <li>{t('legal.privacy.security.httpOnly')}</li>
            </ul>
          </section>

          <section id="rights">
            <h2>{t('legal.privacy.rights.title')}</h2>
            <p>{t('legal.privacy.rights.description')}</p>
            <ul>
              <li>{t('legal.privacy.rights.access')}</li>
              <li>{t('legal.privacy.rights.deletion')}</li>
              <li>{t('legal.privacy.rights.info')}</li>
            </ul>
            <p>{t('legal.privacy.rights.legalBasis')}</p>
            <p>{t('legal.privacy.rights.contact')}</p>
          </section>

          <section id="third-party">
            <h2>{t('legal.privacy.thirdParty.title')}</h2>
            <p>{t('legal.privacy.thirdParty.description')}</p>
            <ul>
              <li>{t('legal.privacy.thirdParty.vercel')}</li>
              <li>{t('legal.privacy.thirdParty.upstash')}</li>
              <li>{t('legal.privacy.thirdParty.analytics')}</li>
            </ul>
          </section>

          <section id="changes">
            <h2>{t('legal.privacy.changes.title')}</h2>
            <p>{t('legal.privacy.changes.p1')}</p>
            <p>{t('legal.privacy.changes.p2')}</p>
          </section>

          <section id="contact">
            <h2>{t('legal.privacy.contact.title')}</h2>
            <p>{t('legal.privacy.contact.p1')}</p>
            <p>{t('legal.privacy.contact.controller')}</p>
            <p>{t('legal.privacy.contact.email')}</p>
            <p>{t('legal.privacy.contact.address')}</p>
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <LegalTableOfContents items={tocItems} />
          </div>
        </aside>
      </div>
    </div>
  )
}
