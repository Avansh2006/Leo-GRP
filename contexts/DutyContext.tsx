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

  useEffect(() => {
    const savedLogs = localStorage.getItem('dutyLogs')
    if (savedLogs) {
      setDutyLogs(JSON.parse(savedLogs))
    }
  }, [])

  const startDuty = (weapons: string[]) => {
    setIsOnDuty(true)
    setCurrentDutyStart(new Date().toISOString())
    setArrestCount(0)
    setFineCount(0)
    setWeaponsTaken(weapons)
  }

  const endDuty = (weaponsReturned: string[], eventsAttended: string) => {
    if (!currentDutyStart) return

    const newLog: DutyLog = {
      id: Date.now().toString(),
      onDutyTime: currentDutyStart,
      offDutyTime: new Date().toISOString(),
      totalArrests: arrestCount,
      totalFines: fineCount,
      weaponsTaken,
      weaponsReturned,
      eventsAttended,
    }

    const updatedLogs = [newLog, ...dutyLogs]
    setDutyLogs(updatedLogs)
    localStorage.setItem('dutyLogs', JSON.stringify(updatedLogs))

    setIsOnDuty(false)
    setCurrentDutyStart(null)
    setArrestCount(0)
    setFineCount(0)
    setWeaponsTaken([])
  }

  const incrementArrests = () => {
    setArrestCount((prev) => prev + 1)
  }

  const incrementFines = () => {
    setFineCount((prev) => prev + 1)
  }

  return (
    <DutyContext.Provider
      value={{
        isOnDuty,
        currentDutyStart,
        arrestCount,
        fineCount,
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
