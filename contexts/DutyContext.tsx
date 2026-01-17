'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Helper function to get GMT+1 time
const getGMT1Time = () => {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const gmt1 = new Date(utc + (3600000 * 1)) // GMT+1
  return gmt1.toISOString()
}

interface WeaponStatus {
  name: string
  status: 'returned' | 'lost' | 'broken' | 'used'
}

interface ArrestRecord {
  id: string
  suspectName: string
  charges: string[]
  fines: number
  timestamp: string
}

interface EventCounter {
  name: string
  count: number
}

interface DutyLog {
  id: string
  onDutyTime: string
  offDutyTime?: string
  totalArrests: number
  totalFines: number
  weaponsTaken: string[]
  weaponsReturned: string[]
  weaponStatus: WeaponStatus[]
  eventsAttended: string
  arrestRecords: ArrestRecord[]
  eventCounters: EventCounter[]
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
  currentArrestRecords: ArrestRecord[]
  currentEventCounters: EventCounter[]
  startDuty: (weapons: string[]) => void
  endDuty: (weaponStatus: WeaponStatus[], eventsAttended: string) => void
  incrementArrests: () => void
  incrementFines: () => void
  addArrestRecord: (suspectName: string, charges: string[], fines: number) => void
  addEventCounter: (eventName: string) => void
  incrementEventCounter: (eventName: string) => void
  removeEventCounter: (eventName: string) => void
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
  const [currentArrestRecords, setCurrentArrestRecords] = useState<ArrestRecord[]>([])
  const [currentEventCounters, setCurrentEventCounters] = useState<EventCounter[]>([])

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
    setCurrentDutyStart(getGMT1Time()) // Use GMT+1 time
    setCurrentShiftArrests(0)
    setCurrentShiftFines(0)
    setWeaponsTaken(weapons)
    setCurrentArrestRecords([])
    setCurrentEventCounters([])
  }

  const endDuty = (weaponStatus: WeaponStatus[], eventsAttended: string) => {
    if (!currentDutyStart) return

    const newLog: DutyLog = {
      id: Date.now().toString(),
      onDutyTime: currentDutyStart,
      offDutyTime: getGMT1Time(), // Use GMT+1 time
      totalArrests: currentShiftArrests,
      totalFines: currentShiftFines,
      weaponsTaken,
      weaponsReturned: weaponStatus.filter(w => w.status === 'returned').map(w => w.name),
      weaponStatus,
      eventsAttended,
      arrestRecords: currentArrestRecords,
      eventCounters: currentEventCounters,
    }

    const updatedLogs = [newLog, ...dutyLogs]
    setDutyLogs(updatedLogs)
    localStorage.setItem('dutyLogs', JSON.stringify(updatedLogs))

    setIsOnDuty(false)
    setCurrentDutyStart(null)
    setCurrentShiftArrests(0)
    setCurrentShiftFines(0)
    setWeaponsTaken([])
    setCurrentArrestRecords([])
    setCurrentEventCounters([])
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

  const addArrestRecord = (suspectName: string, charges: string[], fines: number) => {
    const newRecord: ArrestRecord = {
      id: Date.now().toString(),
      suspectName,
      charges,
      fines,
      timestamp: getGMT1Time()
    }
    setCurrentArrestRecords(prev => [...prev, newRecord])
  }

  const addEventCounter = (eventName: string) => {
    if (!currentEventCounters.find(e => e.name === eventName)) {
      setCurrentEventCounters(prev => [...prev, { name: eventName, count: 1 }])
    }
  }

  const incrementEventCounter = (eventName: string) => {
    setCurrentEventCounters(prev => 
      prev.map(counter => 
        counter.name === eventName 
          ? { ...counter, count: counter.count + 1 }
          : counter
      )
    )
  }

  const removeEventCounter = (eventName: string) => {
    setCurrentEventCounters(prev => prev.filter(e => e.name !== eventName))
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
        currentArrestRecords,
        currentEventCounters,
        startDuty,
        endDuty,
        incrementArrests,
        incrementFines,
        addArrestRecord,
        addEventCounter,
        incrementEventCounter,
        removeEventCounter,
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
