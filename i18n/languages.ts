/** Supported UI languages. Add a language: add it here and create i18n/<code>.ts (type-checked against en). */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'de', name: 'Deutsch (German)' },
] as const

export type Lang = (typeof LANGUAGES)[number]['code']
export const DEFAULT_LANG: Lang = 'en'
export const LANG_COOKIE = 'leogrp_lang'

export function isLang(v: string | undefined | null): v is Lang {
  return !!v && LANGUAGES.some((l) => l.code === v)
}

/** Best supported language for a browser language like "pt-PT" or "de-AT". */
export function matchLang(browserLang: string | undefined | null): Lang | undefined {
  if (!browserLang) return undefined
  if (isLang(browserLang)) return browserLang
  const base = browserLang.toLowerCase().split('-')[0]
  if (base === 'pt') return 'pt-BR'
  return LANGUAGES.find((l) => l.code === base)?.code
}
