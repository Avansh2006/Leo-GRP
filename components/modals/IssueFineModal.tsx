/**
 * Issue Fine Modal for LEO-GRP
 * Clean, lightweight, keyboard-friendly fine issuance dialog directly attached to legislation provisions.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { LawEntry } from '@/utils/htmlParser'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

interface IssueFineModalProps {
  isOpen: boolean
  onClose: () => void
  entry: LawEntry | null
}

export default function IssueFineModal({ isOpen, onClose, entry }: IssueFineModalProps) {
  const { isOnDuty, currentOrganization, includeSuspectName, issueFine } = useDuty()
  const { showToast } = useToast()

  const [suspectName, setSuspectName] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [customFineAmount, setCustomFineAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Extract numeric fine from string (e.g. "$10,000" -> 10000)
  const parsedDefaultFine = React.useMemo(() => {
    if (!entry?.fine || entry.fine === '-') return 0
    const clean = entry.fine.replace(/[^0-9]/g, '')
    return parseInt(clean, 10) || 0
  }, [entry])

  useEffect(() => {
    if (isOpen) {
      setSuspectName('')
      setPassportNumber('')
      setCustomFineAmount(parsedDefaultFine > 0 ? parsedDefaultFine.toString() : '')
      setIsSubmitting(false)
    }
  }, [isOpen, parsedDefaultFine])

  if (!isOpen || !entry) return null

  const fineToCharge = parseInt(customFineAmount, 10) || parsedDefaultFine

  const handleConfirmIssue = async () => {
    if (fineToCharge <= 0) {
      showToast('Please specify a valid fine amount greater than $0', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await issueFine({
        provisionCode: entry.code,
        provisionTitle: entry.description,
        fineAmount: fineToCharge,
        fineFormatted: `$${fineToCharge.toLocaleString()}`,
        sourceDocument: entry.sourceDocument,
        suspectName: includeSuspectName ? suspectName : undefined,
        passportNumber: passportNumber.trim() || undefined,
      })

      showToast(`Fine of $${fineToCharge.toLocaleString()} issued (§ ${entry.code})`, 'success')
      onClose()
    } catch (err) {
      console.error('Failed to issue fine:', err)
      showToast('Failed to log fine record', 'error')
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
        className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-secondary text-base">💰</span>
            <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
              Issue Fine Citation
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
          {/* Organization & Duty status badge */}
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

          {/* Provision Summary Card */}
          <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/30">
                § {entry.code}
              </span>
              <span className="font-mono text-xs font-bold text-secondary">
                {entry.fine && entry.fine !== '-' ? entry.fine : `$${fineToCharge.toLocaleString()}`}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-on-surface leading-snug">
              {entry.description}
            </h4>
            {entry.remarks && entry.remarks !== '-' && (
              <p className="text-[11px] text-on-surface-variant bg-surface-container/60 p-2 rounded border border-outline-variant/40">
                {entry.remarks}
              </p>
            )}
          </div>

          {/* Fine Amount Override */}
          <div>
            <label className="block text-xs font-mono font-medium text-on-surface-variant mb-1">
              Fine Amount ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-on-surface-variant font-mono text-xs">$</span>
              <input
                type="number"
                value={customFineAmount}
                onChange={(e) => setCustomFineAmount(e.target.value)}
                placeholder="10000"
                className="w-full pl-7 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-mono text-xs focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
          </div>

          {/* Suspect Information */}
          <div className="space-y-3 pt-1 border-t border-outline-variant">
            <div className="text-[11px] font-mono uppercase text-on-surface-variant font-bold">
              Suspect Information <span className="text-[10px] lowercase text-on-surface-variant/70">(optional)</span>
            </div>

            {includeSuspectName && (
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  Suspect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-mono text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1">
                Passport / ID Number
              </label>
              <input
                type="text"
                placeholder="e.g. 123456"
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
            onClick={handleConfirmIssue}
            disabled={isSubmitting || fineToCharge <= 0}
            className="px-4 py-1.5 bg-secondary text-on-secondary font-mono text-xs font-bold rounded-lg hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span>⚡</span> Issue Fine (${fineToCharge.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  )
}
