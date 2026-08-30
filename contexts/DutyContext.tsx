/**
 * Duty & Shift Activity Context for LEO-GRP
 * 100% Offline-first local duty management, Fine-First Arrest Workflow, Active Detention state,
 * dynamic arrest scripts with configurable DOC notice, and end-of-shift reports.
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  FineRecord,
  ShiftArrestRecord,
  ShiftRecord,
  ArrestChargeItem,
  ActiveDetention,
  DetentionChargeItem,
  DetentionChecklistState,
  getAllFines,
  getAllArrests,
  getAllShifts,
  saveFine as dbSaveFine,
  saveArrest as dbSaveArrest,
  saveShift as dbSaveShift,
  saveActiveDetention as dbSaveActiveDetention,
  getActiveDetention as dbGetActiveDetention,
  clearActiveDetention as dbClearActiveDetention,
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

export const DEFAULT_DOC_STATEMENT =
  'Please be advised that these are the charges currently being applied to you. Additional charges may be added during processing at DOC if further violations are discovered. You will also be searched and processed at DOC in accordance with applicable procedure.'

export const DEFAULT_MIRANDA_RIGHTS = `You have the right to remain silent.
Anything you say can and will be used against you in a court of law.
You have the right to an attorney.
If you cannot afford an attorney, one will be appointed to you by the state if available.

Do you understand the rights I just read to you?`

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

  // Active Detention & Arrest Command Center State
  activeDetention: ActiveDetention | null
  isArrestCommandCenterOpen: boolean
  setIsArrestCommandCenterOpen: (open: boolean) => void
  startDetention: (data: { passportNumber: string; suspectName?: string; officerName?: string; notes?: string }) => ActiveDetention
  updateActiveDetention: (updater: (prev: ActiveDetention | null) => ActiveDetention | null) => void
  abandonDetention: () => void
  addChargeToDetention: (lawEntry: {
    code: string
    description: string
    fine?: string
    sentence?: string
    stars?: string
    bail?: string
    sourceDocument?: string
  }) => void
  removeChargeFromDetention: (chargeIdOrCode: string) => void
  issueFineForDetentionCharge: (chargeId: string) => Promise<FineRecord | null>
  finalizeActiveDetention: (options?: { notes?: string }) => Promise<ShiftArrestRecord | null>

  // Configurable Script Templates
  docStatementTemplate: string
  setDocStatementTemplate: (template: string) => void
  rightsScriptTemplate: string
  setRightsScriptTemplate: (template: string) => void

  // Script & Record Formatters
  generateArrestScript: (detention?: ActiveDetention | null) => string
  formatSingleChargeText: (charge: DetentionChargeItem | ArrestChargeItem) => string
  formatAllChargesText: (charges?: (DetentionChargeItem | ArrestChargeItem)[]) => string
  formatIssuedFinesText: (detention?: ActiveDetention | null) => string
  formatCompleteArrestRecord: (record?: ActiveDetention | ShiftArrestRecord | null) => string

  // Current Shift Metrics
  currentShiftFines: number
  currentShiftFinesAmount: number
  currentShiftArrests: number
  currentShiftFinesList: FineRecord[]
  currentShiftArrestsList: ShiftArrestRecord[]
  weaponsTaken: string[]
  currentEventCounters: EventCounter[]

  // Lifetime Statistics
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
const DOC_STATEMENT_KEY = 'leogrp_doc_statement_template'
const RIGHTS_SCRIPT_KEY = 'leogrp_rights_script_template'

export function DutyProvider({ children }: { children: ReactNode }) {
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [currentDutyStart, setCurrentDutyStart] = useState<string | null>(null)
  const [currentOrganization, setCurrentOrgState] = useState('LSPD')
  const [includeSuspectName, setIncludeSuspectNameState] = useState(true)

  // Active Detention & Workstation Modal State
  const [activeDetention, setActiveDetention] = useState<ActiveDetention | null>(null)
  const [isArrestCommandCenterOpen, setIsArrestCommandCenterOpen] = useState(false)

  // Configurable Templates
  const [docStatementTemplate, setDocStatementTemplateState] = useState(DEFAULT_DOC_STATEMENT)
  const [rightsScriptTemplate, setRightsScriptTemplateState] = useState(DEFAULT_MIRANDA_RIGHTS)

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

  // Load initial settings, active detention, and data on mount
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

      // Templates
      const savedDoc = localStorage.getItem(DOC_STATEMENT_KEY)
      if (savedDoc) setDocStatementTemplateState(savedDoc)
      const savedRights = localStorage.getItem(RIGHTS_SCRIPT_KEY)
      if (savedRights) setRightsScriptTemplateState(savedRights)

      // Active Detention Restore
      const savedDetention = dbGetActiveDetention()
      if (savedDetention) {
        setActiveDetention(savedDetention)
      }

      // Active Shift Restore
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

  // Sync active detention to storage
  useEffect(() => {
    dbSaveActiveDetention(activeDetention)
  }, [activeDetention])

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

  const setDocStatementTemplate = useCallback((template: string) => {
    setDocStatementTemplateState(template)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DOC_STATEMENT_KEY, template)
    }
  }, [])

  const setRightsScriptTemplate = useCallback((template: string) => {
    setRightsScriptTemplateState(template)
    if (typeof window !== 'undefined') {
      localStorage.setItem(RIGHTS_SCRIPT_KEY, template)
    }
  }, [])

  // -------------------------------------------------------------
  // ACTIVE DETENTION METHODS
  // -------------------------------------------------------------

  const startDetention = useCallback(
    (data: { passportNumber: string; suspectName?: string; officerName?: string; notes?: string }): ActiveDetention => {
      let officer = data.officerName?.trim()
      if (!officer && typeof window !== 'undefined') {
        officer = localStorage.getItem('officer_name') || localStorage.getItem('user_name') || 'Officer'
      }

      const caseNum = Math.floor(1000 + Math.random() * 9000)
      const newDetention: ActiveDetention = {
        id: generateId('detention'),
        caseId: `CASE-${caseNum}`,
        startTime: new Date().toISOString(),
        officerName: officer || 'Officer',
        organization: currentOrganization,
        passportNumber: data.passportNumber.trim(),
        suspectName: data.suspectName?.trim() || undefined,
        charges: [],
        checklist: {
          suspectIdentified: !!data.passportNumber.trim(),
          chargesSelected: false,
          requiredFinesIssued: true, // initially true since 0 charges
          chargesCommunicated: false,
          rightsRead: false,
          rightsUnderstood: false,
          docStatementCommunicated: false,
          arrestFinalized: false,
        },
        notes: data.notes?.trim() || undefined,
        status: 'ACTIVE',
      }

      setActiveDetention(newDetention)
      setIsArrestCommandCenterOpen(true)
      return newDetention
    },
    [currentOrganization]
  )

  const updateActiveDetention = useCallback((updater: (prev: ActiveDetention | null) => ActiveDetention | null) => {
    setActiveDetention((prev) => {
      const next = updater(prev)
      if (next) {
        // Auto-evaluate checklist states
        const hasCharges = next.charges.length > 0
        const unissuedCount = next.charges.filter((c) => c.fineStatus === 'NOT_ISSUED').length
        next.checklist.chargesSelected = hasCharges
        next.checklist.requiredFinesIssued = unissuedCount === 0
      }
      return next
    })
  }, [])

  const abandonDetention = useCallback(() => {
    setActiveDetention(null)
    setIsArrestCommandCenterOpen(false)
    dbClearActiveDetention()
  }, [])

  const addChargeToDetention = useCallback(
    (lawEntry: {
      code: string
      description: string
      fine?: string
      sentence?: string
      stars?: string
      bail?: string
      sourceDocument?: string
    }) => {
      let fineAmount = 0
      if (lawEntry.fine && lawEntry.fine !== '-') {
        const num = parseInt(lawEntry.fine.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) fineAmount = num
      }

      let sentenceMonths = 0
      if (lawEntry.sentence && lawEntry.sentence !== '-') {
        const num = parseInt(lawEntry.sentence.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) sentenceMonths = num
      }

      const fineStatus: 'NOT_ISSUED' | 'NOT_APPLICABLE' = fineAmount > 0 ? 'NOT_ISSUED' : 'NOT_APPLICABLE'

      const chargeItem: DetentionChargeItem = {
        id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code: lawEntry.code,
        title: lawEntry.description,
        fine: lawEntry.fine,
        fineAmount,
        sentence: lawEntry.sentence,
        sentenceMonths,
        stars: lawEntry.stars,
        bail: lawEntry.bail,
        sourceDocument: lawEntry.sourceDocument || 'Legislation',
        fineStatus,
      }

      setActiveDetention((prev) => {
        if (!prev) {
          // If no active detention, create a provisional one
          const officer =
            (typeof window !== 'undefined' && (localStorage.getItem('officer_name') || localStorage.getItem('user_name'))) ||
            'Officer'
          const caseNum = Math.floor(1000 + Math.random() * 9000)
          return {
            id: generateId('detention'),
            caseId: `CASE-${caseNum}`,
            startTime: new Date().toISOString(),
            officerName: officer,
            organization: currentOrganization,
            passportNumber: '',
            charges: [chargeItem],
            checklist: {
              suspectIdentified: false,
              chargesSelected: true,
              requiredFinesIssued: fineStatus !== 'NOT_ISSUED',
              chargesCommunicated: false,
              rightsRead: false,
              rightsUnderstood: false,
              docStatementCommunicated: false,
              arrestFinalized: false,
            },
            status: 'ACTIVE',
          }
        }

        // Avoid adding exact duplicate charge instance if desired, or allow adding
        const nextCharges = [...prev.charges, chargeItem]
        const unissuedCount = nextCharges.filter((c) => c.fineStatus === 'NOT_ISSUED').length

        return {
          ...prev,
          charges: nextCharges,
          checklist: {
            ...prev.checklist,
            chargesSelected: true,
            requiredFinesIssued: unissuedCount === 0,
          },
        }
      })
    },
    [currentOrganization]
  )

  const removeChargeFromDetention = useCallback((chargeIdOrCode: string) => {
    setActiveDetention((prev) => {
      if (!prev) return null
      const nextCharges = prev.charges.filter((c) => c.id !== chargeIdOrCode && c.code !== chargeIdOrCode)
      const hasCharges = nextCharges.length > 0
      const unissuedCount = nextCharges.filter((c) => c.fineStatus === 'NOT_ISSUED').length

      return {
        ...prev,
        charges: nextCharges,
        checklist: {
          ...prev.checklist,
          chargesSelected: hasCharges,
          requiredFinesIssued: unissuedCount === 0,
        },
      }
    })
  }, [])

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

      // Update lifetime totals
      setLifetimeFines((prev) => prev + data.fineAmount)
      setLifetimeFinesCount((prev) => prev + 1)

      return fineRecord
    },
    [isOnDuty, currentShiftId, currentOrganization, includeSuspectName]
  )

  const issueFineForDetentionCharge = useCallback(
    async (chargeId: string): Promise<FineRecord | null> => {
      if (!activeDetention) return null
      const charge = activeDetention.charges.find((c) => c.id === chargeId)
      if (!charge) return null
      if (charge.fineStatus === 'ISSUED') {
        throw new Error('Fine already issued for this charge.')
      }

      const fineRecord = await issueFine({
        provisionCode: charge.code,
        provisionTitle: charge.title,
        fineAmount: charge.fineAmount,
        fineFormatted: charge.fine || `$${charge.fineAmount.toLocaleString()}`,
        sourceDocument: charge.sourceDocument,
        suspectName: activeDetention.suspectName,
        passportNumber: activeDetention.passportNumber,
      })

      // Mark charge as ISSUED
      setActiveDetention((prev) => {
        if (!prev) return null
        const nextCharges = prev.charges.map((c) =>
          c.id === chargeId
            ? {
                ...c,
                fineStatus: 'ISSUED' as const,
                fineIssuedAt: fineRecord.timestamp,
                fineRecordId: fineRecord.id,
              }
            : c
        )
        const unissuedCount = nextCharges.filter((c) => c.fineStatus === 'NOT_ISSUED').length
        return {
          ...prev,
          charges: nextCharges,
          checklist: {
            ...prev.checklist,
            requiredFinesIssued: unissuedCount === 0,
          },
        }
      })

      return fineRecord
    },
    [activeDetention, issueFine]
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
      caseId?: string
      checklist?: DetentionChecklistState
      notes?: string
      officerName?: string
    }): Promise<ShiftArrestRecord> => {
      const arrestRecord: ShiftArrestRecord = {
        id: generateId('arrest'),
        caseId: data.caseId,
        type: 'arrest',
        timestamp: new Date().toISOString(),
        shiftId: isOnDuty ? currentShiftId : null,
        organization: currentOrganization,
        officerName: data.officerName || 'Officer',
        suspectName: includeSuspectName ? data.suspectName?.trim() || undefined : undefined,
        passportNumber: data.passportNumber?.trim() || undefined,
        status: 'ARRESTED',
        charges: data.charges,
        totalSentenceMonths: data.totalSentenceMonths,
        totalFineAmount: data.totalFineAmount,
        stars: data.stars,
        bailStatus: data.bailStatus,
        checklist: data.checklist,
        notes: data.notes,
        docStatementIncluded: true,
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

  const finalizeActiveDetention = useCallback(
    async (options?: { notes?: string }): Promise<ShiftArrestRecord | null> => {
      if (!activeDetention || activeDetention.charges.length === 0) return null

      // Verify no unissued required fines
      const unissued = activeDetention.charges.filter((c) => c.fineStatus === 'NOT_ISSUED')
      if (unissued.length > 0) {
        throw new Error(`${unissued.length} fine(s) still need to be issued before finalizing arrest.`)
      }

      let totalFine = 0
      let totalSentenceMonths = 0
      let maxStars = ''
      let hasNoBail = false
      let hasBail = false

      activeDetention.charges.forEach((c) => {
        totalFine += c.fineAmount || 0
        totalSentenceMonths += c.sentenceMonths || 0
        if (c.stars && c.stars.length > maxStars.length) maxStars = c.stars
        if (c.bail?.toLowerCase().includes('no bail')) hasNoBail = true
        else if (c.bail) hasBail = true
      })

      const bailStatus = hasNoBail ? 'NO BAIL' : hasBail ? 'Bail Eligible' : '-'

      const arrestRecord = await issueArrest({
        caseId: activeDetention.caseId,
        charges: activeDetention.charges.map((c) => ({
          code: c.code,
          title: c.title,
          fine: c.fine,
          fineAmount: c.fineAmount,
          fineStatus: c.fineStatus,
          fineIssuedAt: c.fineIssuedAt,
          sentence: c.sentence,
          sentenceMonths: c.sentenceMonths,
          stars: c.stars,
          bail: c.bail,
        })),
        officerName: activeDetention.officerName,
        suspectName: activeDetention.suspectName,
        passportNumber: activeDetention.passportNumber,
        totalFineAmount: totalFine,
        totalSentenceMonths: totalSentenceMonths,
        stars: maxStars || undefined,
        bailStatus: bailStatus !== '-' ? bailStatus : undefined,
        checklist: {
          ...activeDetention.checklist,
          arrestFinalized: true,
        },
        notes: options?.notes || activeDetention.notes,
      })

      // Clear active detention
      setActiveDetention(null)
      dbClearActiveDetention()

      return arrestRecord
    },
    [activeDetention, issueArrest]
  )

  // -------------------------------------------------------------
  // ARREST SCRIPT & RECORD FORMATTERS
  // -------------------------------------------------------------

  const formatSingleChargeText = useCallback((charge: DetentionChargeItem | ArrestChargeItem): string => {
    let text = `§ ${charge.code} — ${charge.title}`
    const parts: string[] = []
    if (charge.fine && charge.fine !== '-') parts.push(`Fine: ${charge.fine}`)
    if (charge.sentence && charge.sentence !== '-') parts.push(`Sentence: ${charge.sentence}`)
    if (parts.length > 0) text += ` — ${parts.join(' | ')}`
    return text
  }, [])

  const formatAllChargesText = useCallback(
    (charges?: (DetentionChargeItem | ArrestChargeItem)[]): string => {
      const list = charges || activeDetention?.charges || []
      if (list.length === 0) return 'No charges selected.'

      let text = `Current Charges:\n`
      list.forEach((c, idx) => {
        text += `${idx + 1}. § ${c.code} — ${c.title}`
        const parts: string[] = []
        if (c.fine && c.fine !== '-') parts.push(`Fine: ${c.fine}`)
        if (c.sentence && c.sentence !== '-') parts.push(`Sentence: ${c.sentence}`)
        if (parts.length > 0) text += ` (${parts.join(' | ')})`
        text += `\n`
      })
      return text.trim()
    },
    [activeDetention]
  )

  const formatIssuedFinesText = useCallback(
    (detention?: ActiveDetention | null): string => {
      const d = detention || activeDetention
      if (!d || d.charges.length === 0) return 'No fines issued.'

      const issued = d.charges.filter((c) => c.fineStatus === 'ISSUED')
      if (issued.length === 0) return 'No fines have been issued yet.'

      let total = 0
      let text = `Fines Issued:\n`
      issued.forEach((c, idx) => {
        text += `${idx + 1}. § ${c.code} — ${c.title} — ${c.fine || `$${c.fineAmount.toLocaleString()}`}\n`
        total += c.fineAmount
      })
      text += `\nTotal Fines: $${total.toLocaleString()}`
      return text.trim()
    },
    [activeDetention]
  )

  const generateArrestScript = useCallback(
    (detention?: ActiveDetention | null): string => {
      const d = detention || activeDetention
      if (!d) return 'No active arrest to generate script for.'

      const officer = d.officerName || 'Officer'
      const org = d.organization || currentOrganization || 'LSPD'
      const passport = d.passportNumber ? `Passport ${d.passportNumber}` : 'Subject'
      const namePart = includeSuspectName && d.suspectName ? `${d.suspectName}, ${passport}, ` : `${passport}, `

      let chargesBlock = ''
      if (d.charges.length === 0) {
        chargesBlock = 'No charges currently added.'
      } else {
        d.charges.forEach((c, idx) => {
          chargesBlock += `${idx + 1}. § ${c.code} — ${c.title}\n`
          if (c.fine && c.fine !== '-') chargesBlock += `   Fine: ${c.fine}\n`
          if (c.sentence && c.sentence !== '-') chargesBlock += `   Sentence: ${c.sentence}\n`
        })
      }

      let script = `I am Officer ${officer} with the ${org}.\n\n`
      script += `${namePart}you are being placed under arrest for the following current charges:\n\n`
      script += `${chargesBlock.trim()}\n\n`
      script += `You are being informed of your required rights:\n\n`
      script += `${rightsScriptTemplate.trim()}\n\n`
      script += `${docStatementTemplate.trim()}`

      return script
    },
    [activeDetention, currentOrganization, includeSuspectName, rightsScriptTemplate, docStatementTemplate]
  )

  const formatCompleteArrestRecord = useCallback(
    (record?: ActiveDetention | ShiftArrestRecord | null): string => {
      const r = record || activeDetention
      if (!r) return 'No arrest record.'

      const isDetention = 'charges' in r && r.charges.length > 0 && 'fineStatus' in r.charges[0]
      const officer = ('officerName' in r ? r.officerName : 'Officer') || 'Officer'
      const org = r.organization || currentOrganization || 'LSPD'
      const caseId = ('caseId' in r ? r.caseId : undefined) || 'CASE'
      const passport = r.passportNumber || 'N/A'
      const name = includeSuspectName && r.suspectName ? r.suspectName : undefined

      const formatTime = (iso: string) => {
        try {
          const d = new Date(iso)
          return (
            d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' +
            d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          )
        } catch {
          return iso
        }
      }

      let totalFine = 0
      let totalSentence = 0
      let stars = ''
      let bail = '-'

      if (isDetention) {
        const det = r as ActiveDetention
        det.charges.forEach((c) => {
          totalFine += c.fineAmount || 0
          totalSentence += c.sentenceMonths || 0
          if (c.stars && c.stars.length > stars.length) stars = c.stars
          if (c.bail) bail = c.bail
        })
      } else {
        const arr = r as ShiftArrestRecord
        totalFine = arr.totalFineAmount || 0
        totalSentence = arr.totalSentenceMonths || 0
        stars = arr.stars || ''
        bail = arr.bailStatus || '-'
      }

      let text = `ARREST RECORD\n`
      text += `────────────────────────\n`
      text += `Officer: ${officer}\n`
      text += `Organization: ${org}\n`
      if (caseId) text += `Case ID: ${caseId}\n`
      text += `\n`
      if (name) text += `Suspect: ${name}\n`
      text += `Passport: ${passport}\n\n`

      text += `Current Charges:\n`
      r.charges.forEach((c: any, idx: number) => {
        text += `${idx + 1}. § ${c.code} — ${c.title || c.description}\n`
        if (c.fine && c.fine !== '-') text += `   Fine: ${c.fine}\n`
        if (c.sentence && c.sentence !== '-') text += `   Sentence: ${c.sentence}\n`
      })
      text += `\n`

      text += `Total Fine: $${totalFine.toLocaleString()}\n`
      if (totalSentence > 0) text += `Total Sentence: ${totalSentence} months\n`
      if (stars) text += `Wanted Level: ${stars}\n`
      if (bail && bail !== '-') text += `Bail: ${bail}\n`
      text += `\n`

      text += `Rights:\n`
      text += `${rightsScriptTemplate.trim()}\n\n`

      text += `DOC NOTICE:\n`
      text += `${docStatementTemplate.trim()}\n\n`

      text += `Arrest Completed: ${formatTime(isDetention ? (r as ActiveDetention).startTime : (r as ShiftArrestRecord).timestamp)}\n`

      return text
    },
    [activeDetention, currentOrganization, includeSuspectName, rightsScriptTemplate, docStatementTemplate]
  )

  // -------------------------------------------------------------
  // SHIFT MANAGEMENT
  // -------------------------------------------------------------

  const startDuty = useCallback((weapons: string[]) => {
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
  }, [])

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
      currentEventCounters,
      weaponsTaken,
    ]
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
          return (
            d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' +
            d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          )
        } catch {
          return iso
        }
      }

      let text = `END OF SHIFT REPORT\n`
      text += `────────────────────────\n`
      text += `Organization: ${shift.organization || 'LSPD'}\n`
      text += `Shift: ${formatTime(shift.onDutyTime)} → ${shift.offDutyTime ? formatTime(shift.offDutyTime) : 'Ongoing'}\n\n`

      text += `FINES ISSUED (${shift.totalFinesCount})\n`
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

      text += `ARRESTS (${shift.totalArrestsCount})\n`
      text += `────────────────────────\n`
      if (shift.arrests.length === 0) {
        text += `No arrests made during this shift.\n`
      } else {
        shift.arrests.forEach((a, idx) => {
          text += `#${idx + 1}\n`
          if (a.passportNumber) text += `Passport No: ${a.passportNumber}\n`
          if (includeSuspectName && a.suspectName) text += `Name: ${a.suspectName}\n`
          text += `Status: ${a.status}\n`
          text += `Charges: (${a.charges.length})\n`
          a.charges.forEach((c) => {
            text += `- § ${c.code} — ${c.title}\n`
          })
          if (a.totalSentenceMonths > 0) text += `Sentence: ${a.totalSentenceMonths} months\n`
          text += `Fine: $${a.totalFineAmount.toLocaleString()}\n`
          if (a.stars) text += `Wanted: ${a.stars}\n`
          if (a.bailStatus) text += `Bail: ${a.bailStatus}\n`
          text += `\n`
        })
      }
      text += `Total Arrests: ${shift.totalArrestsCount}\n`

      return text
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

        activeDetention,
        isArrestCommandCenterOpen,
        setIsArrestCommandCenterOpen,
        startDetention,
        updateActiveDetention,
        abandonDetention,
        addChargeToDetention,
        removeChargeFromDetention,
        issueFineForDetentionCharge,
        finalizeActiveDetention,

        docStatementTemplate,
        setDocStatementTemplate,
        rightsScriptTemplate,
        setRightsScriptTemplate,

        generateArrestScript,
        formatSingleChargeText,
        formatAllChargesText,
        formatIssuedFinesText,
        formatCompleteArrestRecord,

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
  if (!context) {
    throw new Error('useDuty must be used within a DutyProvider')
  }
  return context
}
