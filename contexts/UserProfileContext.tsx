'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface WeaponLoadout {
  id: string
  name: string
  vests: string[]
  weapons: { weapon: string; ammo: string }[]
}

export interface UserProfile {
  name: string
  id: string
  rank: string
  badgeNumber: string
  loadouts: WeaponLoadout[]
}

interface UserProfileContextType {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  addLoadout: (loadout: WeaponLoadout) => void
  removeLoadout: (id: string) => void
  updateLoadout: (id: string, updates: Partial<WeaponLoadout>) => void
}

const defaultProfile: UserProfile = {
  name: '',
  id: '',
  rank: '',
  badgeNumber: '',
  loadouts: [],
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('userProfile')
    if (saved) {
      try {
        setProfile(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load user profile:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever profile changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('userProfile', JSON.stringify(profile))
    }
  }, [profile, isLoaded])

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const addLoadout = (loadout: WeaponLoadout) => {
    setProfile(prev => ({
      ...prev,
      loadouts: [...prev.loadouts, loadout],
    }))
  }

  const removeLoadout = (id: string) => {
    setProfile(prev => ({
      ...prev,
      loadouts: prev.loadouts.filter(l => l.id !== id),
    }))
  }

  const updateLoadout = (id: string, updates: Partial<WeaponLoadout>) => {
    setProfile(prev => ({
      ...prev,
      loadouts: prev.loadouts.map(l =>
        l.id === id ? { ...l, ...updates } : l
      ),
    }))
  }

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
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
