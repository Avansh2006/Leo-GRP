/**
 * Arrest Command Center Workstation for LEO-GRP
 * Professional 3-column Tactical Precision workstation implementing the Fine-First Arrest Workflow,
 * live legislation search, explicit fine issuing, interactive checklist, and dynamic DOC-aware arrest scripts.
 */

'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useDuty } from '@/contexts/DutyContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useToast } from '@/components/ToastProvider'
import { loadAllLawData, LawEntry } from '@/utils/htmlParser'
import { ShiftArrestRecord, getAllArrests, DetentionChecklistState } from '@/utils/db'

interface ArrestCommandCenterModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ArrestCommandCenterModal({ isOpen, onClose }: ArrestCommandCenterModalProps) {
  const {
    activeDetention,
    updateActiveDetention,
    abandonDetention,
    addChargeToDetention,
    removeChargeFromDetention,
    issueFineForDetentionCharge,
    finalizeActiveDetention,
    generateArrestScript,
    formatSingleChargeText,
    formatAllChargesText,
    formatIssuedFinesText,
    formatCompleteArrestRecord,
    currentOrganization,
    includeSuspectName,
    currentShiftFines,
    currentShiftFinesAmount,
    currentShiftArrests,
    docStatementTemplate,
    rightsScriptTemplate,
  } = useDuty()

  const { profile } = useUserProfile()
  const { showToast } = useToast()

  // Tab mode: 'workstation' | 'history'
  const [activeTab, setActiveTab] = useState<'workstation' | 'history'>('workstation')

  // Legislation Database & Search
  const [allLaws, setAllLaws] = useState<LawEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LawEntry[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Finalizing loading state
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [activeNotes, setActiveNotes] = useState('')

  // History inspection modal
  const [historicalArrests, setHistoricalArrests] = useState<ShiftArrestRecord[]>([])
  const [selectedHistoricalArrest, setSelectedHistoricalArrest] = useState<ShiftArrestRecord | null>(null)

  // Load legislation entries
  useEffect(() => {
    loadAllLawData()
      .then((data) => setAllLaws(data.allEntries))
      .catch(console.error)
  }, [])

  // Load historical arrests when history tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      getAllArrests().then(setHistoricalArrests).catch(console.error)
    }
  }, [activeTab])

  // Stopwatch for active detention
  useEffect(() => {
    if (!activeDetention) {
      setElapsedSeconds(0)
      return
    }

    const start = new Date(activeDetention.startTime).getTime()
    const update = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - start) / 1000))
      setElapsedSeconds(diff)
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [activeDetention])

  // Sync notes from active detention
  useEffect(() => {
    if (activeDetention) {
      setActiveNotes(activeDetention.notes || '')
    }
  }, [activeDetention?.id])

  // Filter search results
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      return
    }

    const results = allLaws.filter((law) => {
      const matchesSearch =
        law.code.toLowerCase().includes(q) ||
        law.description.toLowerCase().includes(q) ||
        (law.remarks && law.remarks.toLowerCase().includes(q))

      const matchesCategory =
        selectedCategoryFilter === 'all' || law.documentType === selectedCategoryFilter

      return matchesSearch && matchesCategory
    })

    setSearchResults(results.slice(0, 15))
  }, [searchQuery, allLaws, selectedCategoryFilter])

  // Calculations for current charges in active detention
  const detentionTotals = useMemo(() => {
    if (!activeDetention || activeDetention.charges.length === 0) {
      return {
        totalFinesRequiredCount: 0,
        finesIssuedCount: 0,
        unissuedCount: 0,
        totalFineAmount: 0,
        totalSentenceMonths: 0,
        maxStars: '',
        bailStatus: '-',
      }
    }

    let totalFineAmount = 0
    let totalSentenceMonths = 0
    let maxStars = ''
    let hasNoBail = false
    let hasBail = false
    let totalFinesRequiredCount = 0
    let finesIssuedCount = 0

    activeDetention.charges.forEach((c) => {
      totalFineAmount += c.fineAmount || 0
      totalSentenceMonths += c.sentenceMonths || 0
      if (c.fineAmount > 0) {
        totalFinesRequiredCount++
        if (c.fineStatus === 'ISSUED') {
          finesIssuedCount++
        }
      }
      if (c.stars && c.stars.length > maxStars.length) maxStars = c.stars
      if (c.bail?.toLowerCase().includes('no bail')) hasNoBail = true
      else if (c.bail) hasBail = true
    })

    const unissuedCount = totalFinesRequiredCount - finesIssuedCount
    const bailStatus = hasNoBail ? 'NO BAIL' : hasBail ? 'Bail Eligible' : '-'

    return {
      totalFinesRequiredCount,
      finesIssuedCount,
      unissuedCount,
      totalFineAmount,
      totalSentenceMonths,
      maxStars: maxStars || '-',
      bailStatus,
    }
  }, [activeDetention])

  // Checklist completion calculation
  const checklistProgress = useMemo(() => {
    if (!activeDetention) return 0
    const cl = activeDetention.checklist
    const items = [
      cl.suspectIdentified,
      cl.chargesSelected,
      cl.requiredFinesIssued,
      cl.chargesCommunicated,
      cl.rightsRead,
      cl.rightsUnderstood,
      cl.docStatementCommunicated,
      cl.arrestFinalized,
    ]
    const completed = items.filter(Boolean).length
    return Math.round((completed / items.length) * 100)
  }, [activeDetention])

  if (!isOpen) return null

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Issue fine action
  const handleIssueFine = async (chargeId: string, provisionCode: string) => {
    try {
      const fine = await issueFineForDetentionCharge(chargeId)
      if (fine) {
        showToast(`Fine issued for § ${provisionCode} (${fine.fineFormatted})`, 'success')
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to issue fine', 'error')
    }
  }

  // Remove charge action
  const handleRemoveCharge = (chargeId: string, charge: any) => {
    if (charge.fineStatus === 'ISSUED') {
      if (
        !confirm(
          'This fine has already been issued and recorded in your shift history. Remove the charge from this arrest only?'
        )
      ) {
        return
      }
    }
    removeChargeFromDetention(chargeId)
    showToast(`Removed charge § ${charge.code}`, 'info')
  }

  // Checklist toggle
  const handleToggleChecklist = (key: keyof DetentionChecklistState) => {
    if (!activeDetention) return
    updateActiveDetention((prev) => {
      if (!prev) return null
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          [key]: !prev.checklist[key],
        },
      }
    })
  }

  // Finalize arrest action
  const handleFinalizeArrest = async () => {
    if (!activeDetention) return
    if (activeDetention.charges.length === 0) {
      showToast('Add at least one charge before finalizing arrest', 'error')
      return
    }

    if (detentionTotals.unissuedCount > 0) {
      showToast(`${detentionTotals.unissuedCount} required fine(s) must be issued before final arrest`, 'error')
      return
    }

    setIsFinalizing(true)
    try {
      const record = await finalizeActiveDetention({ notes: activeNotes })
      if (record) {
        showToast(`Arrest finalized successfully (#${record.id.slice(-6)})`, 'success')
        onClose()
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to finalize arrest', 'error')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Copy helper with toast
  const copyWithFeedback = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard`, 'success')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-7xl h-[92vh] max-h-[900px] bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl flex flex-col overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP TACTICAL WORKSTATION HEADER */}
        <header className="px-5 py-3.5 border-b border-outline-variant bg-surface-container-lowest flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm font-mono uppercase tracking-wider text-on-surface">
                    Arrest Command Center
                  </h2>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 font-mono text-[10px] font-bold rounded">
                    {currentOrganization}
                  </span>
                  {activeDetention && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono text-[10px] font-bold rounded">
                      {activeDetention.caseId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant font-mono">
                  {activeDetention
                    ? `Suspect: ${includeSuspectName && activeDetention.suspectName ? activeDetention.suspectName : 'Subject'} (Passport #${activeDetention.passportNumber || 'N/A'}) • Officer: ${activeDetention.officerName}`
                    : 'No active detention currently selected'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stopwatch & Tabs */}
            {activeDetention && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low border border-outline-variant rounded font-mono text-xs text-amber-400 font-bold">
                <span>⏱️</span>
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            )}

            <div className="flex bg-surface-container-high border border-outline-variant rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveTab('workstation')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'workstation'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Workstation
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Recent Arrests
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded transition-colors font-mono text-sm"
              title="Minimize Workstation"
            >
              ✕
            </button>
          </div>
        </header>

        {/* WORKSTATION CONTENT */}
        {activeTab === 'workstation' ? (
          activeDetention ? (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
              {/* LEFT COLUMN: Legislation Search & Quick Add (4 cols) */}
              <div className="lg:col-span-4 border-r border-outline-variant flex flex-col bg-surface-container-low/50 overflow-hidden">
                <div className="p-4 border-b border-outline-variant space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <span>🔍</span> Add Charges
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Active: {allLaws.length} provisions
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search code or description (e.g. 6.2.f, parking, GTA)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <button
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedCategoryFilter('traffic')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectedCategoryFilter === 'traffic'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest'
                      }`}
                    >
                      Traffic Code
                    </button>
                    <button
                      onClick={() => setSelectedCategoryFilter('penal')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectedCategoryFilter === 'penal'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest'
                      }`}
                    >
                      Penal Code
                    </button>
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-6 text-center text-on-surface-variant font-mono text-xs space-y-1.5">
                      <p className="text-secondary font-bold">Search Active Legislation</p>
                      <p className="text-[11px] opacity-75">
                        Type a charge name, keyword (e.g. speeding, mask, DUI) or section number to view matching provisions.
                      </p>
                    </div>
                  ) : (
                    searchResults.map((entry) => {
                      const isAlreadyAdded = activeDetention.charges.some((c) => c.code === entry.code)
                      return (
                        <div
                          key={entry.code}
                          className="bg-surface-container-lowest border border-outline-variant hover:border-primary/50 rounded-lg p-2.5 space-y-1.5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-xs text-primary mr-1.5">
                                § {entry.code}
                              </span>
                              <span className="text-xs font-semibold text-on-surface">
                                {entry.description}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                addChargeToDetention(entry)
                                showToast(`Added § ${entry.code}`, 'success')
                              }}
                              className={`px-2 py-1 text-[11px] font-mono font-bold rounded transition-colors flex-shrink-0 ${
                                isAlreadyAdded
                                  ? 'bg-secondary/20 text-secondary border border-secondary/40'
                                  : 'bg-primary hover:bg-primary-container text-on-primary'
                              }`}
                            >
                              {isAlreadyAdded ? '+ Add Again' : '+ Add Charge'}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-on-surface-variant">
                            {entry.fine && entry.fine !== '-' && (
                              <span className="text-amber-400 font-semibold">Fine: {entry.fine}</span>
                            )}
                            {entry.sentence && entry.sentence !== '-' && (
                              <span className="text-blue-400">Sentence: {entry.sentence}</span>
                            )}
                            {entry.stars && entry.stars !== '-' && <span>{entry.stars}</span>}
                            {entry.bail && entry.bail !== '-' && <span>Bail: {entry.bail}</span>}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* CENTER COLUMN: Selected Current Charges & Fine Issuance (5 cols) */}
              <div className="lg:col-span-5 border-r border-outline-variant flex flex-col bg-surface-container-low overflow-hidden">
                <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
                  <div>
                    <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <span>📑</span> Current Charges ({activeDetention.charges.length})
                    </span>
                    <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">
                      Additional charges may be added later during DOC processing.
                    </p>
                  </div>

                  <button
                    onClick={() => copyWithFeedback(formatAllChargesText(), 'All Charges')}
                    className="px-2.5 py-1 text-[11px] font-mono font-bold bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant rounded transition-colors"
                  >
                    📋 Copy All
                  </button>
                </div>

                {/* Warning Banner if Unissued Required Fines */}
                {detentionTotals.unissuedCount > 0 && (
                  <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-amber-400 text-xs font-mono flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      <strong>{detentionTotals.unissuedCount} fine(s)</strong> must be explicitly issued before finalizing arrest.
                    </span>
                  </div>
                )}

                {/* Selected Charges List */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {activeDetention.charges.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant font-mono text-xs space-y-2">
                      <p className="text-base">📋</p>
                      <p className="font-bold text-on-surface">No charges added yet</p>
                      <p className="text-[11px] opacity-75">
                        Search legislation on the left to attach charges to this detention.
                      </p>
                    </div>
                  ) : (
                    activeDetention.charges.map((charge, idx) => {
                      const isFineIssued = charge.fineStatus === 'ISSUED'
                      const hasFine = charge.fineAmount > 0

                      return (
                        <div
                          key={charge.id}
                          className={`bg-surface-container-lowest border rounded-lg p-3 space-y-2.5 transition-colors ${
                            isFineIssued
                              ? 'border-green-500/40 bg-green-950/10'
                              : hasFine
                              ? 'border-amber-500/30'
                              : 'border-outline-variant'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-primary">
                                  #{idx + 1} § {charge.code}
                                </span>
                                {isFineIssued ? (
                                  <span className="px-1.5 py-0.2 bg-green-500/20 text-green-400 font-mono text-[10px] font-bold rounded border border-green-500/30">
                                    🟢 FINE ISSUED
                                  </span>
                                ) : hasFine ? (
                                  <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 font-mono text-[10px] font-bold rounded border border-red-500/30">
                                    🔴 FINE NOT ISSUED
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-surface-container-high text-on-surface-variant font-mono text-[10px] rounded">
                                    NO FINE
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-semibold text-on-surface mt-0.5">
                                {charge.title}
                              </h4>
                            </div>

                            <button
                              onClick={() => handleRemoveCharge(charge.id, charge)}
                              className="text-on-surface-variant hover:text-error text-xs p-1"
                              title="Remove charge"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Penalties Strip */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-on-surface-variant bg-surface-container-low/60 rounded p-2">
                            {hasFine && (
                              <span className={isFineIssued ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>
                                Fine: {charge.fine || `$${charge.fineAmount.toLocaleString()}`}
                              </span>
                            )}
                            {charge.sentence && charge.sentence !== '-' && (
                              <span className="text-blue-400">Sentence: {charge.sentence}</span>
                            )}
                            {charge.stars && charge.stars !== '-' && <span>{charge.stars}</span>}
                            {charge.bail && charge.bail !== '-' && <span>Bail: {charge.bail}</span>}
                          </div>

                          {/* Fine & Copy Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              {hasFine && (
                                isFineIssued ? (
                                  <span className="px-2.5 py-1 bg-green-500/20 text-green-400 font-mono text-xs font-bold rounded border border-green-500/40 flex items-center gap-1">
                                    <span>✓</span> Fine Issued
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleIssueFine(charge.id, charge.code)}
                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm animate-pulse"
                                  >
                                    <span>⚡</span> Issue Fine ({charge.fine || `$${charge.fineAmount.toLocaleString()}`})
                                  </button>
                                )
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyWithFeedback(formatSingleChargeText(charge), 'Charge')}
                                className="px-2 py-1 text-[11px] font-mono text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded transition-colors"
                              >
                                📋 Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Subtotals Strip */}
                <div className="p-3.5 border-t border-outline-variant bg-surface-container-lowest grid grid-cols-3 gap-2 font-mono text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-on-surface-variant">Fines Issued</div>
                    <div className="font-bold text-green-400">
                      {detentionTotals.finesIssuedCount} / {detentionTotals.totalFinesRequiredCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-on-surface-variant">Total Fines</div>
                    <div className="font-bold text-amber-400">${detentionTotals.totalFineAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-on-surface-variant">Total Sentence</div>
                    <div className="font-bold text-blue-400">
                      {detentionTotals.totalSentenceMonths > 0 ? `${detentionTotals.totalSentenceMonths}m` : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Arrest Checklist & Speaking Script (3 cols) */}
              <div className="lg:col-span-3 flex flex-col bg-surface-container-low/30 overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-lowest space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <span>☑️</span> Arrest Checklist
                    </span>
                    <span className="font-mono text-xs font-bold text-secondary">
                      {checklistProgress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-secondary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="p-4 space-y-2 overflow-y-auto text-xs font-mono flex-1">
                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.suspectIdentified}
                      onChange={() => handleToggleChecklist('suspectIdentified')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Suspect Identified</span>
                      <p className="text-[10px] text-on-surface-variant">Passport #{activeDetention.passportNumber || 'N/A'}</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.chargesSelected}
                      onChange={() => handleToggleChecklist('chargesSelected')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Charges Selected</span>
                      <p className="text-[10px] text-on-surface-variant">{activeDetention.charges.length} charge(s)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.requiredFinesIssued}
                      onChange={() => handleToggleChecklist('requiredFinesIssued')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Required Fines Issued</span>
                      <p className="text-[10px] text-on-surface-variant">
                        {detentionTotals.unissuedCount === 0 ? 'All fines issued ✓' : `${detentionTotals.unissuedCount} remaining`}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.chargesCommunicated}
                      onChange={() => handleToggleChecklist('chargesCommunicated')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Charges Communicated</span>
                      <p className="text-[10px] text-on-surface-variant">Verbal notice given to suspect</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.rightsRead}
                      onChange={() => handleToggleChecklist('rightsRead')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Miranda / Rights Read</span>
                      <p className="text-[10px] text-on-surface-variant">Official script read to suspect</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.rightsUnderstood}
                      onChange={() => handleToggleChecklist('rightsUnderstood')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">Understanding Confirmed</span>
                      <p className="text-[10px] text-on-surface-variant">Suspect confirmed comprehension</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-1.5 bg-surface-container-lowest rounded border border-outline-variant/60 cursor-pointer hover:border-outline">
                    <input
                      type="checkbox"
                      checked={activeDetention.checklist.docStatementCommunicated}
                      onChange={() => handleToggleChecklist('docStatementCommunicated')}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="font-semibold text-on-surface">DOC Notice Communicated</span>
                      <p className="text-[10px] text-on-surface-variant">Informed of possible additional charges</p>
                    </div>
                  </label>

                  {/* Speaking Script Preview */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase">
                        Speaking Script
                      </span>
                      <button
                        onClick={() => copyWithFeedback(generateArrestScript(), 'Arrest Script')}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        📋 Copy Script
                      </button>
                    </div>
                    <div className="p-2 bg-surface-container-lowest border border-outline-variant rounded text-[11px] font-mono text-on-surface-variant max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {generateArrestScript()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono">
              <span className="text-4xl">🚨</span>
              <h3 className="text-base font-bold text-on-surface">No Active Detention</h3>
              <p className="text-xs text-on-surface-variant max-w-md">
                Take a subject into custody to initiate charge selection, fine issuing, and the custodial arrest workflow.
              </p>
            </div>
          )
        ) : (
          /* RECENT ARRESTS HISTORY TAB */
          <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                  Historical Custodial Arrests ({historicalArrests.length})
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Immutable record snapshots preserved locally in IndexedDB.
                </p>
              </div>
            </div>

            {historicalArrests.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-xs space-y-2">
                <p className="text-2xl">📁</p>
                <p>No historical arrests recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {historicalArrests.map((arrest) => (
                  <div
                    key={arrest.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-primary">#{arrest.id.slice(-6)}</span>
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded">
                            {arrest.organization || 'LSPD'}
                          </span>
                        </div>
                        {arrest.suspectName && (
                          <h4 className="text-xs font-bold text-on-surface mt-0.5">{arrest.suspectName}</h4>
                        )}
                        <p className="text-[11px] text-on-surface-variant">
                          Passport #{arrest.passportNumber || 'N/A'} • {arrest.charges.length} charge(s)
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedHistoricalArrest(arrest)}
                        className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant"
                      >
                        View
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/60">
                      <span>Fine: ${arrest.totalFineAmount.toLocaleString()}</span>
                      <span>Sentence: {arrest.totalSentenceMonths > 0 ? `${arrest.totalSentenceMonths}m` : '-'}</span>
                      <span className="opacity-75">
                        {new Date(arrest.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        {activeTab === 'workstation' && activeDetention && (
          <footer className="px-5 py-3 border-t border-outline-variant bg-surface-container-lowest flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => copyWithFeedback(formatAllChargesText(), 'All Charges')}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-colors flex items-center gap-1"
              >
                <span>📋</span> Copy All Charges
              </button>

              <button
                onClick={() => copyWithFeedback(formatIssuedFinesText(), 'Issued Fines')}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-colors flex items-center gap-1"
              >
                <span>💰</span> Copy Fines
              </button>

              <button
                onClick={() => copyWithFeedback(formatCompleteArrestRecord(), 'Complete Arrest Record')}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-colors flex items-center gap-1"
              >
                <span>📜</span> Copy Arrest Record
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to discard this active detention?')) {
                    abandonDetention()
                    showToast('Detention discarded', 'info')
                  }
                }}
                className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-error transition-colors"
              >
                Discard
              </button>

              <button
                onClick={handleFinalizeArrest}
                disabled={isFinalizing || detentionTotals.unissuedCount > 0 || activeDetention.charges.length === 0}
                className={`px-5 py-1.5 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm ${
                  detentionTotals.unissuedCount === 0 && activeDetention.charges.length > 0
                    ? 'bg-secondary hover:bg-secondary-container text-on-secondary cursor-pointer'
                    : 'bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed border border-outline-variant'
                }`}
              >
                <span>🟢</span>
                <span>{isFinalizing ? 'Finalizing...' : 'Finalize Arrest'}</span>
              </button>
            </div>
          </footer>
        )}

        {/* HISTORICAL ARREST DETAIL MODAL */}
        {selectedHistoricalArrest && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedHistoricalArrest(null)}
          >
            <div
              className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl p-5 space-y-4 text-on-surface font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📜</span>
                  <h3 className="font-bold text-sm uppercase">Historical Arrest Record</h3>
                </div>
                <button
                  onClick={() => setSelectedHistoricalArrest(null)}
                  className="text-on-surface-variant hover:text-on-surface text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded text-xs leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {formatCompleteArrestRecord(selectedHistoricalArrest)}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  onClick={() => copyWithFeedback(formatCompleteArrestRecord(selectedHistoricalArrest), 'Arrest Record')}
                  className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded"
                >
                  📋 Copy Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
