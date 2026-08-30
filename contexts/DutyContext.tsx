/**
 * Duty & Shift Activity Context for LEO-GRP
 * 100% Offline-first local duty management, structured fines and arrests logging, shift association, lifetime stats, and end-of-shift reports.
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  FineRecord,
  ShiftArrestRecord,
  ShiftRecord,
  ArrestChargeItem,
  getAllFines,
  getAllArrests,
  getAllShifts,
  saveFine as dbSaveFine,
  saveArrest as dbSaveArrest,
  saveShift as dbSaveShift,
  getDutyStatistics,
  generateId,
} from '@/utils/db'

// Helper function to get GMT+1 time
export const getGMT1Time = () => {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const gmt1 = new Date(utc + 3600000 * 1) // GMT+1
  return gmt1.toISOString()
}

export interface WeaponStatus {
  name: string
  status: 'returned' | 'lost' | 'broken' | 'used'
}

export interface EventCounter {
  name: string
  count: number
}

interface DutyContextType {
  // Duty State
  isOnDuty: boolean
  currentShiftId: string | null
  currentDutyStart: string | null
  currentOrganization: string
  setCurrentOrganization: (org: string) => void

  // Suspect Name Privacy Preference
  includeSuspectName: boolean
  setIncludeSuspectName: (val: boolean) => void

  // Current Shift Metrics
  currentShiftFines: number
  currentShiftFinesAmount: number
  currentShiftArrests: number
  currentShiftFinesList: FineRecord[]
  currentShiftArrestsList: ShiftArrestRecord[]
  weaponsTaken: string[]
  currentEventCounters: EventCounter[]

  // Lifetime Statistics (Calculated & Persisted from IndexedDB)
  lifetimeFines: number
  lifetimeFinesCount: number
  lifetimeArrests: number

  // Shift Logs
  dutyLogs: ShiftRecord[]
  lastEndedShiftReport: ShiftRecord | null
  isShiftSummaryOpen: boolean
  setIsShiftSummaryOpen: (open: boolean) => void

  // Duty Actions
  startDuty: (weapons: string[]) => void
  endDuty: (weaponStatus: WeaponStatus[], eventsAttended: string) => ShiftRecord | null
  issueFine: (data: {
    provisionCode: string
    provisionTitle: string
    fineAmount: number
    fineFormatted: string
    sourceDocument: string
    suspectName?: string
    passportNumber?: string
  }) => Promise<FineRecord>
  issueArrest: (data: {
    charges: ArrestChargeItem[]
    suspectName?: string
    passportNumber?: string
    totalFineAmount: number
    totalSentenceMonths: number
    stars?: string
    bailStatus?: string
  }) => Promise<ShiftArrestRecord>

  // Event Counters
  addEventCounter: (eventName: string) => void
  incrementEventCounter: (eventName: string) => void
  removeEventCounter: (eventName: string) => void

  // Report Generator
  formatShiftReportText: (shift: ShiftRecord) => string
}

const DutyContext = createContext<DutyContextType | undefined>(undefined)

const INCLUDE_NAME_KEY = 'leogrp_include_suspect_name'
const ACTIVE_SHIFT_KEY = 'leogrp_active_shift'
const CURRENT_ORG_KEY = 'selectedOrg'

export function DutyProvider({ children }: { children: ReactNode }) {
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [currentDutyStart, setCurrentDutyStart] = useState<string | null>(null)
  const [currentOrganization, setCurrentOrgState] = useState('LSPD')
  const [includeSuspectName, setIncludeSuspectNameState] = useState(true)

  // Current shift counters & lists
  const [currentShiftFines, setCurrentShiftFines] = useState(0)
  const [currentShiftFinesAmount, setCurrentShiftFinesAmount] = useState(0)
  const [currentShiftArrests, setCurrentShiftArrests] = useState(0)
  const [currentShiftFinesList, setCurrentShiftFinesList] = useState<FineRecord[]>([])
  const [currentShiftArrestsList, setCurrentShiftArrestsList] = useState<ShiftArrestRecord[]>([])
  const [weaponsTaken, setWeaponsTaken] = useState<string[]>([])
  const [currentEventCounters, setCurrentEventCounters] = useState<EventCounter[]>([])

  // Lifetime counts
  const [lifetimeFines, setLifetimeFines] = useState(0)
  const [lifetimeFinesCount, setLifetimeFinesCount] = useState(0)
  const [lifetimeArrests, setLifetimeArrests] = useState(0)

  // Historical shift logs
  const [dutyLogs, setDutyLogs] = useState<ShiftRecord[]>([])
  const [lastEndedShiftReport, setLastEndedShiftReport] = useState<ShiftRecord | null>(null)
  const [isShiftSummaryOpen, setIsShiftSummaryOpen] = useState(false)

  // Load initial settings and data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Organization
      const savedOrg = localStorage.getItem(CURRENT_ORG_KEY) || localStorage.getItem('user_org')
      if (savedOrg) setCurrentOrgState(savedOrg)

      // Suspect Name preference
      const savedNamePref = localStorage.getItem(INCLUDE_NAME_KEY)
      if (savedNamePref !== null) {
        setIncludeSuspectNameState(savedNamePref === 'true')
      }

      // Check active shift persistence
      const savedShift = localStorage.getItem(ACTIVE_SHIFT_KEY)
      if (savedShift) {
        try {
          const parsed = JSON.parse(savedShift)
          if (parsed && parsed.isOnDuty && parsed.shiftId) {
            setIsOnDuty(true)
            setCurrentShiftId(parsed.shiftId)
            setCurrentDutyStart(parsed.onDutyTime)
            setCurrentOrgState(parsed.organization || 'LSPD')
            setWeaponsTaken(parsed.weaponsTaken || [])
            setCurrentShiftFines(parsed.currentShiftFines || 0)
            setCurrentShiftFinesAmount(parsed.currentShiftFinesAmount || 0)
            setCurrentShiftArrests(parsed.currentShiftArrests || 0)
            setCurrentShiftFinesList(parsed.currentShiftFinesList || [])
            setCurrentShiftArrestsList(parsed.currentShiftArrestsList || [])
            setCurrentEventCounters(parsed.currentEventCounters || [])
          }
        } catch (e) {
          console.error('Failed to parse active shift:', e)
        }
      }
    }

    // Load persisted shift logs & lifetime stats from IndexedDB
    getAllShifts().then(setDutyLogs).catch(console.error)
    getDutyStatistics()
      .then((stats) => {
        setLifetimeFines(stats.lifetimeFinesAmount)
        setLifetimeFinesCount(stats.lifetimeFinesCount)
        setLifetimeArrests(stats.lifetimeArrestsCount)
      })
      .catch(console.error)
  }, [])

  // Sync active shift state to localStorage for persistence across reloads
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isOnDuty && currentShiftId) {
      const activeData = {
        isOnDuty: true,
        shiftId: currentShiftId,
        onDutyTime: currentDutyStart,
        organization: currentOrganization,
        weaponsTaken,
        currentShiftFines,
        currentShiftFinesAmount,
        currentShiftArrests,
        currentShiftFinesList,
        currentShiftArrestsList,
        currentEventCounters,
      }
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(activeData))
    } else {
      localStorage.removeItem(ACTIVE_SHIFT_KEY)
    }
  }, [
    isOnDuty,
    currentShiftId,
    currentDutyStart,
    currentOrganization,
    weaponsTaken,
    currentShiftFines,
    currentShiftFinesAmount,
    currentShiftArrests,
    currentShiftFinesList,
    currentShiftArrestsList,
    currentEventCounters,
  ])

  const setCurrentOrganization = useCallback((org: string) => {
    setCurrentOrgState(org)
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_ORG_KEY, org)
      localStorage.setItem('user_org', org)
    }
  }, [])

  const setIncludeSuspectName = useCallback((val: boolean) => {
    setIncludeSuspectNameState(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem(INCLUDE_NAME_KEY, String(val))
    }
  }, [])

  const startDuty = useCallback(
    (weapons: string[]) => {
      const newShiftId = `shift-${Date.now()}`
      const startTime = getGMT1Time()

      setIsOnDuty(true)
      setCurrentShiftId(newShiftId)
      setCurrentDutyStart(startTime)
      setWeaponsTaken(weapons)
      setCurrentShiftFines(0)
      setCurrentShiftFinesAmount(0)
      setCurrentShiftArrests(0)
      setCurrentShiftFinesList([])
      setCurrentShiftArrestsList([])
      setCurrentEventCounters([])
    },
    []
  )

  const endDuty = useCallback(
    (weaponStatus: WeaponStatus[], eventsAttended: string): ShiftRecord | null => {
      if (!currentDutyStart) return null

      const shiftRecord: ShiftRecord = {
        id: currentShiftId || `shift-${Date.now()}`,
        organization: currentOrganization,
        onDutyTime: currentDutyStart,
        offDutyTime: getGMT1Time(),
        fines: currentShiftFinesList,
        arrests: currentShiftArrestsList,
        totalFinesAmount: currentShiftFinesAmount,
        totalFinesCount: currentShiftFines,
        totalArrestsCount: currentShiftArrests,
        eventsAttended,
        eventCounters: currentEventCounters,
        weaponsTaken,
        weaponsReturned: weaponStatus.filter((w) => w.status === 'returned').map((w) => w.name),
        weaponStatus,
      }

      // Persist completed shift to IndexedDB
      dbSaveShift(shiftRecord).catch(console.error)

      setDutyLogs((prev) => [shiftRecord, ...prev])
      setLastEndedShiftReport(shiftRecord)
      setIsShiftSummaryOpen(true)

      // Reset active shift state
      setIsOnDuty(false)
      setCurrentShiftId(null)
      setCurrentDutyStart(null)
      setWeaponsTaken([])
      setCurrentShiftFines(0)
      setCurrentShiftFinesAmount(0)
      setCurrentShiftArrests(0)
      setCurrentShiftFinesList([])
      setCurrentShiftArrestsList([])
      setCurrentEventCounters([])

      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_SHIFT_KEY)
      }

      return shiftRecord
    },
    [
      currentDutyStart,
      currentShiftId,
      currentOrganization,
      currentShiftFinesList,
      currentShiftArrestsList,
      currentShiftFinesAmount,
      currentShiftFines,
      currentShiftArrests,
      weaponsTaken,
    ]
  )

  const issueFine = useCallback(
    async (data: {
      provisionCode: string
      provisionTitle: string
      fineAmount: number
      fineFormatted: string
      sourceDocument: string
      suspectName?: string
      passportNumber?: string
    }): Promise<FineRecord> => {
      const fineRecord: FineRecord = {
        id: generateId('fine'),
        type: 'fine',
        timestamp: new Date().toISOString(),
        shiftId: isOnDuty ? currentShiftId : null,
        organization: currentOrganization,
        suspectName: includeSuspectName ? data.suspectName?.trim() || undefined : undefined,
        passportNumber: data.passportNumber?.trim() || undefined,
        provisionCode: data.provisionCode,
        provisionTitle: data.provisionTitle,
        fineAmount: data.fineAmount,
        fineFormatted: data.fineFormatted,
        sourceDocument: data.sourceDocument,
      }

      // Persist to IndexedDB
      await dbSaveFine(fineRecord)

      // Update current shift metrics if on duty
      if (isOnDuty) {
        setCurrentShiftFines((prev) => prev + 1)
        setCurrentShiftFinesAmount((prev) => prev + data.fineAmount)
        setCurrentShiftFinesList((prev) => [fineRecord, ...prev])
      }

      // Update lifetime totals (source of truth derived)
      setLifetimeFines((prev) => prev + data.fineAmount)
      setLifetimeFinesCount((prev) => prev + 1)

      return fineRecord
    },
    [isOnDuty, currentShiftId, currentOrganization, includeSuspectName]
  )

  const issueArrest = useCallback(
    async (data: {
      charges: ArrestChargeItem[]
      suspectName?: string
      passportNumber?: string
      totalFineAmount: number
      totalSentenceMonths: number
      stars?: string
      bailStatus?: string
    }): Promise<ShiftArrestRecord> => {
      const arrestRecord: ShiftArrestRecord = {
        id: generateId('arrest'),
        type: 'arrest',
        timestamp: new Date().toISOString(),
        shiftId: isOnDuty ? currentShiftId : null,
        organization: currentOrganization,
        suspectName: includeSuspectName ? data.suspectName?.trim() || undefined : undefined,
        passportNumber: data.passportNumber?.trim() || undefined,
        status: 'ARRESTED',
        charges: data.charges,
        totalSentenceMonths: data.totalSentenceMonths,
        totalFineAmount: data.totalFineAmount,
        stars: data.stars,
        bailStatus: data.bailStatus,
      }

      // Persist to IndexedDB
      await dbSaveArrest(arrestRecord)

      // Update current shift metrics if on duty
      if (isOnDuty) {
        setCurrentShiftArrests((prev) => prev + 1)
        setCurrentShiftArrestsList((prev) => [arrestRecord, ...prev])
      }

      // Update lifetime totals
      setLifetimeArrests((prev) => prev + 1)

      return arrestRecord
    },
    [isOnDuty, currentShiftId, currentOrganization, includeSuspectName]
  )

  const addEventCounter = useCallback((eventName: string) => {
    setCurrentEventCounters((prev) => {
      if (prev.some((e) => e.name === eventName)) return prev
      return [...prev, { name: eventName, count: 1 }]
    })
  }, [])

  const incrementEventCounter = useCallback((eventName: string) => {
    setCurrentEventCounters((prev) =>
      prev.map((c) => (c.name === eventName ? { ...c, count: c.count + 1 } : c))
    )
  }, [])

  const removeEventCounter = useCallback((eventName: string) => {
    setCurrentEventCounters((prev) => prev.filter((c) => c.name !== eventName))
  }, [])

  const formatShiftReportText = useCallback(
    (shift: ShiftRecord): string => {
      const formatTime = (iso: string) => {
        try {
          const d = new Date(iso)
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        } catch {
          return iso
        }
      }

      let text = `END OF SHIFT\n`
      text += `────────────────────────\n`
      text += `Organization: ${shift.organization || 'LSPD'}\n`
      text += `Shift: ${formatTime(shift.onDutyTime)} → ${shift.offDutyTime ? formatTime(shift.offDutyTime) : 'Ongoing'}\n\n`

      text += `FINES ISSUED\n`
      text += `────────────────────────\n`
      if (shift.fines.length === 0) {
        text += `No fines issued during this shift.\n`
      } else {
        shift.fines.forEach((f, idx) => {
          text += `#${idx + 1}\n`
          text += `Fine: ${f.fineFormatted || `$${f.fineAmount.toLocaleString()}`}\n`
          if (f.passportNumber) text += `Passport No: ${f.passportNumber}\n`
          if (includeSuspectName && f.suspectName) text += `Name: ${f.suspectName}\n`
          text += `Charge: § ${f.provisionCode} — ${f.provisionTitle}\n\n`
        })
      }
      text += `Total Fines: $${shift.totalFinesAmount.toLocaleString()}\n\n`

      text += `ARRESTS\n`
      text += `────────────────────────\n`
      if (shift.arrests.length === 0) {
        text += `No arrests logged during this shift.\n`
      } else {
        shift.arrests.forEach((a, idx) => {
          text += `#${idx + 1}\n`
          if (a.passportNumber) text += `Passport No: ${a.passportNumber}\n`
          if (includeSuspectName && a.suspectName) text += `Name: ${a.suspectName}\n`
          text += `Status: ${a.status}\n`
          text += `Charges:\n`
          a.charges.forEach((c) => {
            text += `- § ${c.code} — ${c.title}\n`
          })
          if (a.totalSentenceMonths > 0) text += `Sentence: ${a.totalSentenceMonths} months\n`
          if (a.totalFineAmount > 0) text += `Fine: $${a.totalFineAmount.toLocaleString()}\n`
          if (a.stars) text += `Wanted: ${a.stars}\n`
          if (a.bailStatus) text += `Bail: ${a.bailStatus}\n`
          text += `\n`
        })
      }
      text += `Total Arrests: ${shift.totalArrestsCount}\n`

      return text.trim()
    },
    [includeSuspectName]
  )

  return (
    <DutyContext.Provider
      value={{
        isOnDuty,
        currentShiftId,
        currentDutyStart,
        currentOrganization,
        setCurrentOrganization,
        includeSuspectName,
        setIncludeSuspectName,
        currentShiftFines,
        currentShiftFinesAmount,
        currentShiftArrests,
        currentShiftFinesList,
        currentShiftArrestsList,
        weaponsTaken,
        currentEventCounters,
        lifetimeFines,
        lifetimeFinesCount,
        lifetimeArrests,
        dutyLogs,
        lastEndedShiftReport,
        isShiftSummaryOpen,
        setIsShiftSummaryOpen,
        startDuty,
        endDuty,
        issueFine,
        issueArrest,
        addEventCounter,
        incrementEventCounter,
        removeEventCounter,
        formatShiftReportText,
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
