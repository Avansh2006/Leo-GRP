'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  SERVER_PACKS,
  SERVER_COOKIE,
  isKnownServerId,
  isBuiltInServerId,
  setActiveServerId,
  DEFAULT_SERVER_ID,
} from './registry'
import { loadInstalledPacks } from './installed'
import type { ServerPack, ServerFeatures } from './types'

const ServerContext = createContext<ServerPack>(SERVER_PACKS[DEFAULT_SERVER_ID])

function setServerCookie(id: string) {
  document.cookie = `${SERVER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`
}

/**
 * Provides the active server pack.
 * Built-in packs render immediately (also on the server). A pack installed in this browser is
 * unknown to the server, so the app waits one tick on the client to load it from storage.
 */
export function ServerProvider({ serverId, children }: { serverId: string; children: React.ReactNode }) {
  const builtIn = isBuiltInServerId(serverId)
  const [status, setStatus] = useState<'ready' | 'loading' | 'missing'>(builtIn ? 'ready' : 'loading')

  if (builtIn) setActiveServerId(serverId) // keep non-React code in sync with what the server rendered

  useEffect(() => {
    if (builtIn) return
    loadInstalledPacks()
    if (isKnownServerId(serverId)) {
      setActiveServerId(serverId)
      setStatus('ready')
    } else {
      setStatus('missing')
    }
  }, [builtIn, serverId])

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface-variant font-mono text-sm">
        Loading server pack…
      </div>
    )
  }
  if (status === 'missing') {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-3 text-center font-mono text-sm text-on-surface">
          <p className="text-lg font-bold">Server pack not found</p>
          <p className="text-on-surface-variant">
            The server &quot;{serverId}&quot; was installed from a pack file, but it isn&apos;t in this browser anymore (browser data may
            have been cleared). Install it again, or continue with the default server.
          </p>
          <button
            onClick={() => {
              setServerCookie(DEFAULT_SERVER_ID)
              window.location.reload()
            }}
            className="px-4 py-2 rounded bg-primary text-on-primary font-bold"
          >
            Continue with {SERVER_PACKS[DEFAULT_SERVER_ID].server.name}
          </button>
        </div>
      </div>
    )
  }

  const id = isKnownServerId(serverId) ? serverId : DEFAULT_SERVER_ID
  return <ServerContext.Provider value={SERVER_PACKS[id]}>{children}</ServerContext.Provider>
}

/** The active server pack, for use while rendering. */
export function useServerPack(): ServerPack {
  return useContext(ServerContext)
}

/**
 * Switch to another server. Each server has its own profile, shifts, notes and records,
 * so the page reloads to start cleanly on the chosen server's data.
 */
export function switchServer(id: string) {
  if (!isKnownServerId(id)) return
  setServerCookie(id)
  window.location.reload()
}

/** Whether the active server has this optional feature (missing = on). */
export function useFeature(feature: keyof ServerFeatures): boolean {
  return useServerPack().server.features?.[feature] !== false
}
