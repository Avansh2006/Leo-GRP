'use client'

import React, { useEffect, useState } from 'react'
import { SERVER_PACKS, useServerPack, switchServer, isBuiltInServerId, loadInstalledPacks } from '@/servers'
import AddServerModal from '@/components/modals/AddServerModal'
import { useT } from '@/i18n/I18nProvider'

/**
 * Lets the officer choose which RP server they play on.
 * Each server keeps its own profile, shifts and records, so switching reloads the app.
 */
export default function ServerPicker({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const pack = useServerPack()
  // Start with what the server rendered (built-ins + the active pack), then add packs installed in this browser
  const [packs, setPacks] = useState(() =>
    Object.values(SERVER_PACKS).filter((p) => isBuiltInServerId(p.server.id) || p.server.id === pack.server.id)
  )
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    loadInstalledPacks()
    setPacks(Object.values(SERVER_PACKS))
  }, [addOpen])

  const handleChange = (id: string) => {
    if (id === '__add') {
      setAddOpen(true)
      return
    }
    if (id === pack.server.id) return
    const target = SERVER_PACKS[id]
    const ok = window.confirm(
      t('server.switchConfirm', { target: target.server.name, current: pack.server.name })
    )
    if (ok) switchServer(id)
  }

  return (
    <div>
      {!compact && (
        <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
          {t('server.label')}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={pack.server.id}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={t('server.label')}
          className="flex-1 min-w-0 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans focus:outline-none focus:border-primary cursor-pointer transition-colors"
        >
          {packs.map((p) => (
            <option key={p.server.id} value={p.server.id} className="bg-surface-container text-on-surface">
              {p.server.name}
              {p.source === 'installed' ? ` (${t('server.installed')})` : ''}
            </option>
          ))}
          <option value="__add" className="bg-surface-container text-on-surface">
            ➕ {t('server.addOption')}
          </option>
        </select>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-3 rounded-lg border border-outline-variant text-xs font-mono text-on-surface hover:bg-surface-container-high flex-shrink-0"
          title={t('server.addHint')}
        >
          ➕ {t('server.add')}
        </button>
      </div>
      {pack.server.description && (
        <p className="text-[11px] text-on-surface-variant/80 mt-1 font-mono">{pack.server.description}</p>
      )}
      <AddServerModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
