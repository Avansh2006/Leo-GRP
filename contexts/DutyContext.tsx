'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DutyLog {
  id: string
  onDutyTime: string
  offDutyTime?: string
  totalArrests: number
  totalFines: number
  weaponsTaken: string[]
  weaponsReturned: string[]
  eventsAttended: string
}

interface DutyContextType {
  isOnDuty: boolean
  currentDutyStart: string | null
  arrestCount: number
  fineCount: number
  currentShiftArrests: number
  currentShiftFines: number
  weaponsTaken: string[]
  dutyLogs: DutyLog[]
  startDuty: (weapons: string[]) => void
  endDuty: (weaponsReturned: string[], eventsAttended: string) => void
  incrementArrests: () => void
  incrementFines: () => void
}

const DutyContext = createContext<DutyContextType | undefined>(undefined)

export function DutyProvider({ children }: { children: ReactNode }) {
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [currentDutyStart, setCurrentDutyStart] = useState<string | null>(null)
  const [arrestCount, setArrestCount] = useState(0)
  const [fineCount, setFineCount] = useState(0)
  const [weaponsTaken, setWeaponsTaken] = useState<string[]>([])
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([])
  const [currentShiftArrests, setCurrentShiftArrests] = useState(0)
  const [currentShiftFines, setCurrentShiftFines] = useState(0)

  useEffect(() => {
    const savedLogs = localStorage.getItem('dutyLogs')
    if (savedLogs) {
      setDutyLogs(JSON.parse(savedLogs))
    }
    
    // Load lifetime counts from localStorage
    const savedArrests = localStorage.getItem('lifetimeArrests')
    const savedFines = localStorage.getItem('lifetimeFines')
    if (savedArrests) setArrestCount(parseInt(savedArrests))
    if (savedFines) setFineCount(parseInt(savedFines))
  }, [])

  const startDuty = (weapons: string[]) => {
    setIsOnDuty(true)
    setCurrentDutyStart(new Date().toISOString())
    setCurrentShiftArrests(0)
    setCurrentShiftFines(0)
    setWeaponsTaken(weapons)
  }

  const endDuty = (weaponsReturned: string[], eventsAttended: string) => {
    if (!currentDutyStart) return

    const newLog: DutyLog = {
      id: Date.now().toString(),
      onDutyTime: currentDutyStart,
      offDutyTime: new Date().toISOString(),
      totalArrests: currentShiftArrests,
      totalFines: currentShiftFines,
      weaponsTaken,
      weaponsReturned,
      eventsAttended,
    }

    const updatedLogs = [newLog, ...dutyLogs]
    setDutyLogs(updatedLogs)
    localStorage.setItem('dutyLogs', JSON.stringify(updatedLogs))

    setIsOnDuty(false)
    setCurrentDutyStart(null)
    setCurrentShiftArrests(0)
    setCurrentShiftFines(0)
    setWeaponsTaken([])
  }

  const incrementArrests = () => {
    const newCount = arrestCount + 1
    setArrestCount(newCount)
    localStorage.setItem('lifetimeArrests', newCount.toString())
    
    // Also increment current shift count if on duty
    if (isOnDuty) {
      setCurrentShiftArrests((prev) => prev + 1)
    }
  }

  const incrementFines = () => {
    const newCount = fineCount + 1
    setFineCount(newCount)
    localStorage.setItem('lifetimeFines', newCount.toString())
    
    // Also increment current shift count if on duty
    if (isOnDuty) {
      setCurrentShiftFines((prev) => prev + 1)
    }
  }

  return (
    <DutyContext.Provider
      value={{
        isOnDuty,
        currentDutyStart,
        arrestCount,
        fineCount,
        currentShiftArrests,
        currentShiftFines,
        weaponsTaken,
        dutyLogs,
        startDuty,
        endDuty,
        incrementArrests,
        incrementFines,
      }}
    >
      {children}
    </DutyContext.Provider>
  )
}

export function useDuty() {
  const context = useContext(DutyContext)
  if (context === undefined) {
    throw new Error('useDuty must be used within a DutyProvider')
  }
  return context
}
