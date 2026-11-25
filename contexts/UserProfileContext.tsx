'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getDefaultDepartment, scopedStorage, useServerPack } from '@/servers'
import {
  OfficerProfile,
  PROFILE_RECORD_ID,
  getOfficerProfile,
  saveOfficerProfile,
  deleteOfficerProfile,
} from '@/utils/db'

export interface WeaponLoadout {
  id: string
  name: string
  vests: string[]
  weapons: { weapon: string; ammo: string }[]
}

export interface UserProfileState extends OfficerProfile {
  loadouts: WeaponLoadout[]
}

interface UserProfileContextType {
  profile: UserProfileState
  isLoaded: boolean
  isOnboardingNeeded: boolean
  isOnboardingModalOpen: boolean
  setIsOnboardingModalOpen: (open: boolean) => void
  isProfileEditModalOpen: boolean
  setIsProfileEditModalOpen: (open: boolean) => void
  completeOnboarding: (data: {
    name: string
    organization: string
    passportNumber: string
    badgeNumber?: string
    rank?: string
    callsign?: string
  }) => Promise<void>
  updateProfile: (updates: Partial<UserProfileState>) => Promise<void>
  resetProfile: () => Promise<void>
  addLoadout: (loadout: WeaponLoadout) => void
  removeLoadout: (id: string) => void
  updateLoadout: (id: string, updates: Partial<WeaponLoadout>) => void
}

const defaultProfile: UserProfileState = {
  id: PROFILE_RECORD_ID,
  name: '',
  organization: getDefaultDepartment(),
  passportNumber: '',
  badgeNumber: '',
  rank: '',
  callsign: '',
  createdAt: 0,
  updatedAt: 0,
  onboardingCompleted: false,
  loadouts: [],
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const serverPack = useServerPack()
  const [profile, setProfile] = useState<UserProfileState>(() => ({ ...defaultProfile, organization: serverPack.server.defaultDepartment }))
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false)
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false)

  // Load profile from IndexedDB on mount
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const savedProfile = await getOfficerProfile()

        // Load weapon loadouts from localStorage
        let savedLoadouts: WeaponLoadout[] = []
        if (typeof window !== 'undefined') {
          const rawUser = scopedStorage.getItem('userProfile')
          if (rawUser) {
            try {
              const parsed = JSON.parse(rawUser)
              if (Array.isArray(parsed.loadouts)) {
                savedLoadouts = parsed.loadouts
              }
            } catch {}
          }
        }

        if (isMounted) {
          if (savedProfile && savedProfile.name && savedProfile.organization && savedProfile.passportNumber) {
            setProfile({
              ...savedProfile,
              loadouts: savedLoadouts,
            })
            setIsOnboardingModalOpen(!savedProfile.onboardingCompleted)
          } else {
            // First time or incomplete profile
            const currentOrg =
              (typeof window !== 'undefined' &&
                (scopedStorage.getItem('selectedOrg') ||
                  scopedStorage.getItem('leogrp_selected_org') ||
                  scopedStorage.getItem('user_org'))) ||
              getDefaultDepartment()

            setProfile({
              ...defaultProfile,
              organization: currentOrg,
              loadouts: savedLoadouts,
            })
            setIsOnboardingModalOpen(true)
          }
          setIsLoaded(true)
        }
      } catch (err) {
        console.error('Failed to load profile in UserProfileProvider:', err)
        if (isMounted) {
          setIsLoaded(true)
          setIsOnboardingModalOpen(true)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const isOnboardingNeeded =
    isLoaded &&
    (!profile.onboardingCompleted ||
      !profile.name.trim() ||
      !profile.organization.trim() ||
      !profile.passportNumber.trim())

  const completeOnboarding = useCallback(
    async (data: {
      name: string
      organization: string
      passportNumber: string
      badgeNumber?: string
      rank?: string
      callsign?: string
    }) => {
      const now = Date.now()
      const newProfileRecord: OfficerProfile = {
        id: PROFILE_RECORD_ID,
        name: data.name.trim(),
        organization: data.organization.trim() || getDefaultDepartment(),
        passportNumber: data.passportNumber.trim(),
        badgeNumber: data.badgeNumber?.trim() || undefined,
        rank: data.rank?.trim() || undefined,
        callsign: data.callsign?.trim() || undefined,
        createdAt: profile.createdAt || now,
        updatedAt: now,
        onboardingCompleted: true,
      }

      await saveOfficerProfile(newProfileRecord)

      setProfile((prev) => ({
        ...newProfileRecord,
        loadouts: prev.loadouts,
      }))
      setIsOnboardingModalOpen(false)

      // Dispatch event to notify other components of org/profile change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('leogrp:profile-updated', { detail: newProfileRecord }))
        window.dispatchEvent(new CustomEvent('leogrp:org-changed', { detail: newProfileRecord.organization }))
      }
    },
    [profile.createdAt]
  )

  const updateProfile = useCallback(
    async (updates: Partial<UserProfileState>) => {
      const now = Date.now()
      // Merge onto the latest saved record, not this callback's `profile`, which can be stale
      // (e.g. onboarding saves the profile and then immediately changes the organization).
      const saved = await getOfficerProfile().catch(() => null)
      const base: UserProfileState = saved ? { ...profile, ...saved, loadouts: profile.loadouts } : profile
      const updatedProfile: UserProfileState = {
        ...base,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : base.name,
        organization: updates.organization !== undefined ? updates.organization.trim() : base.organization,
        passportNumber: updates.passportNumber !== undefined ? updates.passportNumber.trim() : base.passportNumber,
        badgeNumber: updates.badgeNumber !== undefined ? updates.badgeNumber?.trim() : base.badgeNumber,
        rank: updates.rank !== undefined ? updates.rank?.trim() : base.rank,
        callsign: updates.callsign !== undefined ? updates.callsign?.trim() : base.callsign,
        updatedAt: now,
        onboardingCompleted: updates.onboardingCompleted !== undefined ? updates.onboardingCompleted : true,
      }

      const { loadouts, ...recordToSave } = updatedProfile
      await saveOfficerProfile(recordToSave)

      // Save loadouts if changed
      if (typeof window !== 'undefined') {
        scopedStorage.setItem(
          'userProfile',
          JSON.stringify({
            name: updatedProfile.name,
            id: updatedProfile.passportNumber,
            rank: updatedProfile.rank || '',
            badgeNumber: updatedProfile.badgeNumber || '',
            callsign: updatedProfile.callsign || '',
            loadouts: updatedProfile.loadouts || [],
          })
        )
      }

      setProfile(updatedProfile)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('leogrp:profile-updated', { detail: updatedProfile }))
        if (updates.organization) {
          window.dispatchEvent(new CustomEvent('leogrp:org-changed', { detail: updatedProfile.organization }))
        }
      }
    },
    [profile]
  )

  const resetProfile = useCallback(async () => {
    await deleteOfficerProfile()
    const resetState: UserProfileState = {
      ...defaultProfile,
      loadouts: profile.loadouts,
    }
    setProfile(resetState)
    setIsOnboardingModalOpen(true)
    setIsProfileEditModalOpen(false)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('leogrp:profile-reset'))
    }
  }, [profile.loadouts])

  const addLoadout = useCallback((loadout: WeaponLoadout) => {
    setProfile((prev) => {
      const nextLoadouts = [...prev.loadouts, loadout]
      if (typeof window !== 'undefined') {
        const saved = scopedStorage.getItem('userProfile')
        const parsed = saved ? JSON.parse(saved) : {}
        scopedStorage.setItem('userProfile', JSON.stringify({ ...parsed, loadouts: nextLoadouts }))
      }
      return { ...prev, loadouts: nextLoadouts }
    })
  }, [])

  const removeLoadout = useCallback((id: string) => {
    setProfile((prev) => {
      const nextLoadouts = prev.loadouts.filter((l) => l.id !== id)
      if (typeof window !== 'undefined') {
        const saved = scopedStorage.getItem('userProfile')
        const parsed = saved ? JSON.parse(saved) : {}
        scopedStorage.setItem('userProfile', JSON.stringify({ ...parsed, loadouts: nextLoadouts }))
      }
      return { ...prev, loadouts: nextLoadouts }
    })
  }, [])

  const updateLoadout = useCallback((id: string, updates: Partial<WeaponLoadout>) => {
    setProfile((prev) => {
      const nextLoadouts = prev.loadouts.map((l) => (l.id === id ? { ...l, ...updates } : l))
      if (typeof window !== 'undefined') {
        const saved = scopedStorage.getItem('userProfile')
        const parsed = saved ? JSON.parse(saved) : {}
        scopedStorage.setItem('userProfile', JSON.stringify({ ...parsed, loadouts: nextLoadouts }))
      }
      return { ...prev, loadouts: nextLoadouts }
    })
  }, [])

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isLoaded,
        isOnboardingNeeded,
        isOnboardingModalOpen,
        setIsOnboardingModalOpen,
        isProfileEditModalOpen,
        setIsProfileEditModalOpen,
        completeOnboarding,
        updateProfile,
        resetProfile,
        addLoadout,
        removeLoadout,
        updateLoadout,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
