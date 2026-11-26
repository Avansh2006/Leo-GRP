'use client'

import React from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { LANGUAGES, Lang } from '@/i18n/languages'

/** Interface language picker (saved per device). Server pack text like commands stays as the server wrote it. */
export default function LanguagePicker() {
  const { lang, setLanguage, t } = useI18n()
  return (
    <div className="space-y-1">
      <select
        value={lang}
        onChange={(e) => setLanguage(e.target.value as Lang)}
        aria-label={t('language.label')}
        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans focus:outline-none focus:border-primary cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-surface-container text-on-surface">
            {l.name}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-on-surface-variant">{t('language.hint')}</p>
    </div>
  )
}
