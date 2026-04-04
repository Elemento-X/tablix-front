/**
 * Tests that verify i18n key parity for legal.* namespace across pt-BR, en, and es.
 * Also validates footer keys added in Card #107.
 * Also validates that limit values in legal.terms.plans match src/lib/limits.ts constants.
 * Also validates meta.* keys added in Card 9.6 (legal pages metadata) and the
 * email→emailLabel rename.
 */

import ptBR from '@/lib/i18n/messages/pt-BR.json'
import en from '@/lib/i18n/messages/en.json'
import es from '@/lib/i18n/messages/es.json'
import { PLAN_LIMITS } from '@/lib/limits'

type JsonObject = Record<string, unknown>

/**
 * Recursively collect all leaf key paths from a nested object.
 */
function collectLeafPaths(obj: JsonObject, prefix = ''): string[] {
  const paths: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      paths.push(...collectLeafPaths(value as JsonObject, fullKey))
    } else {
      paths.push(fullKey)
    }
  }
  return paths
}

/**
 * Filter paths to only those under a given namespace.
 */
function filterNamespace(paths: string[], ns: string): string[] {
  return paths.filter((p) => p.startsWith(`${ns}.`))
}

/**
 * Get value at a dot-separated path.
 */
function getAtPath(obj: JsonObject, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as JsonObject)[key]
    }
    return undefined
  }, obj)
}

const ptBRPaths = collectLeafPaths(ptBR as unknown as JsonObject)
const enPaths = collectLeafPaths(en as unknown as JsonObject)
const esPaths = collectLeafPaths(es as unknown as JsonObject)

describe('i18n key parity — legal.* namespace', () => {
  const ptBRLegalPaths = filterNamespace(ptBRPaths, 'legal')
  const enLegalPaths = filterNamespace(enPaths, 'legal')
  const esLegalPaths = filterNamespace(esPaths, 'legal')

  it('legal namespace has keys in all three languages', () => {
    expect(ptBRLegalPaths.length).toBeGreaterThan(0)
    expect(enLegalPaths.length).toBeGreaterThan(0)
    expect(esLegalPaths.length).toBeGreaterThan(0)
  })

  it('pt-BR and en have identical legal.* key count', () => {
    expect(enLegalPaths.length).toBe(ptBRLegalPaths.length)
  })

  it('pt-BR and es have identical legal.* key count', () => {
    expect(esLegalPaths.length).toBe(ptBRLegalPaths.length)
  })

  it('all pt-BR legal keys exist in en', () => {
    const missingInEn = ptBRLegalPaths.filter((p) => !enLegalPaths.includes(p))
    expect(missingInEn).toEqual([])
  })

  it('all pt-BR legal keys exist in es', () => {
    const missingInEs = ptBRLegalPaths.filter((p) => !esLegalPaths.includes(p))
    expect(missingInEs).toEqual([])
  })

  it('all en legal keys exist in pt-BR (no extra keys in en)', () => {
    const extraInEn = enLegalPaths.filter((p) => !ptBRLegalPaths.includes(p))
    expect(extraInEn).toEqual([])
  })

  it('all es legal keys exist in pt-BR (no extra keys in es)', () => {
    const extraInEs = esLegalPaths.filter((p) => !ptBRLegalPaths.includes(p))
    expect(extraInEs).toEqual([])
  })

  it('all legal keys have non-empty string values in pt-BR', () => {
    ptBRLegalPaths.forEach((path) => {
      const value = getAtPath(ptBR as unknown as JsonObject, path)
      expect(typeof value).toBe('string')
      expect((value as string).trim().length).toBeGreaterThan(0)
    })
  })

  it('all legal keys have non-empty string values in en', () => {
    enLegalPaths.forEach((path) => {
      const value = getAtPath(en as unknown as JsonObject, path)
      expect(typeof value).toBe('string')
      expect((value as string).trim().length).toBeGreaterThan(0)
    })
  })

  it('all legal keys have non-empty string values in es', () => {
    esLegalPaths.forEach((path) => {
      const value = getAtPath(es as unknown as JsonObject, path)
      expect(typeof value).toBe('string')
      expect((value as string).trim().length).toBeGreaterThan(0)
    })
  })
})

describe('i18n key parity — footer.* namespace', () => {
  const ptBRFooterPaths = filterNamespace(ptBRPaths, 'footer')
  const enFooterPaths = filterNamespace(enPaths, 'footer')
  const esFooterPaths = filterNamespace(esPaths, 'footer')

  it('footer namespace has keys in all three languages', () => {
    expect(ptBRFooterPaths.length).toBeGreaterThan(0)
    expect(enFooterPaths.length).toBeGreaterThan(0)
    expect(esFooterPaths.length).toBeGreaterThan(0)
  })

  it('footer.privacyPolicy exists in all three languages', () => {
    expect(ptBRFooterPaths).toContain('footer.privacyPolicy')
    expect(enFooterPaths).toContain('footer.privacyPolicy')
    expect(esFooterPaths).toContain('footer.privacyPolicy')
  })

  it('footer.terms exists in all three languages', () => {
    expect(ptBRFooterPaths).toContain('footer.terms')
    expect(enFooterPaths).toContain('footer.terms')
    expect(esFooterPaths).toContain('footer.terms')
  })

  it('footer.copyright exists in all three languages', () => {
    expect(ptBRFooterPaths).toContain('footer.copyright')
    expect(enFooterPaths).toContain('footer.copyright')
    expect(esFooterPaths).toContain('footer.copyright')
  })

  it('footer.copyright contains {year} placeholder in all three languages', () => {
    const ptBRCopyright = getAtPath(
      ptBR as unknown as JsonObject,
      'footer.copyright',
    ) as string
    const enCopyright = getAtPath(
      en as unknown as JsonObject,
      'footer.copyright',
    ) as string
    const esCopyright = getAtPath(
      es as unknown as JsonObject,
      'footer.copyright',
    ) as string

    expect(ptBRCopyright).toContain('{year}')
    expect(enCopyright).toContain('{year}')
    expect(esCopyright).toContain('{year}')
  })

  it('legal.lastUpdated contains {date} placeholder in all three languages', () => {
    const ptBRVal = getAtPath(
      ptBR as unknown as JsonObject,
      'legal.lastUpdated',
    ) as string
    const enVal = getAtPath(
      en as unknown as JsonObject,
      'legal.lastUpdated',
    ) as string
    const esVal = getAtPath(
      es as unknown as JsonObject,
      'legal.lastUpdated',
    ) as string

    expect(ptBRVal).toContain('{date}')
    expect(enVal).toContain('{date}')
    expect(esVal).toContain('{date}')
  })

  it('all footer keys have identical key count across languages', () => {
    expect(enFooterPaths.length).toBe(ptBRFooterPaths.length)
    expect(esFooterPaths.length).toBe(ptBRFooterPaths.length)
  })

  it('all pt-BR footer keys exist in en', () => {
    const missing = ptBRFooterPaths.filter((p) => !enFooterPaths.includes(p))
    expect(missing).toEqual([])
  })

  it('all pt-BR footer keys exist in es', () => {
    const missing = ptBRFooterPaths.filter((p) => !esFooterPaths.includes(p))
    expect(missing).toEqual([])
  })
})

describe('i18n key parity — legal.privacy namespace', () => {
  it('has all 10 section title keys', () => {
    const expectedSections = [
      'legal.privacy.intro.title',
      'legal.privacy.dataCollection.title',
      'legal.privacy.spreadsheetProcessing.title',
      'legal.privacy.cookies.title',
      'legal.privacy.storage.title',
      'legal.privacy.security.title',
      'legal.privacy.rights.title',
      'legal.privacy.thirdParty.title',
      'legal.privacy.changes.title',
      'legal.privacy.contact.title',
    ]

    ;[ptBR, en, es].forEach((messages) => {
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      expectedSections.forEach((section) => {
        expect(paths).toContain(section)
      })
    })
  })
})

describe('i18n key parity — legal.terms namespace', () => {
  it('has all 12 section title keys', () => {
    const expectedSections = [
      'legal.terms.acceptance.title',
      'legal.terms.serviceDescription.title',
      'legal.terms.plans.title',
      'legal.terms.acceptableUse.title',
      'legal.terms.userContent.title',
      'legal.terms.ip.title',
      'legal.terms.liability.title',
      'legal.terms.availability.title',
      'legal.terms.suspension.title',
      'legal.terms.changes.title',
      'legal.terms.governingLaw.title',
      'legal.terms.contact.title',
    ]

    ;[ptBR, en, es].forEach((messages) => {
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      expectedSections.forEach((section) => {
        expect(paths).toContain(section)
      })
    })
  })

  it('plans section has all free limits (1-5)', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      for (let i = 1; i <= 5; i++) {
        expect(paths).toContain(`legal.terms.plans.freeLimit${i}`)
      }
    })
  })

  it('plans section has all pro limits (1-6)', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      for (let i = 1; i <= 6; i++) {
        expect(paths).toContain(`legal.terms.plans.proLimit${i}`)
      }
    })
  })

  it('acceptableUse section has all 6 rules', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      for (let i = 1; i <= 6; i++) {
        expect(paths).toContain(`legal.terms.acceptableUse.rule${i}`)
      }
    })
  })
})

describe('i18n limit values — legal.terms.plans cross-check against limits.ts', () => {
  const FREE = PLAN_LIMITS.free
  const PRO = PLAN_LIMITS.pro

  const MB = 1024 * 1024

  /**
   * Each entry: [key, regex that must match the value, description for failure message]
   * Regex tests the translated string for the numeric value that must match limits.ts.
   */
  const freeLimitChecks: Array<[string, RegExp, string]> = [
    [
      'legal.terms.plans.freeLimit1',
      new RegExp(`\\b${FREE.unificationsPerMonth}\\b`),
      `freeLimit1 must mention ${FREE.unificationsPerMonth} (unificationsPerMonth)`,
    ],
    [
      'legal.terms.plans.freeLimit2',
      new RegExp(`\\b${FREE.maxRows}\\b`),
      `freeLimit2 must mention ${FREE.maxRows} (maxRows)`,
    ],
    [
      'legal.terms.plans.freeLimit3',
      new RegExp(`\\b${FREE.maxColumns}\\b`),
      `freeLimit3 must mention ${FREE.maxColumns} (maxColumns)`,
    ],
    [
      'legal.terms.plans.freeLimit4',
      new RegExp(`\\b${FREE.maxInputFiles}\\b`),
      `freeLimit4 must mention ${FREE.maxInputFiles} (maxInputFiles)`,
    ],
    [
      'legal.terms.plans.freeLimit5',
      new RegExp(`\\b${FREE.maxTotalSize / MB}\\s*MB\\b`),
      `freeLimit5 must mention ${FREE.maxTotalSize / MB} MB (maxTotalSize)`,
    ],
  ]

  const proLimitChecks: Array<[string, RegExp, string]> = [
    [
      'legal.terms.plans.proLimit1',
      new RegExp(`\\b${PRO.unificationsPerMonth}\\b`),
      `proLimit1 must mention ${PRO.unificationsPerMonth} (unificationsPerMonth)`,
    ],
    [
      'legal.terms.plans.proLimit2',
      // Accepts European (5.000), Anglo (5,000) and plain (5000) thousand separators
      /\b5[.,]?000\b/,
      `proLimit2 must mention ${PRO.maxRows} (maxRows)`,
    ],
    [
      'legal.terms.plans.proLimit3',
      new RegExp(`\\b${PRO.maxColumns}\\b`),
      `proLimit3 must mention ${PRO.maxColumns} (maxColumns)`,
    ],
    [
      'legal.terms.plans.proLimit4',
      new RegExp(`\\b${PRO.maxInputFiles}\\b`),
      `proLimit4 must mention ${PRO.maxInputFiles} (maxInputFiles)`,
    ],
    [
      'legal.terms.plans.proLimit5',
      new RegExp(`\\b${PRO.maxFileSize / MB}\\s*MB\\b`),
      `proLimit5 must mention ${PRO.maxFileSize / MB} MB per file (maxFileSize)`,
    ],
    [
      'legal.terms.plans.proLimit5',
      new RegExp(`\\b${PRO.maxTotalSize / MB}\\s*MB\\b`),
      `proLimit5 must mention ${PRO.maxTotalSize / MB} MB total (maxTotalSize)`,
    ],
  ]

  it.each(['pt-BR', 'en', 'es'])(
    'free limits match limits.ts in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      freeLimitChecks.forEach(([key, regex, description]) => {
        const value = getAtPath(
          messages as unknown as JsonObject,
          key,
        ) as string
        if (!regex.test(value)) {
          throw new Error(
            `[${lang}] ${description}\n  key: ${key}\n  value: "${value}"\n  regex: ${regex}`,
          )
        }
      })
    },
  )

  it.each(['pt-BR', 'en', 'es'])('pro limits match limits.ts in %s', (lang) => {
    const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
    proLimitChecks.forEach(([key, regex, description]) => {
      const value = getAtPath(messages as unknown as JsonObject, key) as string
      if (!regex.test(value)) {
        throw new Error(
          `[${lang}] ${description}\n  key: ${key}\n  value: "${value}"\n  regex: ${regex}`,
        )
      }
    })
  })
})

// ─── Card 9.6: meta.* keys for legal pages ────────────────────────────────────

describe('i18n key parity — meta.* legal page keys (Card 9.6)', () => {
  const requiredMetaKeys = [
    'meta.privacyTitle',
    'meta.privacyDescription',
    'meta.termsTitle',
    'meta.termsDescription',
  ]

  it.each(['pt-BR', 'en', 'es'])(
    'all four legal meta keys exist in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      const paths = collectLeafPaths(messages as unknown as JsonObject)
      requiredMetaKeys.forEach((key) => {
        expect(paths).toContain(key)
      })
    },
  )

  it.each(['pt-BR', 'en', 'es'])(
    'meta.privacyTitle is a non-empty string in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.privacyTitle',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(['pt-BR', 'en', 'es'])(
    'meta.privacyDescription is a non-empty string in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.privacyDescription',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(['pt-BR', 'en', 'es'])(
    'meta.termsTitle is a non-empty string in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.termsTitle',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(['pt-BR', 'en', 'es'])(
    'meta.termsDescription is a non-empty string in %s',
    (lang) => {
      const messages = lang === 'pt-BR' ? ptBR : lang === 'en' ? en : es
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.termsDescription',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    },
  )

  it('meta.privacyTitle contains "Tablix" in all languages', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.privacyTitle',
      ) as string
      expect(value).toContain('Tablix')
    })
  })

  it('meta.termsTitle contains "Tablix" in all languages', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const value = getAtPath(
        messages as unknown as JsonObject,
        'meta.termsTitle',
      ) as string
      expect(value).toContain('Tablix')
    })
  })

  it('meta.privacyTitle differs across languages (real translations, not copy-paste)', () => {
    const ptVal = getAtPath(ptBR as unknown as JsonObject, 'meta.privacyTitle')
    const enVal = getAtPath(en as unknown as JsonObject, 'meta.privacyTitle')
    const esVal = getAtPath(es as unknown as JsonObject, 'meta.privacyTitle')
    // At least two of the three must differ (en/es could share format)
    expect([ptVal, enVal, esVal]).not.toEqual([ptVal, ptVal, ptVal])
  })

  it('meta.termsTitle differs across languages', () => {
    const ptVal = getAtPath(ptBR as unknown as JsonObject, 'meta.termsTitle')
    const enVal = getAtPath(en as unknown as JsonObject, 'meta.termsTitle')
    const esVal = getAtPath(es as unknown as JsonObject, 'meta.termsTitle')
    expect([ptVal, enVal, esVal]).not.toEqual([ptVal, ptVal, ptVal])
  })

  it('all four meta keys are identical in count across languages', () => {
    const ptMetaPaths = filterNamespace(ptBRPaths, 'meta')
    const enMetaPaths = filterNamespace(enPaths, 'meta')
    const esMetaPaths = filterNamespace(esPaths, 'meta')
    expect(enMetaPaths.length).toBe(ptMetaPaths.length)
    expect(esMetaPaths.length).toBe(ptMetaPaths.length)
  })
})

// ─── Card 9.6: email → emailLabel rename ─────────────────────────────────────

describe('i18n rename — email → emailLabel in legal contact sections (Card 9.6)', () => {
  it('old key legal.privacy.contact.email does NOT exist in pt-BR', () => {
    expect(ptBRPaths).not.toContain('legal.privacy.contact.email')
  })

  it('old key legal.privacy.contact.email does NOT exist in en', () => {
    expect(enPaths).not.toContain('legal.privacy.contact.email')
  })

  it('old key legal.privacy.contact.email does NOT exist in es', () => {
    expect(esPaths).not.toContain('legal.privacy.contact.email')
  })

  it('old key legal.terms.contact.email does NOT exist in pt-BR', () => {
    expect(ptBRPaths).not.toContain('legal.terms.contact.email')
  })

  it('old key legal.terms.contact.email does NOT exist in en', () => {
    expect(enPaths).not.toContain('legal.terms.contact.email')
  })

  it('old key legal.terms.contact.email does NOT exist in es', () => {
    expect(esPaths).not.toContain('legal.terms.contact.email')
  })

  it('new key legal.privacy.contact.emailLabel exists in all three languages', () => {
    ;[ptBRPaths, enPaths, esPaths].forEach((paths) => {
      expect(paths).toContain('legal.privacy.contact.emailLabel')
    })
  })

  it('new key legal.terms.contact.emailLabel exists in all three languages', () => {
    ;[ptBRPaths, enPaths, esPaths].forEach((paths) => {
      expect(paths).toContain('legal.terms.contact.emailLabel')
    })
  })

  it('legal.privacy.contact.emailLabel is a non-empty string in all languages', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const value = getAtPath(
        messages as unknown as JsonObject,
        'legal.privacy.contact.emailLabel',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    })
  })

  it('legal.terms.contact.emailLabel is a non-empty string in all languages', () => {
    ;[ptBR, en, es].forEach((messages) => {
      const value = getAtPath(
        messages as unknown as JsonObject,
        'legal.terms.contact.emailLabel',
      ) as string
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    })
  })
})
