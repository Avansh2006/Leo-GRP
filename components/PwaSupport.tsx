'use client'

import React, { useEffect, useState } from 'react'

/** The browser's install prompt event (Chromium). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Registers the offline service worker (production only, so development never serves stale
 * code) and shows an "Install app" button when the browser offers installation.
 */
export default function PwaSupport({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!installEvent) return null

  return (
    <button
      onClick={async () => {
        await installEvent.prompt()
        await installEvent.userChoice
        setInstallEvent(null)
      }}
      className={
        compact
          ? 'w-full text-center text-sm p-1 rounded hover:bg-surface-container-high transition-colors'
          : 'w-full px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded text-xs font-mono text-on-surface flex items-center gap-2'
      }
      title="Install as an app (works offline)"
    >
      <span>⬇</span>
      {!compact && <span>Install app (works offline)</span>}
    </button>
  )
}
