/** The officer profile (one record per server). */
import { getDefaultDepartment, scopedStorage } from '@/servers'
import type { OfficerProfile } from './types'
import { STORES, isValidOfficerProfile, memoryFallback, openDB } from './core'

// OFFICER PROFILE API
// -------------------------------------------------------------

export const PROFILE_RECORD_ID = 'local-user-profile'

export async function getOfficerProfile(): Promise<OfficerProfile | null> {
  try {
    const db = await openDB()
    const fromDB: OfficerProfile | null = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROFILE, 'readonly')
      const store = tx.objectStore(STORES.PROFILE)
      const request = store.get(PROFILE_RECORD_ID)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })

    if (fromDB && isValidOfficerProfile(fromDB)) {
      return fromDB
    }

    // Check localStorage fallback / existing user profile migration
    if (typeof window !== 'undefined') {
      const savedUser = scopedStorage.getItem('userProfile') || scopedStorage.getItem('user_profile')
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser)
          if (parsed && (parsed.name || parsed.id)) {
            const org =
              scopedStorage.getItem('selectedOrg') ||
              scopedStorage.getItem('leogrp_selected_org') ||
              scopedStorage.getItem('user_org') ||
              getDefaultDepartment()
            const migrated: OfficerProfile = {
              id: PROFILE_RECORD_ID,
              name: parsed.name || '',
              organization: org,
              passportNumber: parsed.id || '',
              badgeNumber: parsed.badgeNumber || '',
              rank: parsed.rank || '',
              callsign: parsed.callsign || '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              onboardingCompleted: !!(parsed.name && (parsed.id || org)),
            }
            if (migrated.onboardingCompleted) {
              await saveOfficerProfile(migrated)
            }
            return migrated
          }
        } catch {}
      }
    }

    return memoryFallback.profile
  } catch (e) {
    if (typeof window !== 'undefined') {
      const fallback = scopedStorage.getItem('leogrp_profile_fallback')
      if (fallback) {
        try {
          const parsed = JSON.parse(fallback)
          if (isValidOfficerProfile(parsed)) return parsed
        } catch {}
      }
    }
    return memoryFallback.profile
  }
}

export async function saveOfficerProfile(profile: OfficerProfile): Promise<void> {
  const record: OfficerProfile = {
    ...profile,
    id: PROFILE_RECORD_ID,
    name: profile.name.trim(),
    organization: profile.organization.trim(),
    passportNumber: profile.passportNumber.trim(),
    badgeNumber: profile.badgeNumber?.trim() || undefined,
    rank: profile.rank?.trim() || undefined,
    callsign: profile.callsign?.trim() || undefined,
    updatedAt: Date.now(),
    onboardingCompleted: true,
  }

  if (typeof window !== 'undefined') {
    scopedStorage.setItem('leogrp_profile_fallback', JSON.stringify(record))
    scopedStorage.setItem('officer_name', record.name)
    scopedStorage.setItem('user_name', record.name)
    scopedStorage.setItem(
      'userProfile',
      JSON.stringify({
        name: record.name,
        id: record.passportNumber,
        rank: record.rank || '',
        badgeNumber: record.badgeNumber || '',
        callsign: record.callsign || '',
        loadouts: [],
      })
    )
    scopedStorage.setItem('selectedOrg', record.organization)
    scopedStorage.setItem('leogrp_selected_org', record.organization)
    scopedStorage.setItem('user_org', record.organization)
    scopedStorage.setItem('organization', record.organization)
  }

  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROFILE, 'readwrite')
      const store = tx.objectStore(STORES.PROFILE)
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.profile = record
  }
}

export async function deleteOfficerProfile(): Promise<void> {
  if (typeof window !== 'undefined') {
    scopedStorage.removeItem('leogrp_profile_fallback')
    scopedStorage.removeItem('officer_name')
    scopedStorage.removeItem('user_name')
    scopedStorage.removeItem('userProfile')
  }

  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROFILE, 'readwrite')
      const store = tx.objectStore(STORES.PROFILE)
      const request = store.delete(PROFILE_RECORD_ID)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    memoryFallback.profile = null
  }
}

// -------------------------------------------------------------
