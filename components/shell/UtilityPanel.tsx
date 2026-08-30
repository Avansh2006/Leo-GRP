'use client'

import React from 'react'
import { useProductivity } from '@/contexts/ProductivityContext'
import NotesPanel from './utility/NotesPanel'
import PinnedPanel from './utility/PinnedPanel'
import RecentPanel from './utility/RecentPanel'

export default function UtilityPanel() {
  const {
    utilityTab,
    setUtilityTab,
    isRightPanelOpen,
    setIsRightPanelOpen,
    notes,
    pinnedItems,
    recentItems,
  } = useProductivity()

  if (!isRightPanelOpen) {
    return (
      <button
        onClick={() => setIsRightPanelOpen(true)}
        className="fixed right-0 top-20 z-30 bg-surface-container-high hover:bg-surface-variant text-on-surface border-l border-t border-b border-outline-variant p-2 rounded-l shadow-md transition-all group hidden lg:flex flex-col items-center gap-2"
        title="Expand Utility Panel"
      >
        <svg className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 text-on-surface-variant">
          PANEL
        </span>
      </button>
    )
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-none"
        onClick={() => setIsRightPanelOpen(false)}
      />

      {/* Main Panel Container */}
      <aside
        className={`fixed lg:static top-0 right-0 h-full w-80 flex-shrink-0 z-40 bg-surface-container-lowest border-l border-outline-variant flex flex-col transition-transform duration-200 ease-in-out ${
          isRightPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Panel Header & Tabs */}
        <div className="h-16 px-3 border-b border-outline-variant flex items-center justify-between bg-background">
          {/* Tab buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setUtilityTab('notes')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors relative ${
                utilityTab === 'notes'
                  ? 'bg-surface-container-high text-primary border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              NOTES
              {notes.length > 0 && (
                <span className="ml-1 px-1 py-0.2 text-[9px] bg-surface-variant text-on-surface rounded-full">
                  {notes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setUtilityTab('pinned')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors relative ${
                utilityTab === 'pinned'
                  ? 'bg-surface-container-high text-primary border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              PINNED
              {pinnedItems.length > 0 && (
                <span className="ml-1 px-1 py-0.2 text-[9px] bg-surface-variant text-on-surface rounded-full">
                  {pinnedItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setUtilityTab('recent')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors relative ${
                utilityTab === 'recent'
                  ? 'bg-surface-container-high text-primary border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              RECENT
            </button>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsRightPanelOpen(false)}
            className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors"
            title="Collapse Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-hidden">
          {utilityTab === 'notes' && <NotesPanel />}
          {utilityTab === 'pinned' && <PinnedPanel />}
          {utilityTab === 'recent' && <RecentPanel />}
        </div>
      </aside>
    </>
  )
}
