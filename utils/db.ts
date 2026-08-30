/**
 * IndexedDB Storage & Local-First Data Layer for LEO-GRP
 * Robust, offline-first, client-side native IndexedDB with schema migration, validation, backup/restore, and safe fallback.
 */

export interface Note {
  id: string
  title: string
  content: string
  category: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface QuickAccessItem {
  id: string
  title: string
  type: 'command' | 'legislation' | 'page' | 'procedure' | 'report' | 'custom'
  target: string
  icon?: string
  snippet?: string
  position: number
  createdAt: string
}

export interface PinnedItem {
  id: string
  type: 'command' | 'legislation' | 'note' | 'procedure' | 'template' | 'page'
  targetId: string
  title: string
  subtitle?: string
  data?: Record<string, any>
  position: number
  createdAt: string
}

export interface RecentItem {
  id: string
  type: 'command' | 'legislation' | 'procedure' | 'report' | 'page' | 'note'
  targetId: string
  title: string
  subtitle?: string
  url?: string
  timestamp: string
}

export interface AppBackup {
  format: 'leo-grp-backup'
  version: number
  exportedAt: string
  data: {
    notes: Note[]
    quickAccess: QuickAccessItem[]
    pinned: PinnedItem[]
    recent: RecentItem[]
  }
}

const DB_NAME = 'leogrp_productivity_db'
const DB_VERSION = 1

const STORES = {
  NOTES: 'notes',
  QUICK_ACCESS: 'quick_access',
  PINNED: 'pinned',
  RECENT: 'recent',
  METADATA: 'metadata',
} as const

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// -------------------------------------------------------------
// DATA VALIDATION HELPERS
// -------------------------------------------------------------

export function isValidNote(obj: any): obj is Note {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.pinned === 'boolean'
  )
}

export function isValidQuickAccessItem(obj: any): obj is QuickAccessItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.target === 'string'
  )
}

export function isValidPinnedItem(obj: any): obj is PinnedItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.targetId === 'string' &&
    typeof obj.title === 'string'
  )
}

export function isValidRecentItem(obj: any): obj is RecentItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.targetId === 'string' &&
    typeof obj.title === 'string'
  )
}

// In-memory fallback if IndexedDB fails or is unavailable
const memoryFallback: {
  notes: Record<string, Note>
  quickAccess: Record<string, QuickAccessItem>
  pinned: Record<string, PinnedItem>
  recent: RecentItem[]
  metadata: Record<string, any>
} = {
  notes: {},
  quickAccess: {},
  pinned: {},
  recent: [],
  metadata: {},
}

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      return reject(new Error('IndexedDB not supported'))
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Notes Store
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const notesStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' })
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          notesStore.createIndex('pinned', 'pinned', { unique: false })
          notesStore.createIndex('category', 'category', { unique: false })
        }

        // Quick Access Store
        if (!db.objectStoreNames.contains(STORES.QUICK_ACCESS)) {
          const qaStore = db.createObjectStore(STORES.QUICK_ACCESS, { keyPath: 'id' })
          qaStore.createIndex('position', 'position', { unique: false })
        }

        // Pinned Items Store
        if (!db.objectStoreNames.contains(STORES.PINNED)) {
          const pinnedStore = db.createObjectStore(STORES.PINNED, { keyPath: 'id' })
          pinnedStore.createIndex('type', 'type', { unique: false })
          pinnedStore.createIndex('targetId', 'targetId', { unique: false })
          pinnedStore.createIndex('position', 'position', { unique: false })
        }

        // Recent Items Store
        if (!db.objectStoreNames.contains(STORES.RECENT)) {
          const recentStore = db.createObjectStore(STORES.RECENT, { keyPath: 'id' })
          recentStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Metadata Store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Failed to open database'))
    } catch (e) {
      reject(e)
    }
  })
}

// -------------------------------------------------------------
// NOTES API
// -------------------------------------------------------------

export async function getAllNotes(): Promise<Note[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readonly')
      const store = tx.objectStore(STORES.NOTES)
      const request = store.getAll()

      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const notes = raw.filter(isValidNote)
        // Sort: pinned first, then by updatedAt descending
        notes.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
        resolve(notes)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    console.warn('Falling back to memory/localStorage for notes:', e)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_notes_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidNote)
      } catch {}
    }
    return Object.values(memoryFallback.notes).filter(isValidNote)
  }
}

export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readonly')
      const store = tx.objectStore(STORES.NOTES)
      const request = store.get(id)
      request.onsuccess = () => {
        const res = request.result
        resolve(isValidNote(res) ? res : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    return memoryFallback.notes[id] || null
  }
}

export async function saveNote(note: Note): Promise<void> {
  if (!isValidNote(note)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readwrite')
      const store = tx.objectStore(STORES.NOTES)
      const request = store.put(note)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.notes[note.id] = note
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_notes_fallback', JSON.stringify(Object.values(memoryFallback.notes)))
    }
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readwrite')
      const store = tx.objectStore(STORES.NOTES)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    delete memoryFallback.notes[id]
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_notes_fallback', JSON.stringify(Object.values(memoryFallback.notes)))
    }
  }
}

// -------------------------------------------------------------
// QUICK ACCESS API
// -------------------------------------------------------------

const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: 'qa-attaching-bodycam',
    title: 'Attaching Bodycam',
    type: 'command',
    target: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof',
    snippet: '/me Takes out bodycam...',
    position: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'qa-traffic-stop',
    title: 'Traffic Stop Guide',
    type: 'page',
    target: '/patrolman-guide',
    snippet: 'Patrolman reference',
    position: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'qa-miranda',
    title: 'Miranda Rights',
    type: 'command',
    target: '/me reads Miranda Rights: You have the right to remain silent...',
    snippet: 'Miranda Warning',
    position: 2,
    createdAt: new Date().toISOString(),
  },
]

export async function getQuickAccessItems(): Promise<QuickAccessItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readonly')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const items = raw.filter(isValidQuickAccessItem)
        if (items.length === 0) {
          resolve(DEFAULT_QUICK_ACCESS)
        } else {
          items.sort((a, b) => a.position - b.position)
          resolve(items)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_qa_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(isValidQuickAccessItem)
        }
      } catch {}
    }
    return DEFAULT_QUICK_ACCESS
  }
}

export async function saveQuickAccessItem(item: QuickAccessItem): Promise<void> {
  if (!isValidQuickAccessItem(item)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readwrite')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.quickAccess[item.id] = item
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_qa_fallback', JSON.stringify(Object.values(memoryFallback.quickAccess)))
    }
  }
}

export async function saveQuickAccessList(items: QuickAccessItem[]): Promise<void> {
  const validItems = items.filter(isValidQuickAccessItem)
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readwrite')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      store.clear()
      validItems.forEach((item, index) => {
        store.put({ ...item, position: index })
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_qa_fallback', JSON.stringify(validItems))
    }
  }
}

export async function deleteQuickAccessItem(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readwrite')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    delete memoryFallback.quickAccess[id]
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_qa_fallback', JSON.stringify(Object.values(memoryFallback.quickAccess)))
    }
  }
}

// -------------------------------------------------------------
// PINNED ITEMS API
// -------------------------------------------------------------

export async function getAllPinnedItems(): Promise<PinnedItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PINNED, 'readonly')
      const store = tx.objectStore(STORES.PINNED)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const items = raw.filter(isValidPinnedItem)
        items.sort((a, b) => a.position - b.position)
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_pinned_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidPinnedItem)
      } catch {}
    }
    return Object.values(memoryFallback.pinned).filter(isValidPinnedItem)
  }
}

export async function savePinnedItem(item: PinnedItem): Promise<void> {
  if (!isValidPinnedItem(item)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PINNED, 'readwrite')
      const store = tx.objectStore(STORES.PINNED)
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.pinned[item.id] = item
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_pinned_fallback', JSON.stringify(Object.values(memoryFallback.pinned)))
    }
  }
}

export async function deletePinnedItem(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PINNED, 'readwrite')
      const store = tx.objectStore(STORES.PINNED)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    delete memoryFallback.pinned[id]
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_pinned_fallback', JSON.stringify(Object.values(memoryFallback.pinned)))
    }
  }
}

// -------------------------------------------------------------
// RECENT ITEMS API (Max 30 items)
// -------------------------------------------------------------

const MAX_RECENT_ITEMS = 30

export async function getRecentItems(): Promise<RecentItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECENT, 'readonly')
      const store = tx.objectStore(STORES.RECENT)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const items = raw.filter(isValidRecentItem)
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_recent_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidRecentItem)
      } catch {}
    }
    return memoryFallback.recent.filter(isValidRecentItem)
  }
}

export async function addRecentItem(item: Omit<RecentItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<void> {
  const newItem: RecentItem = {
    id: item.id || generateId('recent'),
    type: item.type,
    targetId: item.targetId,
    title: item.title,
    subtitle: item.subtitle,
    url: item.url,
    timestamp: item.timestamp || new Date().toISOString(),
  }

  if (!isValidRecentItem(newItem)) return

  try {
    const db = await openDB()
    const all = await getRecentItems()
    const filtered = all.filter(r => !(r.type === newItem.type && r.targetId === newItem.targetId))
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECENT, 'readwrite')
      const store = tx.objectStore(STORES.RECENT)
      store.clear()
      updated.forEach(it => store.put(it))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    const filtered = memoryFallback.recent.filter(r => !(r.type === newItem.type && r.targetId === newItem.targetId))
    memoryFallback.recent = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS)
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_recent_fallback', JSON.stringify(memoryFallback.recent))
    }
  }
}

export async function clearRecentItems(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECENT, 'readwrite')
      const store = tx.objectStore(STORES.RECENT)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.recent = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leogrp_recent_fallback')
    }
  }
}

// -------------------------------------------------------------
// BACKUP, RESTORE & DATA MANAGEMENT
// -------------------------------------------------------------

export async function exportAllData(): Promise<string> {
  const [notes, quickAccess, pinned, recent] = await Promise.all([
    getAllNotes(),
    getQuickAccessItems(),
    getAllPinnedItems(),
    getRecentItems(),
  ])

  const backup: AppBackup = {
    format: 'leo-grp-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      notes,
      quickAccess,
      pinned,
      recent,
    },
  }

  const jsonString = JSON.stringify(backup, null, 2)

  // Download file directly
  if (typeof window !== 'undefined') {
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `leo-grp-backup-${dateStr}.json`
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return jsonString
}

export async function validateBackupJson(jsonString: string): Promise<{ valid: boolean; backup?: AppBackup; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid JSON format' }
    }
    if (parsed.format !== 'leo-grp-backup') {
      return { valid: false, error: 'File is not a valid LEO-GRP backup' }
    }
    if (!parsed.data || typeof parsed.data !== 'object') {
      return { valid: false, error: 'Backup is missing data object' }
    }

    return { valid: true, backup: parsed as AppBackup }
  } catch (e: any) {
    return { valid: false, error: e?.message || 'Malformed JSON file' }
  }
}

export async function importBackupData(backup: AppBackup, mode: 'merge' | 'replace'): Promise<{ notesCount: number; quickAccessCount: number; pinnedCount: number }> {
  const incomingNotes = (backup.data.notes || []).filter(isValidNote)
  const incomingQA = (backup.data.quickAccess || []).filter(isValidQuickAccessItem)
  const incomingPinned = (backup.data.pinned || []).filter(isValidPinnedItem)
  const incomingRecent = (backup.data.recent || []).filter(isValidRecentItem)

  if (mode === 'replace') {
    // Clear and replace
    await clearAllLocalProductivityData()
    for (const note of incomingNotes) await saveNote(note)
    await saveQuickAccessList(incomingQA)
    for (const pin of incomingPinned) await savePinnedItem(pin)
    for (const rec of incomingRecent) await addRecentItem(rec)

    return {
      notesCount: incomingNotes.length,
      quickAccessCount: incomingQA.length,
      pinnedCount: incomingPinned.length,
    }
  }

  // Merge Mode
  const existingNotes = await getAllNotes()
  const existingQA = await getQuickAccessItems()
  const existingPinned = await getAllPinnedItems()

  // Merge Notes: match by ID; if exists, keep newer by updatedAt
  const noteMap = new Map<string, Note>()
  existingNotes.forEach(n => noteMap.set(n.id, n))
  for (const inNote of incomingNotes) {
    if (noteMap.has(inNote.id)) {
      const current = noteMap.get(inNote.id)!
      if (new Date(inNote.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
        noteMap.set(inNote.id, inNote)
      }
    } else {
      noteMap.set(inNote.id, inNote)
    }
  }

  for (const note of noteMap.values()) {
    await saveNote(note)
  }

  // Merge Quick Access: append new targets without duplicating target
  const qaTargets = new Set(existingQA.map(q => q.target))
  const mergedQA = [...existingQA]
  for (const inQA of incomingQA) {
    if (!qaTargets.has(inQA.target)) {
      mergedQA.push(inQA)
      qaTargets.add(inQA.target)
    }
  }
  await saveQuickAccessList(mergedQA)

  // Merge Pinned
  const pinKeys = new Set(existingPinned.map(p => `${p.type}-${p.targetId}`))
  for (const inPin of incomingPinned) {
    const key = `${inPin.type}-${inPin.targetId}`
    if (!pinKeys.has(key)) {
      await savePinnedItem(inPin)
      pinKeys.add(key)
    }
  }

  // Merge Recent
  for (const inRec of incomingRecent) {
    await addRecentItem(inRec)
  }

  return {
    notesCount: noteMap.size,
    quickAccessCount: mergedQA.length,
    pinnedCount: pinKeys.size,
  }
}

export async function clearAllLocalProductivityData(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.NOTES, STORES.QUICK_ACCESS, STORES.PINNED, STORES.RECENT], 'readwrite')
      tx.objectStore(STORES.NOTES).clear()
      tx.objectStore(STORES.QUICK_ACCESS).clear()
      tx.objectStore(STORES.PINNED).clear()
      tx.objectStore(STORES.RECENT).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    memoryFallback.notes = {}
    memoryFallback.quickAccess = {}
    memoryFallback.pinned = {}
    memoryFallback.recent = []
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('leogrp_notes_fallback')
    localStorage.removeItem('leogrp_qa_fallback')
    localStorage.removeItem('leogrp_pinned_fallback')
    localStorage.removeItem('leogrp_recent_fallback')
  }
}
