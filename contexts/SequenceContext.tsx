'use client'

/**
 * Step-through command sequences.
 *
 * Officers alt-tab between the game and this app. A sequence copies one command at a time:
 * start it, paste in game, alt-tab back and press N / → / Enter (or click Next) to copy the
 * next line. The bar stays visible across pages until the sequence ends.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface Sequence {
  title: string
  steps: string[]
}

interface SequenceState extends Sequence {
  index: number
}

interface SequenceContextValue {
  sequence: SequenceState | null
  startSequence: (seq: Sequence) => void
  next: () => void
  prev: () => void
  stop: () => void
}

const SequenceContext = createContext<SequenceContextValue | null>(null)
const STORAGE_KEY = 'leogrp_active_sequence'

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

export function SequenceProvider({ children }: { children: React.ReactNode }) {
  const [sequence, setSequence] = useState<SequenceState | null>(null)

  // Survive page navigation/reloads within the tab
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) setSequence(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      if (sequence) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sequence))
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [sequence])

  const startSequence = useCallback((seq: Sequence) => {
    const steps = seq.steps.filter((s) => s.trim())
    if (steps.length === 0) return
    copy(steps[0])
    setSequence({ title: seq.title, steps, index: 0 })
  }, [])

  const go = useCallback((delta: number) => {
    setSequence((cur) => {
      if (!cur) return cur
      const index = cur.index + delta
      if (index >= cur.steps.length) return null // finished
      if (index < 0) return cur
      copy(cur.steps[index])
      return { ...cur, index }
    })
  }, [])

  const next = useCallback(() => go(1), [go])
  const prev = useCallback(() => go(-1), [go])
  const stop = useCallback(() => setSequence(null), [])

  // Keyboard: N / → / Enter = next, P / ← = previous, Esc = stop (ignored while typing)
  useEffect(() => {
    if (!sequence) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'n' || k === 'arrowright' || k === 'enter') {
        e.preventDefault()
        next()
      } else if (k === 'p' || k === 'arrowleft') {
        e.preventDefault()
        prev()
      } else if (k === 'escape') {
        stop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sequence, next, prev, stop])

  return (
    <SequenceContext.Provider value={{ sequence, startSequence, next, prev, stop }}>
      {children}
    </SequenceContext.Provider>
  )
}

export function useSequence(): SequenceContextValue {
  const ctx = useContext(SequenceContext)
  if (!ctx) throw new Error('useSequence must be used inside SequenceProvider')
  return ctx
}
