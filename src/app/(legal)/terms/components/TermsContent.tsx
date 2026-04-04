'use client'

import { useMemo } from 'react'
import { LegalTableOfContents } from '@/components/legal-table-of-contents'
import { useLocale } from '@/lib/i18n'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from '@/lib/constants'

export function TermsContent() {
  const { t } = useLocale()

  const tocItems = useMemo(
    () => [
      { id: 'acceptance', label: t('legal.terms.acceptance.title') },
      {
        id: 'service-description',
        label: t('legal.terms.serviceDescription.title'),
      },
      { id: 'plans', label: t('legal.terms.plans.title') },
      { id: 'acceptable-use', label: t('legal.terms.acceptableUse.title') },
      { id: 'user-content', label: t('legal.terms.userContent.title') },
      { id: 'ip', label: t('legal.terms.ip.title') },
      { id: 'liability', label: t('legal.terms.liability.title') },
      { id: 'availability', label: t('legal.terms.availability.title') },
      { id: 'suspension', label: t('legal.terms.suspension.title') },
      { id: 'changes', label: t('legal.terms.changes.title') },
      { id: 'governing-law', label: t('legal.terms.governingLaw.title') },
      { id: 'contact', label: t('legal.terms.contact.title') },
    ],
    [t],
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">{t('legal.terms.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('legal.lastUpdated', { date: LEGAL_LAST_UPDATED })}
        </p>
      </div>

      {/* Mobile TOC */}
      <div className="mb-6 lg:hidden">
        <LegalTableOfContents items={tocItems} />
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <article className="prose-legal">
          <section id="acceptance">
            <h2>{t('legal.terms.acceptance.title')}</h2>
            <p>{t('legal.terms.acceptance.p1')}</p>
            <p>{t('legal.terms.acceptance.p2')}</p>
          </section>

          <section id="service-description">
            <h2>{t('legal.terms.serviceDescription.title')}</h2>
            <p>{t('legal.terms.serviceDescription.p1')}</p>
            <p>{t('legal.terms.serviceDescription.p2')}</p>
          </section>

          <section id="plans">
            <h2>{t('legal.terms.plans.title')}</h2>

            <h3 className="text-foreground mt-6 mb-2 text-lg font-medium">
              {t('legal.terms.plans.freeTitle')}
            </h3>
            <p>{t('legal.terms.plans.freeDescription')}</p>
            <ul>
              <li>{t('legal.terms.plans.freeLimit1')}</li>
              <li>{t('legal.terms.plans.freeLimit2')}</li>
              <li>{t('legal.terms.plans.freeLimit3')}</li>
              <li>{t('legal.terms.plans.freeLimit4')}</li>
              <li>{t('legal.terms.plans.freeLimit5')}</li>
            </ul>

            <h3 className="text-foreground mt-6 mb-2 text-lg font-medium">
              {t('legal.terms.plans.proTitle')}
            </h3>
            <p>{t('legal.terms.plans.proDescription')}</p>
            <ul>
              <li>{t('legal.terms.plans.proLimit1')}</li>
              <li>{t('legal.terms.plans.proLimit2')}</li>
              <li>{t('legal.terms.plans.proLimit3')}</li>
              <li>{t('legal.terms.plans.proLimit4')}</li>
              <li>{t('legal.terms.plans.proLimit5')}</li>
              <li>{t('legal.terms.plans.proLimit6')}</li>
            </ul>

            <p>{t('legal.terms.plans.limitsNote')}</p>
          </section>

          <section id="acceptable-use">
            <h2>{t('legal.terms.acceptableUse.title')}</h2>
            <p>{t('legal.terms.acceptableUse.description')}</p>
            <ul>
              <li>{t('legal.terms.acceptableUse.rule1')}</li>
              <li>{t('legal.terms.acceptableUse.rule2')}</li>
              <li>{t('legal.terms.acceptableUse.rule3')}</li>
              <li>{t('legal.terms.acceptableUse.rule4')}</li>
              <li>{t('legal.terms.acceptableUse.rule5')}</li>
              <li>{t('legal.terms.acceptableUse.rule6')}</li>
            </ul>
          </section>

          <section id="user-content">
            <h2>{t('legal.terms.userContent.title')}</h2>
            <p>{t('legal.terms.userContent.p1')}</p>
            <p>{t('legal.terms.userContent.p2')}</p>
            <p>{t('legal.terms.userContent.p3')}</p>
          </section>

          <section id="ip">
            <h2>{t('legal.terms.ip.title')}</h2>
            <p>{t('legal.terms.ip.p1')}</p>
            <p>{t('legal.terms.ip.p2')}</p>
          </section>

          <section id="liability">
            <h2>{t('legal.terms.liability.title')}</h2>
            <p>{t('legal.terms.liability.p1')}</p>
            <p>{t('legal.terms.liability.p2')}</p>
            <p>{t('legal.terms.liability.p3')}</p>
          </section>

          <section id="availability">
            <h2>{t('legal.terms.availability.title')}</h2>
            <p>{t('legal.terms.availability.p1')}</p>
            <p>{t('legal.terms.availability.p2')}</p>
          </section>

          <section id="suspension">
            <h2>{t('legal.terms.suspension.title')}</h2>
            <p>{t('legal.terms.suspension.p1')}</p>
            <p>{t('legal.terms.suspension.p2')}</p>
          </section>

          <section id="changes">
            <h2>{t('legal.terms.changes.title')}</h2>
            <p>{t('legal.terms.changes.p1')}</p>
            <p>{t('legal.terms.changes.p2')}</p>
          </section>

          <section id="governing-law">
            <h2>{t('legal.terms.governingLaw.title')}</h2>
            <p>{t('legal.terms.governingLaw.p1')}</p>
            <p>{t('legal.terms.governingLaw.p2')}</p>
          </section>

          <section id="contact">
            <h2>{t('legal.terms.contact.title')}</h2>
            <p>{t('legal.terms.contact.p1')}</p>
            <p>
              {t('legal.terms.contact.emailLabel')}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>{t('legal.terms.contact.address')}</p>
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
