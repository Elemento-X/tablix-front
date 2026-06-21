/**
 * Global i18n parity — runs across EVERY locale declared in config.locales,
 * using pt-BR (defaultLocale) as the source of truth.
 *
 * This is future-proof: adding a new locale to `locales` automatically subjects
 * it to full key parity, placeholder parity, non-empty values, and the legal
 * limit cross-check against limits.ts. The only manual step is registering the
 * imported JSON in `messagesByLocale` below — and the test fails loudly if a
 * declared locale is missing there.
 */

import { locales, defaultLocale, type Locale } from '@/lib/i18n/config'
import { PLAN_LIMITS } from '@/lib/limits'
import ptBR from '@/lib/i18n/messages/pt-BR.json'
import en from '@/lib/i18n/messages/en.json'
import es from '@/lib/i18n/messages/es.json'
import zh from '@/lib/i18n/messages/zh.json'
import fr from '@/lib/i18n/messages/fr.json'
import de from '@/lib/i18n/messages/de.json'

type JsonObject = Record<string, unknown>

const messagesByLocale: Record<Locale, JsonObject> = {
  'pt-BR': ptBR as unknown as JsonObject,
  en: en as unknown as JsonObject,
  es: es as unknown as JsonObject,
  zh: zh as unknown as JsonObject,
  fr: fr as unknown as JsonObject,
  de: de as unknown as JsonObject,
}

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

function getAtPath(obj: JsonObject, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as JsonObject)[key]
    return undefined
  }, obj)
}

/** Extract sorted placeholder names like {name}, {count} from a string. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

const sourcePaths = collectLeafPaths(messagesByLocale[defaultLocale])
const nonDefaultLocales = locales.filter((l) => l !== defaultLocale)

describe('i18n global parity (all declared locales vs pt-BR)', () => {
  it('every locale declared in config has a registered message bundle in this test', () => {
    for (const locale of locales) {
      expect(messagesByLocale[locale]).toBeDefined()
    }
  })

  it.each(nonDefaultLocales)('[%s] has the exact same leaf key set as pt-BR', (locale) => {
    const localePaths = collectLeafPaths(messagesByLocale[locale])
    const sourceSet = new Set(sourcePaths)
    const localeSet = new Set(localePaths)

    const missing = sourcePaths.filter((p) => !localeSet.has(p))
    const extra = localePaths.filter((p) => !sourceSet.has(p))

    expect({ locale, missing, extra }).toEqual({ locale, missing: [], extra: [] })
  })

  it.each(nonDefaultLocales)('[%s] has identical leaf key count to pt-BR', (locale) => {
    expect(collectLeafPaths(messagesByLocale[locale]).length).toBe(sourcePaths.length)
  })

  it.each(nonDefaultLocales)('[%s] all values are non-empty strings', (locale) => {
    const bundle = messagesByLocale[locale]
    const empties = collectLeafPaths(bundle).filter((p) => {
      const v = getAtPath(bundle, p)
      return typeof v !== 'string' || v.trim().length === 0
    })
    expect(empties).toEqual([])
  })

  it.each(nonDefaultLocales)('[%s] placeholders match pt-BR for every key', (locale) => {
    const bundle = messagesByLocale[locale]
    const mismatches = sourcePaths
      .map((p) => {
        const a = placeholders(String(getAtPath(messagesByLocale[defaultLocale], p)))
        const b = placeholders(String(getAtPath(bundle, p)))
        return a.join(',') === b.join(',') ? null : `${p}: pt[${a}] != ${locale}[${b}]`
      })
      .filter(Boolean)
    expect(mismatches).toEqual([])
  })

  it.each(nonDefaultLocales)('[%s] is a real translation, not a copy of pt-BR', (locale) => {
    // Spot-check a few user-facing strings differ from the Portuguese source.
    const sampleKeys = ['hero.cta', 'header.cta', 'pricing.title']
    const allEqual = sampleKeys.every(
      (k) =>
        getAtPath(messagesByLocale[locale], k) === getAtPath(messagesByLocale[defaultLocale], k),
    )
    expect(allEqual).toBe(false)
  })
})

describe('i18n legal limit cross-check against limits.ts (all locales)', () => {
  const FREE = PLAN_LIMITS.free
  const PRO = PLAN_LIMITS.pro
  const MB = 1024 * 1024
  // Megabyte unit varies by locale: "MB" (pt/en/es/zh) and "Mo" (fr, mégaoctet).
  const MBYTE = 'M[Bo]'
  // Thousands separator varies: none, comma, dot, or space/NBSP/narrow-NBSP (fr: "5 000").
  const THOUSANDS = '[\\s.,\\u00a0\\u202f]?'

  const checks: Array<[string, RegExp, string]> = [
    [
      'legal.terms.plans.freeLimit1',
      new RegExp(`\\b${FREE.unificationsPerMonth}\\b`),
      'free unifications',
    ],
    ['legal.terms.plans.freeLimit2', new RegExp(`\\b${FREE.maxRows}\\b`), 'free maxRows'],
    ['legal.terms.plans.freeLimit3', new RegExp(`\\b${FREE.maxColumns}\\b`), 'free maxColumns'],
    [
      'legal.terms.plans.freeLimit4',
      new RegExp(`\\b${FREE.maxInputFiles}\\b`),
      'free maxInputFiles',
    ],
    [
      'legal.terms.plans.freeLimit5',
      new RegExp(`\\b${FREE.maxTotalSize / MB}\\s*${MBYTE}\\b`),
      'free maxTotalSize',
    ],
    [
      'legal.terms.plans.proLimit1',
      new RegExp(`\\b${PRO.unificationsPerMonth}\\b`),
      'pro unifications',
    ],
    ['legal.terms.plans.proLimit2', new RegExp(`\\b5${THOUSANDS}000\\b`), 'pro maxRows'],
    ['legal.terms.plans.proLimit3', new RegExp(`\\b${PRO.maxColumns}\\b`), 'pro maxColumns'],
    ['legal.terms.plans.proLimit4', new RegExp(`\\b${PRO.maxInputFiles}\\b`), 'pro maxInputFiles'],
    [
      'legal.terms.plans.proLimit5',
      new RegExp(`\\b${PRO.maxFileSize / MB}\\s*${MBYTE}\\b`),
      'pro maxFileSize',
    ],
    [
      'legal.terms.plans.proLimit5',
      new RegExp(`\\b${PRO.maxTotalSize / MB}\\s*${MBYTE}\\b`),
      'pro maxTotalSize',
    ],
  ]

  it.each(locales)('limits match limits.ts in %s', (locale) => {
    const bundle = messagesByLocale[locale]
    checks.forEach(([key, regex, description]) => {
      const value = getAtPath(bundle, key) as string
      if (!regex.test(value)) {
        throw new Error(
          `[${locale}] ${description}\n  key: ${key}\n  value: "${value}"\n  regex: ${regex}`,
        )
      }
    })
  })
})
