'use client'

import React from 'react'
import { useSequence } from '@/contexts/SequenceContext'
import { useT } from '@/i18n/I18nProvider'

/** Floating bar for the active step-through sequence. */
export default function SequenceBar() {
  const t = useT()
  const { sequence, next, prev, stop } = useSequence()
  if (!sequence) return null

  const { title, steps, index } = sequence
  const isLast = index === steps.length - 1

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(680px,calc(100vw-2rem))] bg-surface-container-high border border-primary/50 rounded-lg shadow-2xl p-3 font-mono"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant mb-1.5">
        <span className="font-bold text-primary truncate">▶ {title}</span>
        <span className="flex-shrink-0">
          {t('seq.step', { n: index + 1, total: steps.length })}
        </span>
      </div>
      <code className="block text-xs text-on-surface bg-surface-dim border border-outline-variant/60 rounded p-2 break-words">
        {steps[index]}
      </code>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[10px] text-on-surface-variant hidden sm:inline">
          {t('seq.help')}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={prev}
            disabled={index === 0}
            className="px-2 py-1 text-xs rounded border border-outline-variant text-on-surface-variant hover:text-on-surface disabled:opacity-40"
          >
            ← {t('seq.prev')}
          </button>
          <button
            onClick={next}
            className="px-3 py-1 text-xs rounded bg-primary text-on-primary font-bold hover:bg-primary-container"
          >
            {isLast ? t('seq.done') : t('seq.next', { n: index + 2 })}
          </button>
          <button onClick={stop} className="px-2 py-1 text-xs text-on-surface-variant hover:text-error" aria-label={t('seq.stop')}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
