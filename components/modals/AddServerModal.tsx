'use client'

/**
 * Add a server without a new app release:
 *  - install from the community directory (public/community/directory.json)
 *  - install a pack file a server admin shared
 *  - export the current server as a pack file (to share or edit)
 */

import React, { useEffect, useState } from 'react'
import {
  useServerPack,
  switchServer,
  listInstalledBundles,
  installPackBundle,
  removeInstalledPack,
  packToBundle,
  getActiveServerId,
  PackBundle,
} from '@/servers'
import { useToast } from '@/components/ToastProvider'
import { loadAllLawData } from '@/utils/htmlParser'

interface DirectoryEntry {
  id: string
  name: string
  description?: string
  file: string
  language?: string
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function AddServerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pack = useServerPack()
  const { showToast } = useToast()
  const [directory, setDirectory] = useState<DirectoryEntry[] | null>(null)
  const [installed, setInstalled] = useState<PackBundle[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setInstalled(listInstalledBundles())
    setProblems([])
    fetch('/community/directory.json')
      .then((r) => (r.ok ? r.json() : { servers: [] }))
      .then((d) => setDirectory(Array.isArray(d.servers) ? d.servers : []))
      .catch(() => setDirectory([]))
  }, [isOpen])

  if (!isOpen) return null

  const afterInstall = (res: ReturnType<typeof installPackBundle>, name: string) => {
    if (res.errors.length) {
      setProblems(res.errors)
      showToast(`Could not install ${name}`, 'error')
      return
    }
    setProblems(res.warnings.map((w) => `Warning: ${w}`))
    setInstalled(listInstalledBundles())
    showToast(`${name} installed. Pick it in the RP Server list.`, 'success')
  }

  const installFromDirectory = async (entry: DirectoryEntry) => {
    setBusyId(entry.id)
    try {
      const bundle = await (await fetch(`/community/${encodeURIComponent(entry.file)}`)).json()
      afterInstall(installPackBundle(bundle), entry.name)
    } catch {
      showToast(`Could not download ${entry.name}`, 'error')
    } finally {
      setBusyId('')
    }
  }

  const installFromFile = async (file: File | undefined) => {
    if (!file) return
    try {
      afterInstall(installPackBundle(JSON.parse(await file.text())), file.name)
    } catch {
      setProblems(['This file is not valid JSON.'])
    }
  }

  const exportCurrent = async () => {
    const laws = pack.source === 'installed' ? pack.laws : (await loadAllLawData()).allEntries
    download(`${pack.server.id}.pack.json`, JSON.stringify(packToBundle(pack, laws)))
    showToast('Pack file downloaded', 'success')
  }

  const installedIds = new Set(installed.map((b) => b.server.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a server"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container border border-outline-variant rounded-xl p-5 space-y-5 font-mono text-xs text-on-surface"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add a server</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
            ✕
          </button>
        </div>

        {problems.length > 0 && (
          <ul className="p-3 rounded border border-amber-500/40 bg-amber-500/10 space-y-1 max-h-40 overflow-y-auto">
            {problems.map((p, i) => (
              <li key={i} className="text-amber-300">
                {p}
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-2">
          <h3 className="font-bold text-on-surface-variant uppercase text-[11px]">Community servers</h3>
          {directory === null && <p className="text-on-surface-variant">Loading…</p>}
          {directory?.length === 0 && (
            <p className="text-on-surface-variant">
              No community servers yet. Server admins can add theirs; see CONTRIBUTING.md in the project.
            </p>
          )}
          {directory?.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded border border-outline-variant bg-surface-container-lowest">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{entry.name}</div>
                {entry.description && <div className="text-on-surface-variant truncate">{entry.description}</div>}
              </div>
              {installedIds.has(entry.id) ? (
                <span className="text-secondary">Installed</span>
              ) : (
                <button
                  disabled={busyId === entry.id}
                  onClick={() => installFromDirectory(entry)}
                  className="px-3 py-1 rounded bg-primary text-on-primary font-bold disabled:opacity-60"
                >
                  {busyId === entry.id ? 'Installing…' : 'Install'}
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-on-surface-variant uppercase text-[11px]">Install a pack file</h3>
          <p className="text-on-surface-variant">If your server staff shared a <code>.pack.json</code> file, install it here. It stays in this browser.</p>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-outline-variant cursor-pointer hover:bg-surface-container-high">
            📂 Choose pack file
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                installFromFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </section>

        {installed.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-bold text-on-surface-variant uppercase text-[11px]">Installed in this browser</h3>
            {installed.map((b) => (
              <div key={b.server.id} className="flex items-center gap-3 p-2.5 rounded border border-outline-variant bg-surface-container-lowest">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{b.server.name}</div>
                  <div className="text-on-surface-variant">{(b.laws || []).length} laws</div>
                </div>
                <button
                  onClick={() => switchServer(b.server.id)}
                  disabled={getActiveServerId() === b.server.id}
                  className="px-3 py-1 rounded border border-outline-variant disabled:opacity-50"
                >
                  {getActiveServerId() === b.server.id ? 'Active' : 'Switch to it'}
                </button>
                <button
                  disabled={getActiveServerId() === b.server.id}
                  onClick={() => {
                    if (!window.confirm(`Remove ${b.server.name} from this browser? Your records on it stay saved and come back if you install it again.`)) return
                    removeInstalledPack(b.server.id)
                    setInstalled(listInstalledBundles())
                  }}
                  className="text-on-surface-variant hover:text-error disabled:opacity-40"
                  title={getActiveServerId() === b.server.id ? 'Switch to another server first' : 'Remove'}
                >
                  Remove
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2 border-t border-outline-variant pt-4">
          <h3 className="font-bold text-on-surface-variant uppercase text-[11px]">Share or edit this server</h3>
          <p className="text-on-surface-variant">
            Download {pack.server.name} as a single pack file (commands, rules, report templates and laws). Edit it and share it with
            your department, or send it to the project to be listed for everyone.
          </p>
          <button onClick={exportCurrent} className="px-3 py-1.5 rounded border border-outline-variant hover:bg-surface-container-high">
            ⬇ Download {pack.server.id}.pack.json
          </button>
        </section>
      </div>
    </div>
  )
}
