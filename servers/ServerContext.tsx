'use client'

import React, { createContext, useContext } from 'react'
import { SERVER_PACKS, SERVER_COOKIE, isKnownServerId, setActiveServerId, DEFAULT_SERVER_ID } from './registry'
import type { ServerPack, ServerFeatures } from './types'

const ServerContext = createContext<ServerPack>(SERVER_PACKS[DEFAULT_SERVER_ID])

export function ServerProvider({ serverId, children }: { serverId: string; children: React.ReactNode }) {
  const id = isKnownServerId(serverId) ? serverId : DEFAULT_SERVER_ID
  // Keep the non-React registry in sync with what the server rendered.
  setActiveServerId(id)
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
  document.cookie = `${SERVER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`
  window.location.reload()
}

/** Whether the active server has this optional feature (missing = on). */
export function useFeature(feature: keyof ServerFeatures): boolean {
  return useServerPack().server.features?.[feature] !== false
}
