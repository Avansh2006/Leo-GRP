/** Notes, Quick Access shortcuts, pinned items and recent items. */
import { scopedStorage } from '@/servers'
import type { Note, QuickAccessItem, PinnedItem, RecentItem } from './types'
import { STORES, isValidNote, isValidQuickAccessItem, isValidPinnedItem, isValidRecentItem, memoryFallback, openDB } from './core'

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
    const saved = typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_notes_fallback') : null
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
      scopedStorage.setItem('leogrp_notes_fallback', JSON.stringify(Object.values(memoryFallback.notes)))
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
      scopedStorage.setItem('leogrp_notes_fallback', JSON.stringify(Object.values(memoryFallback.notes)))
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

export async function getQuickAccessItems(organization?: string): Promise<QuickAccessItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readonly')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      const request = store.getAll()
      request.onsuccess = () => {
        const raw = (request.result as any[]) || []
        let items = raw.filter(isValidQuickAccessItem)
        const isInitialized = typeof window !== 'undefined' ? scopedStorage.getItem(QA_INITIALIZED_KEY) === 'true' : false

        if (!isInitialized && items.length === 0) {
          // First startup: seed default items into IndexedDB and mark initialized
          saveQuickAccessList(DEFAULT_QUICK_ACCESS).catch(console.error)
          if (typeof window !== 'undefined') {
            scopedStorage.setItem(QA_INITIALIZED_KEY, 'true')
          }
          items = DEFAULT_QUICK_ACCESS
        }

        if (organization) {
          const orgFiltered = items.filter(
            (i) => !i.organization || i.organization === organization || i.organization === 'ALL'
          )
          orgFiltered.sort((a, b) => a.position - b.position)
          resolve(orgFiltered)
        } else {
          items.sort((a, b) => a.position - b.position)
          resolve(items)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    const saved = typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_qa_fallback') : null
    const isInitialized = typeof window !== 'undefined' ? scopedStorage.getItem(QA_INITIALIZED_KEY) === 'true' : false

    let fallbackItems: QuickAccessItem[] = DEFAULT_QUICK_ACCESS

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          fallbackItems = parsed.filter(isValidQuickAccessItem)
        }
      } catch {}
    } else if (Object.values(memoryFallback.quickAccess).length > 0) {
      fallbackItems = Object.values(memoryFallback.quickAccess)
    }

    if (!isInitialized && typeof window !== 'undefined') {
      scopedStorage.setItem(QA_INITIALIZED_KEY, 'true')
      scopedStorage.setItem('leogrp_qa_fallback', JSON.stringify(DEFAULT_QUICK_ACCESS))
    }

    if (organization) {
      return fallbackItems.filter(
        (i) => !i.organization || i.organization === organization || i.organization === 'ALL'
      )
    }

    return fallbackItems
  }
}

export async function saveQuickAccessList(items: QuickAccessItem[], organization?: string): Promise<void> {
  const validItems = items.filter(isValidQuickAccessItem)
  if (typeof window !== 'undefined') {
    scopedStorage.setItem(QA_INITIALIZED_KEY, 'true')
  }

  try {
    const db = await openDB()
    const allExisting: QuickAccessItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readonly')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result as QuickAccessItem[]) || [])
      req.onerror = () => reject(req.error)
    })

    let merged: QuickAccessItem[]
    if (organization) {
      // Retain items from other orgs, replace items for this org
      const otherOrgsItems = allExisting.filter(
        (i) => i.organization && i.organization !== organization && i.organization !== 'ALL'
      )
      const tagged = validItems.map((item, index) => ({
        ...item,
        organization: item.organization || organization,
        position: index,
      }))
      merged = [...otherOrgsItems, ...tagged]
    } else {
      merged = validItems.map((item, index) => ({ ...item, position: index }))
    }

    if (typeof window !== 'undefined') {
      scopedStorage.setItem('leogrp_qa_fallback', JSON.stringify(merged))
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUICK_ACCESS, 'readwrite')
      const store = tx.objectStore(STORES.QUICK_ACCESS)
      store.clear()
      merged.forEach((item, index) => {
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
