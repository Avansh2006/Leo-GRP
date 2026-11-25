'use client'

import React from 'react'
import { SERVER_PACKS, useServerPack, switchServer } from '@/servers'

/**
 * Lets the officer choose which RP server they play on.
 * Each server keeps its own profile, shifts and records, so switching reloads the app.
 */
export default function ServerPicker({ compact = false }: { compact?: boolean }) {
  const pack = useServerPack()
  const packs = Object.values(SERVER_PACKS)

  const handleChange = (id: string) => {
    if (id === pack.server.id) return
    const target = SERVER_PACKS[id]
    const ok = window.confirm(
      `Switch to ${target.server.name}?\n\nEach server keeps its own profile, shifts, arrests and notes. ` +
        `Your ${pack.server.name} data stays saved and comes back when you switch back.`
    )
    if (ok) switchServer(id)
  }

  return (
    <div>
      {!compact && (
        <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
          RP Server
        </label>
      )}
      <select
        value={pack.server.id}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="RP Server"
        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans focus:outline-none focus:border-primary cursor-pointer transition-colors"
      >
        {packs.map((p) => (
          <option key={p.server.id} value={p.server.id} className="bg-surface-container text-on-surface">
            {p.server.name}
          </option>
        ))}
      </select>
      {pack.server.description && (
        <p className="text-[11px] text-on-surface-variant/80 mt-1 font-mono">{pack.server.description}</p>
      )}
    </div>
  )
}
