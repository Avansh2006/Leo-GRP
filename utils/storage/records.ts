/** Fines, arrests, the active detention and shifts (+ duty statistics). */
import { scopedStorage } from '@/servers'
import type { FineRecord, ActiveDetention, ShiftArrestRecord, ShiftRecord } from './types'
import { STORES, isValidFineRecord, isValidShiftArrestRecord, isValidShiftRecord, memoryFallback, openDB } from './core'

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
    const saved = typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_fines_fallback') : null
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
      scopedStorage.setItem('leogrp_fines_fallback', JSON.stringify(Object.values(memoryFallback.fines)))
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
    const saved = typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_arrests_fallback') : null
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
      scopedStorage.setItem('leogrp_arrests_fallback', JSON.stringify(Object.values(memoryFallback.arrests)))
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
    scopedStorage.setItem(ACTIVE_DETENTION_KEY, JSON.stringify(detention))
  } else {
    scopedStorage.removeItem(ACTIVE_DETENTION_KEY)
  }
}

export function getActiveDetention(): ActiveDetention | null {
  if (typeof window === 'undefined') return null
  const saved = scopedStorage.getItem(ACTIVE_DETENTION_KEY)
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
  scopedStorage.removeItem(ACTIVE_DETENTION_KEY)
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
    const saved = typeof window !== 'undefined' ? scopedStorage.getItem('leogrp_shifts_fallback') : null
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
      scopedStorage.setItem('leogrp_shifts_fallback', JSON.stringify(Object.values(memoryFallback.shifts)))
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
