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

const LAW_SNAPSHOT_KEY = 'leogrp_law_snapshot'
export const LAST_BACKUP_KEY = 'leogrp_last_backup_at'
const BACKUP_SNOOZE_KEY = 'leogrp_backup_snoozed_until'
const DAY = 24 * 60 * 60 * 1000
const BACKUP_EVERY_DAYS = 7

/** Call after a successful backup export. */
export function markBackupDone() {
  scopedStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}

const FIELD_LABEL: Record<string, string> = { fine: 'fine', sentence: 'sentence', stars: 'wanted level', description: 'description' }

function LawUpdateBanner() {
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
    diff.changed.length && `${new Set(diff.changed.map((c) => c.code)).size} changed`,
    diff.added.length && `${diff.added.length} new`,
    diff.removed.length && `${diff.removed.length} removed`,
  ].filter(Boolean)

  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/40 text-xs font-mono text-on-surface">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-amber-400">⚖️ Laws updated:</span>
        <span>{parts.join(', ')}. Check new amounts before fining.</span>
        <button onClick={() => setOpen((o) => !o)} className="text-primary underline">
          {open ? 'Hide' : 'Show changes'}
        </button>
        <button onClick={acknowledge} className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold">
          Got it
        </button>
      </div>
      {open && (
        <ul className="mt-2 max-h-48 overflow-y-auto space-y-0.5 text-[11px]">
          {diff.changed.map((c, i) => (
            <li key={`c${i}`}>
              <strong>{c.code}</strong> {FIELD_LABEL[c.field]}: <span className="line-through text-on-surface-variant">{c.from}</span> →{' '}
              <span className="text-amber-300">{c.to}</span>
            </li>
          ))}
          {diff.added.map((code) => (
            <li key={`a${code}`}>
              <strong>{code}</strong> <span className="text-secondary">new</span>
            </li>
          ))}
          {diff.removed.map((code) => (
            <li key={`r${code}`}>
              <strong>{code}</strong> <span className="text-error">removed</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BackupReminder() {
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
      <span className="font-bold text-primary">💾 Back up your records:</span>
      <span>
        {never ? 'You have never exported a backup.' : `Last backup was over ${BACKUP_EVERY_DAYS} days ago.`} Your shifts and arrests
        are only stored in this browser.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setIsBackupModalOpen(true)} className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold">
          Back up now
        </button>
        <button
          onClick={() => {
            scopedStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now() + 3 * DAY))
            setShow(false)
          }}
          className="text-on-surface-variant hover:text-on-surface"
        >
          Remind me in 3 days
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
