/** Database setup: store names, id generation, record validators, in-memory fallback and openDB(). */
import { getScopedDbName } from '@/servers'
import type { Note, OfficerProfile, QuickAccessItem, PinnedItem, RecentItem, FineRecord, ShiftArrestRecord, ShiftRecord } from './types'

const DB_BASE_NAME = 'leogrp_productivity_db'
export const DB_VERSION = 4

export const STORES = {
  NOTES: 'notes',
  QUICK_ACCESS: 'quick_access',
  PINNED: 'pinned',
  RECENT: 'recent',
  METADATA: 'metadata',
  FINES: 'fines',
  ARRESTS: 'arrests',
  SHIFTS: 'shifts',
  AI_EMBEDDINGS: 'ai_embeddings',
  PROFILE: 'profile',
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

export function isValidOfficerProfile(obj: any): obj is OfficerProfile {
  return Boolean(
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.organization === 'string' &&
    typeof obj.passportNumber === 'string'
  )
}

// In-memory fallback if IndexedDB is unavailable
export const memoryFallback: {
  notes: Record<string, Note>
  quickAccess: Record<string, QuickAccessItem>
  pinned: Record<string, PinnedItem>
  recent: RecentItem[]
  metadata: Record<string, any>
  fines: Record<string, FineRecord>
  arrests: Record<string, ShiftArrestRecord>
  shifts: Record<string, ShiftRecord>
  profile: OfficerProfile | null
} = {
  notes: {},
  quickAccess: {},
  pinned: {},
  recent: [],
  metadata: {},
  fines: {},
  arrests: {},
  shifts: {},
  profile: null,
}

export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      return reject(new Error('IndexedDB not supported'))
    }

    try {
      const request = indexedDB.open(getScopedDbName(DB_BASE_NAME), DB_VERSION)

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

        // Version 3: Local AI Vector Embeddings Store
        if (!db.objectStoreNames.contains(STORES.AI_EMBEDDINGS)) {
          db.createObjectStore(STORES.AI_EMBEDDINGS, { keyPath: 'key' })
        }

        // Version 4: Local Officer Profile Store
        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'id' })
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
