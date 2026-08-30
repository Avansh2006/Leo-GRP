'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useToast } from '@/components/ToastProvider'
import { RecentItem } from '@/utils/db'

export default function RecentPanel() {
  const router = useRouter()
  const { showToast } = useToast()
  const { recentItems, clearAllRecentItems, notes, setActiveNote, setUtilityTab } = useProductivity()

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return `${diffDays}d ago`
    } catch {
      return ''
    }
  }

  const handleItemClick = (item: RecentItem) => {
    if (item.type === 'command') {
      navigator.clipboard.writeText(item.targetId)
      showToast(`Copied: ${item.title}`, 'success')
    } else if (item.type === 'note') {
      const note = notes.find((n) => n.id === item.targetId)
      if (note) {
        setActiveNote(note)
        setUtilityTab('notes')
      }
    } else if (item.url) {
      router.push(item.url)
    } else if (item.type === 'page') {
      router.push(item.targetId)
    } else if (item.type === 'legislation' || item.type === 'procedure') {
      router.push('/patrolman-guide')
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
        return '🕒'
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-low text-on-surface">
      {/* Top Header */}
      <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
        <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          RECENT ACTIVITY ({recentItems.length})
        </span>
        {recentItems.length > 0 && (
          <button
            onClick={clearAllRecentItems}
            className="text-[10px] font-mono text-on-surface-variant hover:text-error transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Recent List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {recentItems.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl text-on-surface-variant">🕒</span>
            <div className="font-semibold text-sm text-on-surface">No recent items</div>
            <p className="text-xs text-on-surface-variant max-w-[200px]">
              Actions such as copying commands, checking legislation, and opening reports will appear here.
            </p>
          </div>
        ) : (
          recentItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="p-2 border border-outline-variant rounded bg-surface-dim hover:border-primary hover:bg-surface-container transition-all cursor-pointer group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-sm flex-shrink-0">{getTypeIcon(item.type)}</span>
                <div className="truncate">
                  <div className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="font-mono text-[10px] text-on-surface-variant truncate">
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[10px] font-mono text-on-surface-variant flex-shrink-0">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
