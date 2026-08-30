/**
 * Issue Arrest Modal for LEO-GRP
 * Structured, multi-charge custodial arrest issuance dialog with calculations for fine, sentence, wanted stars, and bail.
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
  const { isOnDuty, currentOrganization, includeSuspectName, issueArrest } = useDuty()
  const { showToast } = useToast()

  const [suspectName, setSuspectName] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate totals from selected charges
  const totals = useMemo(() => {
    let totalFine = 0
    let totalSentenceMonths = 0
    let maxStars = ''
    let hasNoBail = false
    let hasBail = false

    charges.forEach((c) => {
      // Fine
      if (c.fine && c.fine !== '-') {
        const num = parseInt(c.fine.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) totalFine += num
      }

      // Sentence e.g. "30 months (Class D)" -> 30
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

    return {
      totalFine,
      totalSentenceMonths,
      maxStars: maxStars || '-',
      bailStatus,
    }
  }, [charges])

  useEffect(() => {
    if (isOpen) {
      setSuspectName('')
      setPassportNumber('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen || charges.length === 0) return null

  const handleConfirmArrest = async () => {
    setIsSubmitting(true)
    try {
      await issueArrest({
        charges: charges.map((c) => ({
          code: c.code,
          title: c.description,
          fine: c.fine,
          sentence: c.sentence,
          stars: c.stars,
          bail: c.bail,
        })),
        suspectName: includeSuspectName ? suspectName : undefined,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-primary text-base">📑</span>
            <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
              Log Custodial Arrest
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Duty & Org Badges */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant">
              Org: <strong className="text-on-surface">{currentOrganization}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                isOnDuty
                  ? 'bg-secondary/10 text-secondary border-secondary/30'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant'
              }`}
            >
              {isOnDuty ? '● Active Duty Shift' : '○ Off Duty'}
            </span>
          </div>

          {/* Charges List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-on-surface">
              <span>Attached Charges ({charges.length})</span>
            </div>
            <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant max-h-40 overflow-y-auto divide-y divide-outline-variant/40 space-y-1">
              {charges.map((c) => (
                <div key={c.code} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="pr-2 truncate">
                    <span className="font-mono font-bold text-primary mr-1.5">§ {c.code}</span>
                    <span className="text-on-surface">{c.description}</span>
                  </div>
                  <button
                    onClick={() => onRemoveCharge(c.code)}
                    className="text-error hover:text-rose-400 font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    title="Remove charge"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Calculated Totals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 bg-surface-container rounded-lg border border-outline-variant text-center">
              <div className="text-[10px] text-on-surface-variant uppercase">Total Fine</div>
              <div className="font-bold text-secondary mt-0.5">
                ${totals.totalFine.toLocaleString()}
              </div>
            </div>
            <div className="p-2 bg-surface-container rounded-lg border border-outline-variant text-center">
              <div className="text-[10px] text-on-surface-variant uppercase">Sentence</div>
              <div className="font-bold text-amber-300 mt-0.5">
                {totals.totalSentenceMonths > 0 ? `${totals.totalSentenceMonths} mos` : '-'}
              </div>
            </div>
            <div className="p-2 bg-surface-container rounded-lg border border-outline-variant text-center">
              <div className="text-[10px] text-on-surface-variant uppercase">Wanted</div>
              <div className="font-bold text-red-400 mt-0.5">{totals.maxStars}</div>
            </div>
            <div className="p-2 bg-surface-container rounded-lg border border-outline-variant text-center">
              <div className="text-[10px] text-on-surface-variant uppercase">Bail</div>
              <div
                className={`font-bold mt-0.5 ${
                  totals.bailStatus === 'NO BAIL' ? 'text-rose-400' : 'text-purple-300'
                }`}
              >
                {totals.bailStatus}
              </div>
            </div>
          </div>

          {/* Suspect Information */}
          <div className="space-y-3 pt-2 border-t border-outline-variant">
            <div className="text-[11px] font-mono uppercase text-on-surface-variant font-bold">
              Suspect Identification <span className="text-[10px] lowercase text-on-surface-variant/70">(optional)</span>
            </div>

            {includeSuspectName && (
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  Suspect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-mono text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                Passport / Citizen ID
              </label>
              <input
                type="text"
                placeholder="e.g. 654321"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-mono text-xs focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-surface-container-lowest border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmArrest}
            disabled={isSubmitting || charges.length === 0}
            className="px-4 py-1.5 bg-primary text-on-primary font-mono text-xs font-bold rounded-lg hover:bg-primary-container active:scale-98 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span>🔒</span> Confirm & Log Arrest
          </button>
        </div>
      </div>
    </div>
  )
}
