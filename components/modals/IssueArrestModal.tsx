/**
 * Issue Arrest Modal for LEO-GRP
 * Upgraded Fine-First Custodial Arrest Modal with fine issuance tracking,
 * active detention integration, and dynamic arrest scripts.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { LawEntry } from '@/utils/htmlParser'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

interface IssueArrestModalProps {
  isOpen: boolean
  onClose: () => void
  charges: LawEntry[]
  onRemoveCharge: (code: string) => void
  onClearCharges: () => void
}

export default function IssueArrestModal({
  isOpen,
  onClose,
  charges,
  onRemoveCharge,
  onClearCharges,
}: IssueArrestModalProps) {
  const {
    currentOrganization,
    includeSuspectName,
    issueArrest,
    issueFine,
    startDetention,
    setIsArrestCommandCenterOpen,
    formatSingleChargeText,
    formatAllChargesText,
    formatCompleteArrestRecord,
  } = useDuty()

  const { showToast } = useToast()

  const [suspectName, setSuspectName] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track issued fines state per charge code
  const [issuedFineCodes, setIssuedFineCodes] = useState<Record<string, boolean>>({})

  // Calculate totals from selected charges
  const totals = useMemo(() => {
    let totalFine = 0
    let totalSentenceMonths = 0
    let maxStars = ''
    let hasNoBail = false
    let hasBail = false
    let requiredFinesCount = 0
    let issuedFinesCount = 0

    charges.forEach((c) => {
      // Fine
      let fineNum = 0
      if (c.fine && c.fine !== '-') {
        const num = parseInt(c.fine.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) {
          fineNum = num
          totalFine += num
          requiredFinesCount++
          if (issuedFineCodes[c.code]) {
            issuedFinesCount++
          }
        }
      }

      // Sentence
      if (c.sentence && c.sentence !== '-') {
        const num = parseInt(c.sentence.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) totalSentenceMonths += num
      }

      // Stars
      if (c.stars && c.stars !== '-') {
        if (c.stars.length > maxStars.length) maxStars = c.stars
      }

      // Bail
      if (c.bail && c.bail !== '-') {
        if (c.bail.toLowerCase().includes('no bail')) {
          hasNoBail = true
        } else {
          hasBail = true
        }
      }
    })

    let bailStatus = '-'
    if (hasNoBail) bailStatus = 'NO BAIL'
    else if (hasBail) bailStatus = 'Bail Eligible'

    const unissuedFinesCount = requiredFinesCount - issuedFinesCount

    return {
      totalFine,
      totalSentenceMonths,
      maxStars: maxStars || '-',
      bailStatus,
      requiredFinesCount,
      issuedFinesCount,
      unissuedFinesCount,
    }
  }, [charges, issuedFineCodes])

  useEffect(() => {
    if (isOpen) {
      setSuspectName('')
      setPassportNumber('')
      setIsSubmitting(false)
      setIssuedFineCodes({})
    }
  }, [isOpen])

  if (!isOpen || charges.length === 0) return null

  // Issue individual fine
  const handleIssueSingleFine = async (charge: LawEntry) => {
    let fineAmount = 0
    if (charge.fine && charge.fine !== '-') {
      fineAmount = parseInt(charge.fine.replace(/[^0-9]/g, ''), 10) || 0
    }

    try {
      const fine = await issueFine({
        provisionCode: charge.code,
        provisionTitle: charge.description,
        fineAmount,
        fineFormatted: charge.fine || `$${fineAmount.toLocaleString()}`,
        sourceDocument: charge.sourceDocument || 'Legislation',
        suspectName: includeSuspectName ? suspectName.trim() || undefined : undefined,
        passportNumber: passportNumber.trim() || undefined,
      })

      setIssuedFineCodes((prev) => ({ ...prev, [charge.code]: true }))
      showToast(`Fine issued for § ${charge.code} (${fine.fineFormatted})`, 'success')
    } catch (e: any) {
      showToast(e?.message || 'Failed to issue fine', 'error')
    }
  }

  // Open full Arrest Command Center
  const handleOpenCommandCenter = () => {
    const detention = startDetention({
      passportNumber: passportNumber.trim() || 'N/A',
      suspectName: includeSuspectName ? suspectName.trim() : undefined,
    })

    // Attach current charges
    charges.forEach((c) => {
      // Handled via startDetention
    })

    setIsArrestCommandCenterOpen(true)
    onClose()
  }

  const handleConfirmArrest = async () => {
    if (totals.unissuedFinesCount > 0) {
      showToast(`${totals.unissuedFinesCount} required fine(s) must be issued before final arrest`, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      await issueArrest({
        charges: charges.map((c) => ({
          code: c.code,
          title: c.description,
          fine: c.fine,
          fineStatus: issuedFineCodes[c.code] ? 'ISSUED' : 'NOT_APPLICABLE',
          sentence: c.sentence,
          stars: c.stars,
          bail: c.bail,
        })),
        suspectName: includeSuspectName ? suspectName.trim() || undefined : undefined,
        passportNumber: passportNumber.trim() || undefined,
        totalFineAmount: totals.totalFine,
        totalSentenceMonths: totals.totalSentenceMonths,
        stars: totals.maxStars !== '-' ? totals.maxStars : undefined,
        bailStatus: totals.bailStatus !== '-' ? totals.bailStatus : undefined,
      })

      showToast(`Arrest logged with ${charges.length} charge(s)`, 'success')
      onClearCharges()
      onClose()
    } catch (err) {
      console.error('Failed to log arrest:', err)
      showToast('Failed to log arrest record', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyWithFeedback = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard`, 'success')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-lg">🚨</span>
            <div>
              <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
                Log Custodial Arrest
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Organization: {currentOrganization} • Fine-First Workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCommandCenter}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold rounded flex items-center gap-1 shadow-sm"
              title="Expand to Full Tactical Workstation"
            >
              <span>⚡</span> Command Center
            </button>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Suspect Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant">
            <div>
              <label className="block text-xs font-mono font-semibold text-on-surface mb-1">
                Passport / Player ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>

            {includeSuspectName && (
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1">
                  Suspect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Warning Banner if Unissued Required Fines */}
          {totals.unissuedFinesCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2.5 text-amber-400 text-xs font-mono flex items-center gap-2">
              <span>⚠️</span>
              <span>
                <strong>{totals.unissuedFinesCount} required fine(s)</strong> must be issued before finalizing arrest.
              </span>
            </div>
          )}

          {/* Current Charges List with Fine-First Issuance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-on-surface uppercase tracking-wider">
                Current Charges ({charges.length})
              </span>
              <button
                onClick={() => copyWithFeedback(formatAllChargesText(charges as any), 'Charges')}
                className="text-primary hover:underline text-[11px]"
              >
                📋 Copy All Charges
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {charges.map((charge) => {
                const hasFine = charge.fine && charge.fine !== '-'
                const isFineIssued = !!issuedFineCodes[charge.code]

                return (
                  <div
                    key={charge.code}
                    className={`bg-surface-container-lowest border rounded p-2.5 flex items-center justify-between gap-3 text-xs font-mono ${
                      isFineIssued ? 'border-green-500/40 bg-green-950/10' : 'border-outline-variant'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-primary">§ {charge.code}</span>
                        {hasFine && (
                          <span className={isFineIssued ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>
                            ({charge.fine})
                          </span>
                        )}
                        {isFineIssued && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-1 py-0.2 rounded border border-green-500/30">
                            ISSUED ✓
                          </span>
                        )}
                      </div>
                      <p className="text-on-surface truncate text-[11px] font-sans mt-0.5">
                        {charge.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasFine && !isFineIssued && (
                        <button
                          onClick={() => handleIssueSingleFine(charge)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded transition-colors"
                        >
                          Issue Fine
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveCharge(charge.code)}
                        className="text-on-surface-variant hover:text-error p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subtotals */}
          <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant font-mono text-xs text-center">
            <div>
              <div className="text-[10px] uppercase text-on-surface-variant">Fines Issued</div>
              <div className="font-bold text-green-400 mt-0.5">
                {totals.issuedFinesCount} / {totals.requiredFinesCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-on-surface-variant">Total Sentence</div>
              <div className="font-bold text-blue-400 mt-0.5">
                {totals.totalSentenceMonths > 0 ? `${totals.totalSentenceMonths}m` : '-'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-on-surface-variant">Bail Status</div>
              <div className="font-bold text-purple-300 mt-0.5">{totals.bailStatus}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-outline-variant bg-surface-container-lowest font-mono">
          <button
            onClick={onClearCharges}
            className="text-xs text-on-surface-variant hover:text-error transition-colors"
          >
            Clear All
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmArrest}
              disabled={isSubmitting || totals.unissuedFinesCount > 0}
              className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm ${
                totals.unissuedFinesCount === 0
                  ? 'bg-secondary hover:bg-secondary-container text-on-secondary cursor-pointer'
                  : 'bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed border border-outline-variant'
              }`}
            >
              <span>🟢</span>
              <span>{isSubmitting ? 'Logging...' : 'Finalize Arrest'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
