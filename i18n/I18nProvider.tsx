'use client'

/**
 * UI translations. The language is kept in the `leogrp_lang` cookie so the server renders the
 * right language on the first paint. With no cookie yet, the browser's language is used after load.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_LANG, LANG_COOKIE, Lang, isLang, matchLang } from './languages'
import { dictionaries, MessageKey } from './dictionaries'

type Vars = Record<string, string | number>

interface I18nValue {
  lang: Lang
  setLanguage: (lang: Lang) => void
  t: (key: MessageKey, vars?: Vars) => string
}

function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const text = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text
}

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANG,
  setLanguage: () => {},
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
})

export function I18nProvider({
  initialLang,
  hasCookie,
  serverDefault,
  children,
}: {
  initialLang: Lang
  hasCookie: boolean
  /** The active server pack's defaultLanguage, used when the browser language isn't supported */
  serverDefault?: string
  children: React.ReactNode
}) {
  const [lang, setLang] = useState<Lang>(initialLang)

  const setLanguage = useCallback((next: Lang) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
    setLang(next)
  }, [])

  // First visit: pick up the browser's language (after hydration, so first paint matches the server)
  useEffect(() => {
    if (hasCookie) return
    const guess = matchLang(navigator.language) || (isLang(serverDefault) ? serverDefault : undefined)
    if (guess && guess !== lang) setLanguage(guess)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = useCallback((key: MessageKey, vars?: Vars) => translate(lang, key, vars), [lang])

  return <I18nContext.Provider value={{ lang, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

/** Shorthand: const t = useT(); t('nav.commands') */
export function useT() {
  return useContext(I18nContext).t
}
