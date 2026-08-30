/**
 * Active Detention Banner for LEO-GRP
 * Persistent tactical header banner visible across the application whenever a suspect is in active detention.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

export default function ActiveDetentionBanner() {
  const { activeDetention, setIsArrestCommandCenterOpen, abandonDetention, includeSuspectName } = useDuty()
  const { showToast } = useToast()

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

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

  if (!activeDetention || activeDetention.status !== 'ACTIVE') return null

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const issuedFinesCount = activeDetention.charges.filter((c) => c.fineStatus === 'ISSUED').length
  const totalFinesCount = activeDetention.charges.filter((c) => c.fineAmount > 0).length
  const unissuedFinesCount = activeDetention.charges.filter((c) => c.fineStatus === 'NOT_ISSUED').length

  const handleAbandon = () => {
    if (confirm(`Are you sure you want to abandon active detention for Passport #${activeDetention.passportNumber}? Any issued fines remain recorded in your shift history.`)) {
      abandonDetention()
      showToast('Active detention discarded', 'info')
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-on-surface px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-inner animate-fadeIn sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded border border-amber-500/40 uppercase text-[11px] tracking-wider animate-pulse">
          <span>🚨</span>
          <span>ACTIVE DETENTION</span>
        </span>

        {includeSuspectName && activeDetention.suspectName && (
          <span className="text-on-surface font-semibold">
            Suspect: <span className="text-primary">{activeDetention.suspectName}</span>
          </span>
        )}

        <span className="text-on-surface-variant">
          Passport: <span className="text-on-surface font-bold">{activeDetention.passportNumber || 'N/A'}</span>
        </span>

        <span className="text-on-surface-variant">
          Org: <span className="text-secondary font-bold">{activeDetention.organization}</span>
        </span>

        <span className="text-on-surface-variant flex items-center gap-1">
          <span>⏱️</span>
          <span className="text-amber-400 font-bold">{formatTimer(elapsedSeconds)}</span>
        </span>

        <span className="text-on-surface-variant hidden sm:inline">
          Charges: <span className="text-on-surface font-bold">{activeDetention.charges.length}</span>
          {totalFinesCount > 0 && (
            <span className={unissuedFinesCount > 0 ? 'text-amber-400 font-bold ml-1' : 'text-green-400 font-bold ml-1'}>
              ({issuedFinesCount}/{totalFinesCount} Fines Issued)
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => setIsArrestCommandCenterOpen(true)}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[11px] rounded transition-colors flex items-center gap-1 shadow-sm"
        >
          <span>⚡</span>
          <span>Resume Workstation</span>
        </button>

        <button
          onClick={handleAbandon}
          title="Discard active detention"
          className="px-2 py-1 text-on-surface-variant hover:text-error text-[11px] transition-colors"
        >
          Abandon
        </button>
      </div>
    </div>
  )
}
