/**
 * Active Detention Banner for LEO-GRP
 * Persistent tactical header banner visible across the application whenever a suspect is in active detention.
 * Displays 25-minute arrest countdown, lawyer status, active charges, and quick resume workstation button.
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  useDuty,
  calculateRemainingArrestTimerSeconds,
  formatTimerDisplay,
} from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

export default function ActiveDetentionBanner() {
  const { activeDetention, setIsArrestCommandCenterOpen, abandonDetention, includeSuspectName } = useDuty()
  const { showToast } = useToast()

  const [remainingSec, setRemainingSec] = useState<number>(() =>
    calculateRemainingArrestTimerSeconds(activeDetention)
  )

  useEffect(() => {
    if (!activeDetention) {
      setRemainingSec(1500)
      return
    }

    const update = () => {
      setRemainingSec(calculateRemainingArrestTimerSeconds(activeDetention))
    }

    update()
    if (activeDetention.isTimerPaused) return

    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [
    activeDetention?.id,
    activeDetention?.timerStartedAt,
    activeDetention?.startTime,
    activeDetention?.isTimerPaused,
    activeDetention?.timerRemainingAtPause,
    activeDetention?.totalPausedDurationSeconds,
  ])

  if (!activeDetention || activeDetention.status !== 'ACTIVE') return null

  const issuedFinesCount = activeDetention.charges.filter((c) => c.fineStatus === 'ISSUED').length
  const totalFinesCount = activeDetention.charges.filter((c) => c.fineAmount > 0).length
  const unissuedFinesCount = activeDetention.charges.filter((c) => c.fineStatus === 'NOT_ISSUED').length

  const handleAbandon = () => {
    if (
      confirm(
        `Are you sure you want to abandon active detention for Passport #${activeDetention.passportNumber}? Any issued fines remain recorded in your shift history.`
      )
    ) {
      abandonDetention()
      showToast('Active detention discarded', 'info')
    }
  }

  const isPaused = activeDetention.isTimerPaused
  const isLawyer = activeDetention.lawyerRequested
  const isExpired = remainingSec === 0

  let timerColor = 'text-emerald-400'
  if (isExpired) {
    timerColor = 'text-rose-500 font-bold'
  } else if (remainingSec <= 300) {
    timerColor = 'text-rose-400 font-bold'
  } else if (remainingSec <= 600) {
    timerColor = 'text-amber-400 font-bold'
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

        {/* 25-Min Timer / Lawyer Status */}
        {isPaused ? (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded border border-amber-500/40 text-[11px] flex items-center gap-1">
            <span>⏸</span> {isLawyer ? 'LAWYER PAUSED' : 'TIMER PAUSED'} ({formatTimerDisplay(remainingSec)})
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span>⏱️</span>
            <span className={timerColor}>
              {isExpired ? 'EXPIRED' : `${formatTimerDisplay(remainingSec)} remaining`}
            </span>
          </span>
        )}

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
