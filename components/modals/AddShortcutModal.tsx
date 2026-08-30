'use client'

import React, { useState } from 'react'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

export default function AddShortcutModal() {
  const { isAddShortcutOpen, setIsAddShortcutOpen, addQuickAccessItem } = useProductivity()
  const { currentOrganization } = useDuty()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset')
  const [customTitle, setCustomTitle] = useState('')
  const [customType, setCustomType] = useState<'command' | 'page' | 'legislation' | 'procedure'>('command')
  const [customTarget, setCustomTarget] = useState('')
  const [customSnippet, setCustomSnippet] = useState('')

  if (!isAddShortcutOpen) return null

  const presets = [
    {
      title: `Save Bodycam (GrandPro — ${currentOrganization})`,
      type: 'command' as const,
      target: `/me saves bodycam to SD Card, ejects from GrandPro, inserts it into phone, uploads to ${currentOrganization} Cloud Servers.`,
      snippet: `/me saves bodycam to SD Card, uploads to ${currentOrganization}...`,
    },
    {
      title: 'Attaching Bodycam (Uniform)',
      type: 'command' as const,
      target: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof',
      snippet: '/me Takes out bodycam...',
    },
    {
      title: 'Attaching Bodycam (Undercover)',
      type: 'command' as const,
      target: '/me takes out bodycam and attaches it to belt, hides it, checks its ballistic and water proof',
      snippet: '/me takes out bodycam and attaches...',
    },
    {
      title: 'Refreshing Bodycam',
      type: 'command' as const,
      target: '/me refreshing bodycam\n/do It is recording.',
      snippet: '/me refreshing bodycam',
    },
    {
      title: 'Miranda Rights',
      type: 'command' as const,
      target: '/me reads Miranda Rights: You have the right to remain silent. Anything you say can and will be used against you in a court of law...',
      snippet: 'Miranda Warning Statement',
    },
    {
      title: 'Traffic Stop / Felonious Stop',
      type: 'procedure' as const,
      target: '/patrolman-guide',
      snippet: 'Traffic procedure quick link',
    },
    {
      title: 'Show Badge & ID',
      type: 'command' as const,
      target: '/me reaches into pocket, shows badge and official identification',
      snippet: '/me shows badge',
    },
    {
      title: 'Patrolman Law Guide',
      type: 'page' as const,
      target: '/patrolman-guide',
      snippet: 'Penal Code & Traffic Code',
    },
    {
      title: 'Shift & Evidence Reports',
      type: 'page' as const,
      target: '/reports',
      snippet: 'Report generator and duty logs',
    },
  ]

  const handleAddPreset = async (preset: typeof presets[0]) => {
    await addQuickAccessItem({
      title: preset.title,
      type: preset.type,
      target: preset.target,
      snippet: preset.snippet,
    })
    showToast(`Added "${preset.title}" to Quick Access`, 'success')
    setIsAddShortcutOpen(false)
  }

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim() || !customTarget.trim()) {
      showToast('Please provide a title and target for the shortcut', 'warning')
      return
    }

    await addQuickAccessItem({
      title: customTitle.trim(),
      type: customType,
      target: customTarget.trim(),
      snippet: customSnippet.trim() || customTarget.slice(0, 30),
    })

    showToast(`Added "${customTitle}" to Quick Access`, 'success')
    setCustomTitle('')
    setCustomTarget('')
    setCustomSnippet('')
    setIsAddShortcutOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-brightness-75 animate-fadeIn"
      onClick={() => setIsAddShortcutOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">📌</span>
            <h3 className="font-semibold text-base text-on-surface">Add to Quick Access</h3>
          </div>
          <button
            onClick={() => setIsAddShortcutOpen(false)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant bg-surface-container-lowest px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('preset')}
            className={`pb-2.5 px-3 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'preset'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Recommended Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 px-3 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Custom Shortcut
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {activeTab === 'preset' ? (
            <div className="flex flex-col gap-2">
              {presets.map((preset, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-surface-container border border-outline-variant rounded hover:border-primary transition-colors group"
                >
                  <div className="truncate pr-3">
                    <div className="font-medium text-sm text-on-surface group-hover:text-primary transition-colors">
                      {preset.title}
                    </div>
                    <div className="font-mono text-xs text-on-surface-variant truncate">
                      {preset.snippet}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddPreset(preset)}
                    className="px-2.5 py-1 text-xs font-mono bg-surface-container-high hover:bg-primary hover:text-on-primary border border-outline-variant rounded transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleAddCustom} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                  Shortcut Title
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 focus:outline-none focus:border-primary font-mono"
                  placeholder="e.g. Miranda Warning or 10-8 Patrol"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                  Type
                </label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as any)}
                  className="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 focus:outline-none focus:border-primary font-mono"
                >
                  <option value="command">Command (Copied to Clipboard)</option>
                  <option value="page">Page / Route (Navigates)</option>
                  <option value="legislation">Legislation Section</option>
                  <option value="procedure">Procedure Reference</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                  Target (Command text or URL path)
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 focus:outline-none focus:border-primary font-mono"
                  placeholder="e.g. /me flashes badge or /patrolman-guide"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                  Snippet / Description (Optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 focus:outline-none focus:border-primary font-mono text-xs"
                  placeholder="Short preview subtitle"
                  value={customSnippet}
                  onChange={(e) => setCustomSnippet(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddShortcutOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-semibold bg-primary hover:bg-primary-container text-on-primary rounded transition-colors"
                >
                  Save Shortcut
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
