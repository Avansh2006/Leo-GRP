/** Backup export/import and clearing local data. */
import { scopedStorage } from '@/servers'
import type { Note, QuickAccessItem, PinnedItem, RecentItem, FineRecord, ShiftArrestRecord, ShiftRecord, AppBackup } from './types'
import { DB_VERSION, STORES, isValidNote, isValidQuickAccessItem, isValidPinnedItem, isValidRecentItem, isValidFineRecord, isValidShiftArrestRecord, isValidShiftRecord, isValidOfficerProfile, memoryFallback, openDB } from './core'
import { getAllNotes, getQuickAccessItems, getAllPinnedItems, getRecentItems } from './productivity'
import { getAllFines, getAllArrests, getAllShifts } from './records'
import { getOfficerProfile, saveOfficerProfile } from './profile'

// BACKUP & RESTORE UTILITY
// -------------------------------------------------------------

export async function exportDatabaseBackup(): Promise<AppBackup> {
  const [notes, quickAccess, pinned, recent, fines, arrests, shifts, profile] = await Promise.all([
    getAllNotes(),
    getQuickAccessItems(),
    getAllPinnedItems(),
    getRecentItems(),
    getAllFines(),
    getAllArrests(),
    getAllShifts(),
    getOfficerProfile(),
  ])

  return {
    format: 'leo-grp-backup',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      notes,
      quickAccess,
      pinned,
      recent,
      fines,
      arrests,
      shifts,
      profile: profile || null,
      settings: {
        includeSuspectName: typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_include_suspect_name') !== 'false' : true,
      },
    },
  }
}

export async function importDatabaseBackup(
  backupData: any,
  mode: 'merge' | 'replace' = 'replace'
): Promise<{
  notesCount: number
  quickAccessCount: number
  pinnedCount: number
  recentCount: number
  finesCount: number
  arrestsCount: number
  shiftsCount: number
  profileRestored: boolean
}> {
  if (!backupData || typeof backupData !== 'object' || backupData.format !== 'leo-grp-backup') {
    throw new Error('Invalid backup file format. Expected a valid LEO-GRP JSON backup.')
  }

  const raw = backupData.data || {}
  const validNotes = (raw.notes || []).filter(isValidNote)
  const validQA = (raw.quickAccess || []).filter(isValidQuickAccessItem)
  const validPinned = (raw.pinned || []).filter(isValidPinnedItem)
  const validRecent = (raw.recent || []).filter(isValidRecentItem)
  const validFines = (raw.fines || []).filter(isValidFineRecord)
  const validArrests = (raw.arrests || []).filter(isValidShiftArrestRecord)
  const validShifts = (raw.shifts || []).filter(isValidShiftRecord)
  const validProfile = raw.profile && isValidOfficerProfile(raw.profile) ? raw.profile : null

  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [
          STORES.NOTES,
          STORES.QUICK_ACCESS,
          STORES.PINNED,
          STORES.RECENT,
          STORES.FINES,
          STORES.ARRESTS,
          STORES.SHIFTS,
          STORES.PROFILE,
        ],
        'readwrite'
      )

      // Notes
      const notesStore = tx.objectStore(STORES.NOTES)
      if (mode === 'replace') notesStore.clear()
      validNotes.forEach((n: Note) => notesStore.put(n))

      // Quick Access
      const qaStore = tx.objectStore(STORES.QUICK_ACCESS)
      if (mode === 'replace') qaStore.clear()
      validQA.forEach((qa: QuickAccessItem, idx: number) => qaStore.put({ ...qa, position: idx }))

      // Pinned
      const pinnedStore = tx.objectStore(STORES.PINNED)
      if (mode === 'replace') pinnedStore.clear()
      validPinned.forEach((p: PinnedItem, idx: number) => pinnedStore.put({ ...p, position: idx }))

      // Recent
      const recentStore = tx.objectStore(STORES.RECENT)
      if (mode === 'replace') recentStore.clear()
      validRecent.forEach((r: RecentItem) => recentStore.put(r))

      // Fines
      const finesStore = tx.objectStore(STORES.FINES)
      if (mode === 'replace') finesStore.clear()
      validFines.forEach((f: FineRecord) => finesStore.put(f))

      // Arrests
      const arrestsStore = tx.objectStore(STORES.ARRESTS)
      if (mode === 'replace') arrestsStore.clear()
      validArrests.forEach((a: ShiftArrestRecord) => arrestsStore.put(a))

      // Shifts
      const shiftsStore = tx.objectStore(STORES.SHIFTS)
      if (mode === 'replace') shiftsStore.clear()
      validShifts.forEach((s: ShiftRecord) => shiftsStore.put(s))

      // Profile
      if (validProfile) {
        const profileStore = tx.objectStore(STORES.PROFILE)
        if (mode === 'replace' || !memoryFallback.profile) {
          profileStore.put(validProfile)
        }
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    if (validProfile && (mode === 'replace' || typeof window !== 'undefined')) {
      await saveOfficerProfile(validProfile)
    }

    if (raw.settings?.includeSuspectName !== undefined && typeof window !== 'undefined') {
      scopedStorage.setItem('leogrp_include_suspect_name', String(raw.settings.includeSuspectName))
    }
  } catch (e) {
    // Save to memory fallback & localStorage
    validNotes.forEach((n: Note) => (memoryFallback.notes[n.id] = n))
    validQA.forEach((qa: QuickAccessItem, idx: number) => (memoryFallback.quickAccess[qa.id] = { ...qa, position: idx }))
    validPinned.forEach((p: PinnedItem) => (memoryFallback.pinned[p.id] = p))
    memoryFallback.recent = validRecent
    validFines.forEach((f: FineRecord) => (memoryFallback.fines[f.id] = f))
    validArrests.forEach((a: ShiftArrestRecord) => (memoryFallback.arrests[a.id] = a))
    validShifts.forEach((s: ShiftRecord) => (memoryFallback.shifts[s.id] = s))
    if (validProfile) memoryFallback.profile = validProfile

    if (typeof window !== 'undefined') {
      scopedStorage.setItem('leogrp_notes_fallback', JSON.stringify(validNotes))
      scopedStorage.setItem('leogrp_qa_fallback', JSON.stringify(validQA))
      scopedStorage.setItem('leogrp_fines_fallback', JSON.stringify(validFines))
      scopedStorage.setItem('leogrp_arrests_fallback', JSON.stringify(validArrests))
      scopedStorage.setItem('leogrp_shifts_fallback', JSON.stringify(validShifts))
    }
  }

  return {
    notesCount: validNotes.length,
    quickAccessCount: validQA.length,
    pinnedCount: validPinned.length,
    recentCount: validRecent.length,
    finesCount: validFines.length,
    arrestsCount: validArrests.length,
    shiftsCount: validShifts.length,
    profileRestored: Boolean(validProfile),
  }
}

export async function validateBackupJson(jsonString: string): Promise<{ valid: boolean; backup?: any; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed || typeof parsed !== 'object' || parsed.format !== 'leo-grp-backup') {
      return { valid: false, error: 'Invalid backup format. Must be a valid LEO-GRP JSON backup file.' }
    }
    return { valid: true, backup: parsed }
  } catch (e: any) {
    return { valid: false, error: `JSON Parse error: ${e.message}` }
  }
}

export async function clearAllLocalProductivityData(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [
          STORES.NOTES,
          STORES.QUICK_ACCESS,
          STORES.PINNED,
          STORES.RECENT,
          STORES.FINES,
          STORES.ARRESTS,
          STORES.SHIFTS,
        ],
        'readwrite'
      )
      tx.objectStore(STORES.NOTES).clear()
      tx.objectStore(STORES.QUICK_ACCESS).clear()
      tx.objectStore(STORES.PINNED).clear()
      tx.objectStore(STORES.RECENT).clear()
      tx.objectStore(STORES.FINES).clear()
      tx.objectStore(STORES.ARRESTS).clear()
      tx.objectStore(STORES.SHIFTS).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    memoryFallback.notes = {}
    memoryFallback.quickAccess = {}
    memoryFallback.pinned = {}
    memoryFallback.recent = []
    memoryFallback.fines = {}
    memoryFallback.arrests = {}
    memoryFallback.shifts = {}
  }
}

// -------------------------------------------------------------

// Alias kept for existing callers
export { exportDatabaseBackup as exportAllData }
export { importDatabaseBackup as importBackupData }
