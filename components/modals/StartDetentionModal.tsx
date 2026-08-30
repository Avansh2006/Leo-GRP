/**
 * Start Detention Modal for LEO-GRP
 * Fast, lightweight initiation dialog for taking a subject into active custody/detention.
 */

'use client'

import React, { useState } from 'react'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

interface StartDetentionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StartDetentionModal({ isOpen, onClose }: StartDetentionModalProps) {
  const { startDetention, includeSuspectName, currentOrganization } = useDuty()
  const { showToast } = useToast()

  const [passportNumber, setPassportNumber] = useState('')
  const [suspectName, setSuspectName] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passportNumber.trim()) {
      showToast('Please enter a Passport / Player ID', 'error')
      return
    }

    startDetention({
      passportNumber: passportNumber.trim(),
      suspectName: includeSuspectName ? suspectName.trim() : undefined,
      notes: notes.trim() || undefined,
    })

    showToast(`Active detention started for Passport #${passportNumber.trim()}`, 'success')
    setPassportNumber('')
    setSuspectName('')
    setNotes('')
    onClose()
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
            <span className="text-amber-500 text-lg">🚨</span>
            <div>
              <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
                Detain Person
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Initiate active custody & fine-first workflow ({currentOrganization})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
              Passport / Player ID <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. 123456"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
            />
          </div>

          {includeSuspectName && (
            <div>
              <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
                Suspect Name <span className="text-[10px] text-on-surface-variant lowercase">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={suspectName}
                onChange={(e) => setSuspectName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
              Initial Notes / Incident Context <span className="text-[10px] text-on-surface-variant lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Pulled over on Vinewood Blvd for reckless driving..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded p-3 text-[11px] font-mono text-on-surface-variant space-y-1">
            <div className="flex items-center gap-1.5 text-secondary font-bold">
              <span>ℹ️</span>
              <span>Fine-First Rule</span>
            </div>
            <p>
              Charges added to detention do not automatically issue fines. You will explicitly issue fines and verify checklist before finalizing arrest.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>🚨</span>
              <span>Start Active Detention</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
