'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDuty } from '@/contexts/DutyContext'

export default function DutyHeaderStatus() {
  const { isOnDuty, currentDutyStart, currentShiftArrests, currentShiftFines, currentShiftFinesAmount } = useDuty()
  const [elapsedString, setElapsedString] = useState('00:00:00')

  useEffect(() => {
    if (!isOnDuty || !currentDutyStart) {
      setElapsedString('00:00:00')
      return
    }

    const calculateElapsed = () => {
      const start = new Date(currentDutyStart).getTime()
      const now = new Date().getTime()
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000))

      const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0')
      const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0')
      const s = (diffSecs % 60).toString().padStart(2, '0')
      return `${h}:${m}:${s}`
    }

    setElapsedString(calculateElapsed())
    const interval = setInterval(() => {
      setElapsedString(calculateElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [isOnDuty, currentDutyStart])

  if (!isOnDuty) {
    return (
      <Link
        href="/reports"
        className="flex items-center gap-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant px-3 py-1.5 rounded transition-colors group"
        title="Click to go to Reports and start duty"
      >
        <span className="w-2 h-2 rounded-full bg-outline"></span>
        <span className="font-mono text-[10px] font-bold tracking-wider text-on-surface-variant group-hover:text-on-surface uppercase">
          OFF DUTY
        </span>
      </Link>
    )
  }

  return (
    <Link
      href="/reports"
      className="flex items-center gap-2.5 bg-surface-container-lowest hover:bg-surface-container border border-secondary/40 px-3 py-1.5 rounded transition-colors group"
      title="Active Shift - Click to manage duty"
    >
      <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.6)] animate-pulse"></span>
      <span className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
        ON DUTY
      </span>
      <span className="font-mono text-xs text-on-surface font-semibold pl-1 border-l border-outline-variant">
        {elapsedString}
      </span>
      {(currentShiftArrests > 0 || currentShiftFines > 0) && (
        <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant pl-1.5 border-l border-outline-variant">
          {currentShiftFinesAmount > 0 ? (
            <span className="text-secondary font-semibold">F: ${currentShiftFinesAmount.toLocaleString()} ({currentShiftFines})</span>
          ) : (
            <span>F: {currentShiftFines}</span>
          )}
          <span>A: {currentShiftArrests}</span>
        </span>
      )}
    </Link>
  )
}
