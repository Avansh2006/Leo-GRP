/**
 * Shift Summary & Report Modal for LEO-GRP
 * Displays clean operational end-of-shift report with structured fines, arrests, totals, and plain-text clipboard copy.
 */

'use client'

import React from 'react'
import { ShiftRecord } from '@/utils/db'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

interface ShiftSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  shift: ShiftRecord | null
}

export default function ShiftSummaryModal({ isOpen, onClose, shift }: ShiftSummaryModalProps) {
  const { includeSuspectName, formatShiftReportText } = useDuty()
  const { showToast } = useToast()

  if (!isOpen || !shift) return null

  const handleCopyReport = () => {
    const text = formatShiftReportText(shift)
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('Shift report copied to clipboard!', 'success')
      })
      .catch((err) => {
        console.error('Failed to copy shift report:', err)
        showToast('Failed to copy to clipboard', 'error')
      })
  }

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-secondary text-lg">🏁</span>
            <div>
              <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
                End of Shift Report
              </h3>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Organization: <strong className="text-secondary">{shift.organization || 'LSPD'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 bg-primary text-on-primary font-mono text-xs font-semibold rounded-lg hover:bg-primary-container flex items-center gap-1.5 transition-colors shadow-sm"
              title="Copy plain-text report"
            >
              <span>📋</span> Copy Shift Report
            </button>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Shift Time Badge */}
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-on-surface-variant">Shift Window: </span>
              <strong className="text-on-surface">
                {formatTime(shift.onDutyTime)} → {shift.offDutyTime ? formatTime(shift.offDutyTime) : 'Ongoing'}
              </strong>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-bold border border-outline-variant">
                {shift.totalFinesCount} Fine(s) • {shift.totalArrestsCount} Arrest(s)
              </span>
            </div>
          </div>

          {/* FINES ISSUED SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span>💰</span> FINES ISSUED ({shift.fines.length})
              </h4>
              <span className="font-bold text-secondary">
                Total: ${shift.totalFinesAmount.toLocaleString()}
              </span>
            </div>

            {shift.fines.length === 0 ? (
              <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant/40 text-on-surface-variant text-center">
                No fines issued during this shift.
              </div>
            ) : (
              <div className="space-y-2.5">
                {shift.fines.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant space-y-1"
                  >
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="font-bold text-primary">#{idx + 1} Fine: {f.fineFormatted || `$${f.fineAmount.toLocaleString()}`}</span>
                      {f.passportNumber && (
                        <span className="text-on-surface-variant">Passport No: {f.passportNumber}</span>
                      )}
                    </div>
                    {includeSuspectName && f.suspectName && (
                      <div className="text-on-surface-variant">
                        Name: <strong className="text-on-surface">{f.suspectName}</strong>
                      </div>
                    )}
                    <div className="text-on-surface leading-snug">
                      Charge: <strong className="text-primary">§ {f.provisionCode}</strong> — {f.provisionTitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ARRESTS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🔒</span> ARRESTS ({shift.arrests.length})
              </h4>
              <span className="font-bold text-amber-300">
                Total Arrests: {shift.totalArrestsCount}
              </span>
            </div>

            {shift.arrests.length === 0 ? (
              <div className="p-3 bg-surface-container-lowest rounded border border-outline-variant/40 text-on-surface-variant text-center">
                No arrests logged during this shift.
              </div>
            ) : (
              <div className="space-y-3">
                {shift.arrests.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">#{idx + 1} Custodial Arrest</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {a.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-on-surface-variant">
                      {a.passportNumber && <div>Passport No: <strong className="text-on-surface">{a.passportNumber}</strong></div>}
                      {includeSuspectName && a.suspectName && <div>Name: <strong className="text-on-surface">{a.suspectName}</strong></div>}
                      {a.totalSentenceMonths > 0 && <div>Sentence: <strong className="text-amber-300">{a.totalSentenceMonths} months</strong></div>}
                      {a.totalFineAmount > 0 && <div>Fine: <strong className="text-secondary">${a.totalFineAmount.toLocaleString()}</strong></div>}
                      {a.stars && <div>Wanted: <strong className="text-red-400">{a.stars}</strong></div>}
                      {a.bailStatus && <div>Bail: <strong className="text-purple-300">{a.bailStatus}</strong></div>}
                    </div>

                    <div className="pt-1 border-t border-outline-variant/40">
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                        Charges Applied ({a.charges.length}):
                      </div>
                      <ul className="space-y-0.5 text-on-surface">
                        {a.charges.map((c, cIdx) => (
                          <li key={cIdx} className="truncate">
                            • <span className="text-primary font-bold">§ {c.code}</span> — {c.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-surface-container-lowest border-t border-outline-variant flex-shrink-0">
          <span className="text-[11px] font-mono text-on-surface-variant">
            {includeSuspectName ? '👤 Suspect name logging ON' : '🛡️ Suspect name logging OFF (Privacy)'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-4 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant rounded-lg font-mono text-xs transition-colors"
            >
              Copy Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-on-primary font-mono text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
