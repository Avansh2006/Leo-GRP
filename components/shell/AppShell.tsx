'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import UtilityPanel from './UtilityPanel'
import CommandPaletteModal from '@/components/modals/CommandPaletteModal'
import AddShortcutModal from '@/components/modals/AddShortcutModal'
import DataBackupModal from '@/components/modals/DataBackupModal'
import LegislationAssistantModal from '@/components/modals/LegislationAssistantModal'
import { useProductivity } from '@/contexts/ProductivityContext'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const {
    isBackupModalOpen,
    setIsBackupModalOpen,
    isAssistantOpen,
    setIsAssistantOpen,
    assistantInitialQuery,
  } = useProductivity()

  return (
    <div className="flex h-screen w-full bg-background text-on-surface overflow-hidden font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Column (Header + Workspace) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        {/* Top Header */}
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

        {/* Content Workspace + Right Utility Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Main Page Workspace */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
            {children}
          </main>

          {/* Collapsible Right Utility Panel */}
          <UtilityPanel />
        </div>
      </div>

      {/* Global Modals */}
      <CommandPaletteModal />
      <AddShortcutModal />
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
      <LegislationAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialQuery={assistantInitialQuery}
      />
    </div>
  )
}
