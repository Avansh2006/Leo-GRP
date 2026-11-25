/**
 * Per-server storage.
 *
 * Each server keeps its own profile, shifts, arrests, fines, notes and settings.
 * The default server (Grand RP) keeps the original key and database names so existing
 * officers don't lose anything; other servers get a "srv:<id>:" prefix / "__<id>" suffix.
 */

import { DEFAULT_SERVER_ID, getActiveServerId } from './registry'

export function scopedKey(key: string): string {
  const id = getActiveServerId()
  return id === DEFAULT_SERVER_ID ? key : `srv:${id}:${key}`
}

/** Drop-in for localStorage that keeps each server's data apart. */
export const scopedStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(scopedKey(key))
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(scopedKey(key), value)
  },
  removeItem(key: string): void {
    localStorage.removeItem(scopedKey(key))
  },
}

/** IndexedDB database name for the active server. */
export function getScopedDbName(baseName: string): string {
  const id = getActiveServerId()
  return id === DEFAULT_SERVER_ID ? baseName : `${baseName}__${id}`
}
