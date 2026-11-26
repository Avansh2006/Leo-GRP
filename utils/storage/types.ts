/** Data shapes stored by the app (IndexedDB records, backups). */

export interface Note {
  id: string
  title: string
  content: string
  category: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface OfficerProfile {
  id: string
  name: string
  organization: string
  passportNumber: string
  badgeNumber?: string
  rank?: string
  callsign?: string
  createdAt: number
  updatedAt: number
  onboardingCompleted: boolean
}

export interface QuickAccessItem {
  id: string
  title: string
  type: 'command' | 'legislation' | 'page' | 'procedure' | 'report' | 'custom'
  target: string
  icon?: string
  snippet?: string
  position: number
  organization?: string
  createdAt: string
}

export interface PinnedItem {
  id: string
  type: 'command' | 'legislation' | 'note' | 'procedure' | 'template' | 'page'
  targetId: string
  title: string
  subtitle?: string
  data?: Record<string, any>
  position: number
  createdAt: string
}

export interface RecentItem {
  id: string
  type: 'command' | 'legislation' | 'procedure' | 'report' | 'page' | 'note'
  targetId: string
  title: string
  subtitle?: string
  url?: string
  timestamp: string
}

export interface FineRecord {
  id: string
  type: 'fine'
  timestamp: string
  shiftId: string | null
  organization: string
  suspectName?: string
  passportNumber?: string
  provisionCode: string
  provisionTitle: string
  fineAmount: number
  fineFormatted: string
  sourceDocument: string
}

export interface DetentionChargeItem {
  id: string
  code: string
  title: string
  fine?: string
  fineAmount: number
  sentence?: string
  sentenceMonths: number
  stars?: string
  bail?: string
  sourceDocument: string
  fineStatus: 'NOT_ISSUED' | 'ISSUED' | 'NOT_APPLICABLE'
  fineIssuedAt?: string
  fineRecordId?: string
}

export interface DetentionChecklistState {
  suspectIdentified: boolean
  chargesSelected: boolean
  requiredFinesIssued: boolean
  chargesCommunicated: boolean
  rightsRead: boolean
  rightsUnderstood: boolean
  docStatementCommunicated: boolean
  arrestFinalized: boolean
}

export interface ActiveDetention {
  id: string
  caseId: string
  startTime: string
  officerName: string
  organization: string
  passportNumber: string
  suspectName?: string
  charges: DetentionChargeItem[]
  checklist: DetentionChecklistState
  notes?: string
  status: 'ACTIVE' | 'FINALIZED' | 'ABANDONED'

  // 25-Minute Processing Timer & Lawyer Request State
  timerTotalSeconds?: number // 1500 (25 mins)
  timerStartedAt?: string // ISO timestamp
  isTimerPaused?: boolean
  timerPausedAt?: string // ISO timestamp
  timerRemainingAtPause?: number // seconds remaining when paused
  totalPausedDurationSeconds?: number // accumulated paused duration
  lawyerRequested?: boolean
  lawyerRequestedAt?: string // ISO timestamp
  lawyerResumedAt?: string // ISO timestamp
}

export interface ArrestChargeItem {
  code: string
  title: string
  fine?: string
  fineAmount?: number
  fineStatus?: 'NOT_ISSUED' | 'ISSUED' | 'NOT_APPLICABLE'
  fineIssuedAt?: string
  sentence?: string
  sentenceMonths?: number
  stars?: string
  bail?: string
}

export interface ShiftArrestRecord {
  id: string
  caseId?: string
  type: 'arrest'
  timestamp: string
  shiftId: string | null
  organization: string
  officerName?: string
  suspectName?: string
  passportNumber?: string
  status: 'ARRESTED'
  charges: ArrestChargeItem[]
  finesIssuedCount?: number
  totalSentenceMonths: number
  totalFineAmount: number
  stars?: string
  bailStatus?: string
  checklist?: DetentionChecklistState
  notes?: string
  docStatementIncluded?: boolean

  // Timer & Lawyer Audit Fields
  initialTimerFormatted?: string // e.g. "25:00"
  finalTimerRemainingSeconds?: number
  finalTimerRemainingFormatted?: string // e.g. "18:42" or "EXPIRED"
  lawyerRequested?: boolean
  lawyerRequestedAt?: string
  lawyerResumedAt?: string
  timerPausedAtFormatted?: string // e.g. "18:42"
}

export interface ShiftRecord {
  id: string
  organization: string
  onDutyTime: string
  offDutyTime?: string
  fines: FineRecord[]
  arrests: ShiftArrestRecord[]
  totalFinesAmount: number
  totalFinesCount: number
  totalArrestsCount: number
  eventsAttended?: string
  eventCounters?: Array<{ name: string; count: number }>
  weaponsTaken?: string[]
  weaponsReturned?: string[]
  weaponStatus?: Array<{ name: string; status: string }>
}

export interface AppBackup {
  format: 'leo-grp-backup'
  version: number
  exportedAt: string
  data: {
    notes: Note[]
    quickAccess: QuickAccessItem[]
    pinned: PinnedItem[]
    recent: RecentItem[]
    fines?: FineRecord[]
    arrests?: ShiftArrestRecord[]
    shifts?: ShiftRecord[]
    profile?: OfficerProfile | null
    settings?: Record<string, any>
  }
}
