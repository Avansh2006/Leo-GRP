'use client'

/**
 * Two reminders shown under the header:
 *  - Laws updated: the server's laws changed since this officer last looked
 *  - Backup: officer data lives only in this browser; remind to export a backup
 */

import React, { useEffect, useState } from 'react'
import { scopedStorage } from '@/servers'
import { loadAllLawData } from '@/utils/htmlParser'
import { takeSnapshot, diffSnapshots, isEmptyDiff, LawDiff, LawSnapshot } from '@/utils/lawChanges'
import { getAllShifts, getAllArrests } from '@/utils/db'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useT } from '@/i18n/I18nProvider'

const LAW_SNAPSHOT_KEY = 'leogrp_law_snapshot'
export const LAST_BACKUP_KEY = 'leogrp_last_backup_at'
const BACKUP_SNOOZE_KEY = 'leogrp_backup_snoozed_until'
const DAY = 24 * 60 * 60 * 1000
const BACKUP_EVERY_DAYS = 7

/** Call after a successful backup export. */
export function markBackupDone() {
  scopedStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}

const FIELD_KEY = { fine: 'laws.fieldFine', sentence: 'laws.fieldSentence', stars: 'laws.fieldStars', description: 'laws.fieldDescription' } as const

function LawUpdateBanner() {
  const t = useT()
  const [diff, setDiff] = useState<LawDiff | null>(null)
  const [next, setNext] = useState<LawSnapshot | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadAllLawData().then(({ allEntries }) => {
      if (!alive || allEntries.length === 0) return
      const current = takeSnapshot(allEntries)
      const raw = scopedStorage.getItem(LAW_SNAPSHOT_KEY)
      if (!raw) {
        // First visit on this server: remember silently
        scopedStorage.setItem(LAW_SNAPSHOT_KEY, JSON.stringify(current))
        return
      }
      try {
        const d = diffSnapshots(JSON.parse(raw), current)
        if (!isEmptyDiff(d)) {
          setDiff(d)
          setNext(current)
        }
      } catch {
        scopedStorage.setItem(LAW_SNAPSHOT_KEY, JSON.stringify(current))
      }
    })
    return () => {
      alive = false
    }
  }, [])

  if (!diff || !next) return null
  const acknowledge = () => {
    scopedStorage.setItem(LAW_SNAPSHOT_KEY, JSON.stringify(next))
    setDiff(null)
  }
  const parts = [
    diff.changed.length && t('laws.changed', { n: new Set(diff.changed.map((c) => c.code)).size }),
    diff.added.length && t('laws.new', { n: diff.added.length }),
    diff.removed.length && t('laws.removed', { n: diff.removed.length }),
  ].filter(Boolean)

  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/40 text-xs font-mono text-on-surface">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-amber-400">⚖️ {t('laws.updated')}</span>
        <span>{t('laws.summary', { parts: parts.join(', ') })}</span>
        <button onClick={() => setOpen((o) => !o)} className="text-primary underline">
          {open ? t('common.hide') : t('laws.show')}
        </button>
        <button onClick={acknowledge} className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold">
          {t('laws.ack')}
        </button>
      </div>
      {open && (
        <ul className="mt-2 max-h-48 overflow-y-auto space-y-0.5 text-[11px]">
          {diff.changed.map((c, i) => (
            <li key={`c${i}`}>
              <strong>{c.code}</strong> {t(FIELD_KEY[c.field])}: <span className="line-through text-on-surface-variant">{c.from}</span> →{' '}
              <span className="text-amber-300">{c.to}</span>
            </li>
          ))}
          {diff.added.map((code) => (
            <li key={`a${code}`}>
              <strong>{code}</strong> <span className="text-secondary">{t('laws.tagNew')}</span>
            </li>
          ))}
          {diff.removed.map((code) => (
            <li key={`r${code}`}>
              <strong>{code}</strong> <span className="text-error">{t('laws.tagRemoved')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BackupReminder() {
  const t = useT()
  const { setIsBackupModalOpen } = useProductivity()
  const [show, setShow] = useState(false)
  const [never, setNever] = useState(false)

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const snoozed = Number(scopedStorage.getItem(BACKUP_SNOOZE_KEY) || 0)
    if (snoozed > now) return
    const last = Number(scopedStorage.getItem(LAST_BACKUP_KEY) || 0)
    if (last && now - last < BACKUP_EVERY_DAYS * DAY) return
    Promise.all([getAllShifts().catch(() => []), getAllArrests().catch(() => [])]).then(([shifts, arrests]) => {
      if (!alive || shifts.length + arrests.length === 0) return // nothing worth backing up yet
      setNever(!last)
      setShow(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // Hide as soon as a backup is exported in another component
  useEffect(() => {
    const onStorage = () => {
      const last = Number(scopedStorage.getItem(LAST_BACKUP_KEY) || 0)
      if (last && Date.now() - last < DAY) setShow(false)
    }
    window.addEventListener('leogrp:backup-done', onStorage)
    return () => window.removeEventListener('leogrp:backup-done', onStorage)
  }, [])

  if (!show) return null
  return (
    <div className="px-4 py-2 bg-primary/10 border-b border-primary/30 text-xs font-mono text-on-surface flex flex-wrap items-center gap-2">
      <span className="font-bold text-primary">💾 {t('backup.title')}</span>
      <span>
        {never ? t('backup.never') : t('backup.old', { days: BACKUP_EVERY_DAYS })} {t('backup.why')}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setIsBackupModalOpen(true)} className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold">
          {t('backup.now')}
        </button>
        <button
          onClick={() => {
            scopedStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now() + 3 * DAY))
            setShow(false)
          }}
          className="text-on-surface-variant hover:text-on-surface"
        >
          {t('backup.snooze')}
        </button>
      </div>
    </div>
  )
}

export default function NoticeBanners() {
  return (
    <>
      <LawUpdateBanner />
      <BackupReminder />
    </>
  )
}
