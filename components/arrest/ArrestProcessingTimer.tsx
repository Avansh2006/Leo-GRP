'use client'

import React, { useEffect, useState } from 'react'
import { calculateRemainingArrestTimerSeconds, formatTimerDisplay } from '@/contexts/DutyContext'
import { getArrestTimerSeconds, isFeatureEnabled } from '@/servers'
import { useT } from '@/i18n/I18nProvider'

/**
 * Isolated 25-Minute Processing Timer Component
 * Self-contained ticker that updates its own timer without causing the parent modal to re-render every second.
 */
export default function ArrestProcessingTimer({
  detention,
  onRequestLawyer,
  onResumeTimer,
}: {
  detention: any
  onRequestLawyer: () => void
  onResumeTimer: () => void
}) {
  const t = useT()
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    calculateRemainingArrestTimerSeconds(detention)
  )

  useEffect(() => {
    if (!detention) {
      setRemainingSec(getArrestTimerSeconds())
      return
    }

    const update = () => {
      setRemainingSec(calculateRemainingArrestTimerSeconds(detention))
    }

    update()
    if (detention.isTimerPaused) return

    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [
    detention?.id,
    detention?.timerStartedAt,
    detention?.startTime,
    detention?.isTimerPaused,
    detention?.timerRemainingAtPause,
    detention?.totalPausedDurationSeconds,
  ])

  if (!detention) return null

  const isPaused = detention.isTimerPaused
  const isLawyer = detention.lawyerRequested
  const isExpired = remainingSec === 0

  let colorClasses = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
  if (isExpired) {
    colorClasses = 'text-rose-400 border-rose-500/60 bg-rose-500/20'
  } else if (remainingSec <= 300) {
    colorClasses = 'text-rose-400 border-rose-500/40 bg-rose-500/10'
  } else if (remainingSec <= 600) {
    colorClasses = 'text-amber-400 border-amber-500/40 bg-amber-500/10'
  }

  return (
    <div className="flex items-center gap-2 font-mono">
      {/* Lawyer Button / State (if this server allows pausing for a lawyer) */}
      {!isFeatureEnabled('lawyerPause') && !isPaused ? null : isPaused ? (
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <span>⏸</span> {isLawyer ? t('arrest.lawyerRequested') : t('arrest.timerPaused')}
          </span>
          <button
            onClick={onResumeTimer}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
          >
            <span>▶</span> {t('arrest.resumeTimer')}
          </button>
        </div>
      ) : (
        <button
          onClick={onRequestLawyer}
          className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 rounded text-xs font-bold transition-colors flex items-center gap-1.5"
          title="Pause timer when suspect requests a lawyer"
        >
          <span>⚖</span> {t('arrest.askedLawyer')}
        </button>
      )}

      {/* Timer Countdown Badge */}
      <div
        className={`px-3 py-1 rounded border font-bold text-xs flex items-center gap-1.5 transition-colors ${colorClasses}`}
      >
        <span>⏱</span>
        <span>
          {isExpired ? (
            <span className="text-rose-400 font-bold">🔴 ARREST TIMER EXPIRED (00:00)</span>
          ) : (
            formatTimerDisplay(remainingSec)
          )}
        </span>
      </div>
    </div>
  )
}
