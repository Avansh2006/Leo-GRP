'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useToast } from '@/components/ToastProvider'
import { PinnedItem } from '@/utils/db'

export default function PinnedPanel() {
  const router = useRouter()
  const { showToast } = useToast()
  const { pinnedItems, unpinItem, notes, setActiveNote, setUtilityTab } = useProductivity()

  const handleItemClick = (item: PinnedItem) => {
    if (item.type === 'note') {
      const note = notes.find((n) => n.id === item.targetId)
      if (note) {
        setActiveNote(note)
        setUtilityTab('notes')
      }
    } else if (item.type === 'command') {
      const commandText = item.data?.text || item.targetId
      navigator.clipboard.writeText(commandText)
      showToast(`Copied command: ${item.title}`, 'success')
    } else if (item.type === 'legislation' || item.type === 'procedure') {
      router.push('/patrolman-guide')
    } else if (item.type === 'page') {
      router.push(item.targetId)
    } else {
      router.push('/reports')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'command':
        return '⚡'
      case 'legislation':
        return '⚖️'
      case 'note':
        return '📝'
      case 'procedure':
        return '📋'
      case 'page':
        return '🔗'
      default:
        return '📌'
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-low text-on-surface">
      {/* Top Header */}
      <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
        <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          PINNED RESOURCES ({pinnedItems.length})
        </span>
      </div>

      {/* Pinned List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {pinnedItems.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl text-on-surface-variant">📌</span>
            <div className="font-semibold text-sm text-on-surface">Nothing pinned yet</div>
            <p className="text-xs text-on-surface-variant max-w-[200px]">
              Pin frequently used commands, legislation sections, or notes for instant access.
            </p>
          </div>
        ) : (
          pinnedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="p-2.5 border border-outline-variant rounded bg-surface-dim hover:border-primary hover:bg-surface-container transition-all cursor-pointer group flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2.5 truncate">
                <span className="text-sm mt-0.5 flex-shrink-0">{getTypeIcon(item.type)}</span>
                <div className="truncate">
                  <div className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="font-mono text-[11px] text-on-surface-variant truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  )}
                  <span className="inline-block mt-1 text-[9px] font-mono uppercase text-on-surface-variant px-1.5 py-0.2 bg-surface-container rounded">
                    {item.type}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  unpinItem(item.type, item.targetId)
                  showToast(`Unpinned ${item.title}`, 'info')
                }}
                className="text-on-surface-variant hover:text-error p-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Unpin"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
