export const locales = ['pt-BR', 'en', 'es', 'zh', 'fr', 'de'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'pt-BR'

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
  zh: '简体中文',
  fr: 'Français',
  de: 'Deutsch',
}
