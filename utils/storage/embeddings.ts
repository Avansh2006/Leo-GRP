/** Cached AI search embeddings. */
import { scopedStorage } from '@/servers'
import { STORES, openDB } from './core'

// AI VECTOR EMBEDDINGS CACHE API
// -------------------------------------------------------------

export interface CachedEmbeddingRecord {
  key: string
  corpusHash: string
  embeddings: Array<{ id: string; code: string; vector: number[] }>
  generatedAt: string
}

export async function saveEmbeddingCache(record: CachedEmbeddingRecord): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AI_EMBEDDINGS, 'readwrite')
      const store = tx.objectStore(STORES.AI_EMBEDDINGS)
      store.put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`leogrp_emb_${record.key}`, JSON.stringify(record))
      } catch {}
    }
  }
}

export async function getEmbeddingCache(key: string): Promise<CachedEmbeddingRecord | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AI_EMBEDDINGS, 'readonly')
      const store = tx.objectStore(STORES.AI_EMBEDDINGS)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    if (typeof window !== 'undefined') {
      const fallback = localStorage.getItem(`leogrp_emb_${key}`)
      if (fallback) {
        try {
          return JSON.parse(fallback)
        } catch {}
      }
    }
    return null
  }
}

export async function clearEmbeddingCache(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.AI_EMBEDDINGS, 'readwrite')
      tx.objectStore(STORES.AI_EMBEDDINGS).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('leogrp_emb_'))
        .forEach((k) => scopedStorage.removeItem(k))
    }
  }
}
