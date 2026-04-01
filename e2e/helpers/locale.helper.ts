import ptBR from '../../src/lib/i18n/messages/pt-BR.json'
import en from '../../src/lib/i18n/messages/en.json'

type Locale = 'pt-BR' | 'en'

const messages: Record<Locale, Record<string, unknown>> = { 'pt-BR': ptBR, en }

/**
 * Resolve uma chave de i18n para o texto localizado.
 * Suporta interpolação: t('pt-BR', 'messages.tooManyFiles', { max: '3', plan: 'Free' })
 */
export function t(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>,
): string {
  const parts = key.split('.')
  let result: unknown = messages[locale]

  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = (result as Record<string, unknown>)[part]
    } else {
      return key
    }
  }

  if (typeof result !== 'string') return key

  if (values) {
    return Object.entries(values).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      result,
    )
  }

  return result
}
