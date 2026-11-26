/** Pure duty helpers and small shared types (no React). */
import type { ActiveDetention } from '@/utils/db'
import { getArrestTimerSeconds } from '@/servers'

// Shift timestamps are stored as real UTC instants; report templates format them in the
// server's time zone (servers/<id>/server.json → rules.timeZone).
export const getShiftTimestamp = () => new Date().toISOString()

export interface WeaponStatus {
  name: string
  status: 'returned' | 'lost' | 'broken' | 'used'
}

export interface EventCounter {
  name: string
  count: number
}

export const calculateRemainingArrestTimerSeconds = (detention?: ActiveDetention | null): number => {
  if (!detention) return getArrestTimerSeconds()
  const total = detention.timerTotalSeconds || getArrestTimerSeconds()
  if (detention.isTimerPaused && typeof detention.timerRemainingAtPause === 'number') {
    return Math.max(0, detention.timerRemainingAtPause)
  }
  const started = new Date(detention.timerStartedAt || detention.startTime).getTime()
  const now = Date.now()
  const elapsedRaw = Math.floor((now - started) / 1000)
  const pausedAccum = detention.totalPausedDurationSeconds || 0
  const effectiveElapsed = Math.max(0, elapsedRaw - pausedAccum)
  return Math.max(0, total - effectiveElapsed)
}

export const formatTimerDisplay = (totalSec: number): string => {
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
