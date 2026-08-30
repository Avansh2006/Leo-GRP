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

export interface FineRecord {
  id: string
  type: 'fine'
  timestamp: string
  shiftId: string | null
  organization: string
  suspectName?: string
  passportNumber?: string
  provisionCode: string
  provisionTitle: string
  fineAmount: number
  fineFormatted: string
  sourceDocument: string
}

export interface DetentionChargeItem {
  id: string
  code: string
  title: string
  fine?: string
  fineAmount: number
  sentence?: string
  sentenceMonths: number
  stars?: string
  bail?: string
  sourceDocument: string
  fineStatus: 'NOT_ISSUED' | 'ISSUED' | 'NOT_APPLICABLE'
  fineIssuedAt?: string
  fineRecordId?: string
}

export interface DetentionChecklistState {
  suspectIdentified: boolean
  chargesSelected: boolean
  requiredFinesIssued: boolean
  chargesCommunicated: boolean
  rightsRead: boolean
  rightsUnderstood: boolean
  docStatementCommunicated: boolean
  arrestFinalized: boolean
}

export interface ActiveDetention {
  id: string
  caseId: string
  startTime: string
  officerName: string
  organization: string
  passportNumber: string
  suspectName?: string
  charges: DetentionChargeItem[]
  checklist: DetentionChecklistState
  notes?: string
  status: 'ACTIVE' | 'FINALIZED' | 'ABANDONED'
}

export interface ArrestChargeItem {
  code: string
  title: string
  fine?: string
  fineAmount?: number
  fineStatus?: 'NOT_ISSUED' | 'ISSUED' | 'NOT_APPLICABLE'
  fineIssuedAt?: string
  sentence?: string
  sentenceMonths?: number
  stars?: string
  bail?: string
}

export interface ShiftArrestRecord {
  id: string
  caseId?: string
  type: 'arrest'
  timestamp: string
  shiftId: string | null
  organization: string
  officerName?: string
  suspectName?: string
  passportNumber?: string
  status: 'ARRESTED'
  charges: ArrestChargeItem[]
  finesIssuedCount?: number
  totalSentenceMonths: number
  totalFineAmount: number
  stars?: string
  bailStatus?: string
  checklist?: DetentionChecklistState
  notes?: string
  docStatementIncluded?: boolean
}

export interface ShiftRecord {
  id: string
  organization: string
  onDutyTime: string
  offDutyTime?: string
  fines: FineRecord[]
  arrests: ShiftArrestRecord[]
  totalFinesAmount: number
  totalFinesCount: number
  totalArrestsCount: number
  eventsAttended?: string
  eventCounters?: Array<{ name: string; count: number }>
  weaponsTaken?: string[]
  weaponsReturned?: string[]
  weaponStatus?: Array<{ name: string; status: string }>
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
    fines?: FineRecord[]
    arrests?: ShiftArrestRecord[]
    shifts?: ShiftRecord[]
    settings?: Record<string, any>
  }
}

const DB_NAME = 'leogrp_productivity_db'
const DB_VERSION = 2

const STORES = {
  NOTES: 'notes',
  QUICK_ACCESS: 'quick_access',
  PINNED: 'pinned',
  RECENT: 'recent',
  METADATA: 'metadata',
  FINES: 'fines',
  ARRESTS: 'arrests',
  SHIFTS: 'shifts',
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

export function isValidFineRecord(obj: any): obj is FineRecord {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.type === 'fine' &&
    typeof obj.provisionCode === 'string' &&
    typeof obj.fineAmount === 'number'
  )
}

export function isValidShiftArrestRecord(obj: any): obj is ShiftArrestRecord {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.type === 'arrest' &&
    Array.isArray(obj.charges)
  )
}

export function isValidShiftRecord(obj: any): obj is ShiftRecord {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.onDutyTime === 'string'
  )
}

// In-memory fallback if IndexedDB is unavailable
const memoryFallback: {
  notes: Record<string, Note>
  quickAccess: Record<string, QuickAccessItem>
  pinned: Record<string, PinnedItem>
  recent: RecentItem[]
  metadata: Record<string, any>
  fines: Record<string, FineRecord>
  arrests: Record<string, ShiftArrestRecord>
  shifts: Record<string, ShiftRecord>
} = {
  notes: {},
  quickAccess: {},
  pinned: {},
  recent: [],
  metadata: {},
  fines: {},
  arrests: {},
  shifts: {},
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
          notesStore.createIndex('category', 'category', { unique: false })
          notesStore.createIndex('pinned', 'pinned', { unique: false })
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Quick Access Store
        if (!db.objectStoreNames.contains(STORES.QUICK_ACCESS)) {
          const qaStore = db.createObjectStore(STORES.QUICK_ACCESS, { keyPath: 'id' })
          qaStore.createIndex('position', 'position', { unique: false })
        }

        // Pinned Store
        if (!db.objectStoreNames.contains(STORES.PINNED)) {
          const pinnedStore = db.createObjectStore(STORES.PINNED, { keyPath: 'id' })
          pinnedStore.createIndex('type', 'type', { unique: false })
          pinnedStore.createIndex('position', 'position', { unique: false })
        }

        // Recent Items Store
        if (!db.objectStoreNames.contains(STORES.RECENT)) {
          const recentStore = db.createObjectStore(STORES.RECENT, { keyPath: 'id' })
          recentStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Metadata / Settings Store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }

        // Version 2: Fines Store
        if (!db.objectStoreNames.contains(STORES.FINES)) {
          const finesStore = db.createObjectStore(STORES.FINES, { keyPath: 'id' })
          finesStore.createIndex('shiftId', 'shiftId', { unique: false })
          finesStore.createIndex('timestamp', 'timestamp', { unique: false })
          finesStore.createIndex('organization', 'organization', { unique: false })
        }

        // Version 2: Arrests Store
        if (!db.objectStoreNames.contains(STORES.ARRESTS)) {
          const arrestsStore = db.createObjectStore(STORES.ARRESTS, { keyPath: 'id' })
          arrestsStore.createIndex('shiftId', 'shiftId', { unique: false })
          arrestsStore.createIndex('timestamp', 'timestamp', { unique: false })
          arrestsStore.createIndex('organization', 'organization', { unique: false })
        }

        // Version 2: Shifts Store
        if (!db.objectStoreNames.contains(STORES.SHIFTS)) {
          const shiftsStore = db.createObjectStore(STORES.SHIFTS, { keyPath: 'id' })
          shiftsStore.createIndex('onDutyTime', 'onDutyTime', { unique: false })
          shiftsStore.createIndex('organization', 'organization', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked: please close other tabs.')
      }
    } catch (err) {
      reject(err)
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
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_notes_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidNote)
      } catch {}
    }
    return Object.values(memoryFallback.notes)
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
// QUICK ACCESS API (WITH RELIABLE PERSISTENCE & HYDRATION)
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

const QA_INITIALIZED_KEY = 'leogrp_qa_initialized'

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
        const isInitialized = typeof window !== 'undefined' ? localStorage.getItem(QA_INITIALIZED_KEY) === 'true' : false

        if (!isInitialized && items.length === 0) {
          // First startup: seed default items into IndexedDB and mark initialized
          saveQuickAccessList(DEFAULT_QUICK_ACCESS).catch(console.error)
          if (typeof window !== 'undefined') {
            localStorage.setItem(QA_INITIALIZED_KEY, 'true')
          }
          resolve(DEFAULT_QUICK_ACCESS)
        } else {
          // User data exists (even if empty array []) -> source of truth
          items.sort((a, b) => a.position - b.position)
          resolve(items)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_qa_fallback') : null
    const isInitialized = typeof window !== 'undefined' ? localStorage.getItem(QA_INITIALIZED_KEY) === 'true' : false

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter(isValidQuickAccessItem)
        }
      } catch {}
    }

    if (!isInitialized) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(QA_INITIALIZED_KEY, 'true')
        localStorage.setItem('leogrp_qa_fallback', JSON.stringify(DEFAULT_QUICK_ACCESS))
      }
      return DEFAULT_QUICK_ACCESS
    }

    return Object.values(memoryFallback.quickAccess)
  }
}

export async function saveQuickAccessList(items: QuickAccessItem[]): Promise<void> {
  const validItems = items.filter(isValidQuickAccessItem)
  if (typeof window !== 'undefined') {
    localStorage.setItem(QA_INITIALIZED_KEY, 'true')
    localStorage.setItem('leogrp_qa_fallback', JSON.stringify(validItems))
  }

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
    memoryFallback.quickAccess = {}
    validItems.forEach((item, idx) => {
      memoryFallback.quickAccess[item.id] = { ...item, position: idx }
    })
  }
}

export async function saveQuickAccessItem(item: QuickAccessItem): Promise<void> {
  if (!isValidQuickAccessItem(item)) return
  try {
    const current = await getQuickAccessItems()
    const index = current.findIndex((i) => i.id === item.id)
    if (index !== -1) {
      current[index] = item
    } else {
      current.push(item)
    }
    await saveQuickAccessList(current)
  } catch (e) {
    memoryFallback.quickAccess[item.id] = item
  }
}

export async function deleteQuickAccessItem(id: string): Promise<void> {
  try {
    const current = await getQuickAccessItems()
    const filtered = current.filter((i) => i.id !== id)
    await saveQuickAccessList(filtered)
  } catch (e) {
    delete memoryFallback.quickAccess[id]
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
    return Object.values(memoryFallback.pinned)
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
  }
}

// -------------------------------------------------------------
// RECENT ITEMS API
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
    return memoryFallback.recent
  }
}

export async function addRecentItem(item: RecentItem): Promise<void> {
  if (!isValidRecentItem(item)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECENT, 'readwrite')
      const store = tx.objectStore(STORES.RECENT)
      
      const getReq = store.getAll()
      getReq.onsuccess = () => {
        const existing = (getReq.result as RecentItem[]) || []
        const filtered = existing.filter(
          (r) => !(r.type === item.type && r.targetId === item.targetId)
        )
        
        filtered.unshift(item)
        const toKeep = filtered.slice(0, MAX_RECENT_ITEMS)
        
        store.clear()
        toKeep.forEach((r) => store.put(r))
      }
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    memoryFallback.recent = [item, ...memoryFallback.recent.filter(
      (r) => !(r.type === item.type && r.targetId === item.targetId)
    )].slice(0, MAX_RECENT_ITEMS)
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
  }
}

// -------------------------------------------------------------
// FINES API (STRUCTURED PERSISTENCE & NO DOUBLE COUNTING)
// -------------------------------------------------------------

export async function getAllFines(): Promise<FineRecord[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FINES, 'readonly')
      const store = tx.objectStore(STORES.FINES)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const fines = raw.filter(isValidFineRecord)
        fines.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(fines)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_fines_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidFineRecord)
      } catch {}
    }
    return Object.values(memoryFallback.fines)
  }
}

export async function saveFine(fine: FineRecord): Promise<void> {
  if (!isValidFineRecord(fine)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FINES, 'readwrite')
      const store = tx.objectStore(STORES.FINES)
      const request = store.put(fine)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.fines[fine.id] = fine
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_fines_fallback', JSON.stringify(Object.values(memoryFallback.fines)))
    }
  }
}

export async function getFinesByShift(shiftId: string): Promise<FineRecord[]> {
  const all = await getAllFines()
  return all.filter((f) => f.shiftId === shiftId)
}

// -------------------------------------------------------------
// ARRESTS API
// -------------------------------------------------------------

export async function getAllArrests(): Promise<ShiftArrestRecord[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ARRESTS, 'readonly')
      const store = tx.objectStore(STORES.ARRESTS)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const arrests = raw.filter(isValidShiftArrestRecord)
        arrests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(arrests)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_arrests_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidShiftArrestRecord)
      } catch {}
    }
    return Object.values(memoryFallback.arrests)
  }
}

export async function saveArrest(arrest: ShiftArrestRecord): Promise<void> {
  if (!isValidShiftArrestRecord(arrest)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ARRESTS, 'readwrite')
      const store = tx.objectStore(STORES.ARRESTS)
      const request = store.put(arrest)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.arrests[arrest.id] = arrest
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_arrests_fallback', JSON.stringify(Object.values(memoryFallback.arrests)))
    }
  }
}

export async function getArrestsByShift(shiftId: string): Promise<ShiftArrestRecord[]> {
  const all = await getAllArrests()
  return all.filter((a) => a.shiftId === shiftId)
}

// -------------------------------------------------------------
// ACTIVE DETENTION PERSISTENCE
// -------------------------------------------------------------

export const ACTIVE_DETENTION_KEY = 'leogrp_active_detention'

export function saveActiveDetention(detention: ActiveDetention | null): void {
  if (typeof window === 'undefined') return
  if (detention && detention.status === 'ACTIVE') {
    localStorage.setItem(ACTIVE_DETENTION_KEY, JSON.stringify(detention))
  } else {
    localStorage.removeItem(ACTIVE_DETENTION_KEY)
  }
}

export function getActiveDetention(): ActiveDetention | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(ACTIVE_DETENTION_KEY)
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved)
    if (parsed && parsed.id && parsed.status === 'ACTIVE') {
      return parsed as ActiveDetention
    }
  } catch (e) {
    console.error('Failed to parse active detention:', e)
  }
  return null
}

export function clearActiveDetention(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_DETENTION_KEY)
}

// -------------------------------------------------------------
// SHIFTS API
// -------------------------------------------------------------

export async function getAllShifts(): Promise<ShiftRecord[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SHIFTS, 'readonly')
      const store = tx.objectStore(STORES.SHIFTS)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        const shifts = raw.filter(isValidShiftRecord)
        shifts.sort((a, b) => new Date(b.onDutyTime).getTime() - new Date(a.onDutyTime).getTime())
        resolve(shifts)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leogrp_shifts_fallback') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter(isValidShiftRecord)
      } catch {}
    }
    return Object.values(memoryFallback.shifts)
  }
}

export async function saveShift(shift: ShiftRecord): Promise<void> {
  if (!isValidShiftRecord(shift)) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SHIFTS, 'readwrite')
      const store = tx.objectStore(STORES.SHIFTS)
      const request = store.put(shift)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.shifts[shift.id] = shift
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_shifts_fallback', JSON.stringify(Object.values(memoryFallback.shifts)))
    }
  }
}

export async function getDutyStatistics(): Promise<{
  lifetimeFinesAmount: number
  lifetimeFinesCount: number
  lifetimeArrestsCount: number
}> {
  const [fines, arrests] = await Promise.all([getAllFines(), getAllArrests()])
  const lifetimeFinesAmount = fines.reduce((sum, f) => sum + (f.fineAmount || 0), 0)
  const lifetimeFinesCount = fines.length
  const lifetimeArrestsCount = arrests.length

  return {
    lifetimeFinesAmount,
    lifetimeFinesCount,
    lifetimeArrestsCount,
  }
}

// -------------------------------------------------------------
// BACKUP & RESTORE UTILITY
// -------------------------------------------------------------

export async function exportDatabaseBackup(): Promise<AppBackup> {
  const [notes, quickAccess, pinned, recent, fines, arrests, shifts] = await Promise.all([
    getAllNotes(),
    getQuickAccessItems(),
    getAllPinnedItems(),
    getRecentItems(),
    getAllFines(),
    getAllArrests(),
    getAllShifts(),
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
      settings: {
        includeSuspectName: typeof window !== 'undefined' ? localStorage.getItem('leogrp_include_suspect_name') !== 'false' : true,
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

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    if (raw.settings?.includeSuspectName !== undefined && typeof window !== 'undefined') {
      localStorage.setItem('leogrp_include_suspect_name', String(raw.settings.includeSuspectName))
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_notes_fallback', JSON.stringify(validNotes))
      localStorage.setItem('leogrp_qa_fallback', JSON.stringify(validQA))
      localStorage.setItem('leogrp_fines_fallback', JSON.stringify(validFines))
      localStorage.setItem('leogrp_arrests_fallback', JSON.stringify(validArrests))
      localStorage.setItem('leogrp_shifts_fallback', JSON.stringify(validShifts))
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

// Aliases for compatibility
export { exportDatabaseBackup as exportAllData }
export { importDatabaseBackup as importBackupData }
