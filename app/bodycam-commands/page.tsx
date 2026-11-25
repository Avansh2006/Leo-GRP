/**
 * Bodycam & RP Commands Reference for LEO-GRP
 * Fully organization-aware: Synchronized with the global active organization single source of truth.
 * Supports GrandPro saving, uniform & undercover attachment, PDA/drone ops, and multi-agency department radio traffic.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useDuty } from '@/contexts/DutyContext'
import { useSequence } from '@/contexts/SequenceContext'
import { useServerPack, resolveCommandCategories, resolveRadioChannels } from '@/servers'

interface Command {
  text: string
  label?: string
}

interface Category {
  id: string
  name: string
  icon: string
  commands: Command[]
}

export default function BodycamCommandsPage() {
  const { showToast } = useToast()
  const { currentOrganization, setCurrentOrganization } = useDuty()
  const { recordRecentItem, pinItem, unpinItem, isItemPinned } = useProductivity()
  const pack = useServerPack()
  const { startSequence } = useSequence()
  const organizations = pack.departments.map((d) => d.id)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() =>
    pack.commands.categories.filter((c) => c.expanded).map((c) => c.id)
  )

  const handleOrgChange = (newOrg: string) => {
    setCurrentOrganization(newOrg)
    showToast(`Active organization set to ${newOrg}`, 'success')
  }

  // Commands and radio channels come from the active server pack, filled in for the active organization
  const categories: Category[] = useMemo(
    () =>
      resolveCommandCategories(pack, currentOrganization)
        .filter((c) => c.showOnPage !== false)
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          commands: c.commands.map((cmd) => ({ text: cmd.text, label: cmd.label })),
        })),
    [pack, currentOrganization]
  )

  const departmentMessages: Category[] = useMemo(
    () =>
      resolveRadioChannels(pack, currentOrganization).map((ch) => ({
        id: ch.id,
        name: ch.name,
        icon: ch.icon,
        commands: ch.messages.map((m) => ({ text: m.text, label: m.label })),
      })),
    [pack, currentOrganization]
  )

  useEffect(() => {
    recordRecentItem({
      type: 'page',
      targetId: '/bodycam-commands',
      title: `${currentOrganization} Bodycam Commands`,
      subtitle: 'Roleplay Macros & Dispatch',
      url: '/bodycam-commands',
    })
  }, [currentOrganization, recordRecentItem])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCopy = (text: string, label?: string) => {
    navigator.clipboard.writeText(text)
    recordRecentItem({
      type: 'command',
      targetId: text,
      title: label || text.slice(0, 35),
      subtitle: text,
    })
    showToast('Command copied to clipboard!', 'success')
  }

  const handleTogglePin = (command: Command, categoryName: string) => {
    const isPinned = isItemPinned('command', command.text)
    if (isPinned) {
      unpinItem('command', command.text)
      showToast('Unpinned command', 'info')
    } else {
      pinItem({
        type: 'command',
        targetId: command.text,
        title: command.label ? command.label.split('-')[0].trim() : command.text.slice(0, 30),
        subtitle: `${currentOrganization} • ${categoryName}`,
        data: { text: command.text, org: currentOrganization },
      })
      showToast('Pinned command to utility panel', 'success')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Single Source of Truth Organization Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{currentOrganization} Bodycam Commands</h1>
            <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 font-mono text-xs font-bold rounded">
              {currentOrganization} ACTIVE
            </span>
          </div>
          <p className="text-on-surface-variant text-sm mt-1">
            Standard Operating Procedure roleplay commands dynamically formatted for {currentOrganization}
          </p>
        </div>
        
        {/* Organization Selector */}
        <div className="flex flex-col items-end gap-1">
          <label className="text-xs font-mono uppercase text-on-surface-variant font-bold">Active Organization:</label>
          <select
            value={currentOrganization}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded px-3 py-1.5 text-on-surface text-xs font-mono font-bold focus:outline-none focus:border-primary shadow-sm"
          >
            {organizations.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* General Commands */}
      <div>
        <h2 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2 font-mono">
          <span>📋 General SOP & Bodycam Commands</span>
        </h2>
        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card overflow-hidden border border-outline-variant rounded-lg">
                <div className="flex items-stretch bg-surface-container-low">
                {category.commands.length > 1 && (
                  <button
                    onClick={() => {
                      startSequence({ title: category.name, steps: category.commands.map((c) => c.text) })
                      showToast('Step 1 copied. Press N for the next line.', 'success')
                    }}
                    className="px-3 text-[11px] font-mono font-bold text-primary hover:bg-primary/10 border-r border-outline-variant/60 flex-shrink-0"
                    title="Copy these commands one at a time"
                  >
                    ▶ Step through
                  </button>
                )}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex-1 px-5 py-3 flex items-center justify-between hover:bg-surface-container transition-colors"
                >
                  <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 font-mono">
                    <span>{category.name}</span>
                  </h3>
                  <svg
                    className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 space-y-2.5 bg-surface-container-lowest border-t border-outline-variant/60">
                    {category.commands.map((command, idx) => {
                      const isPinned = isItemPinned('command', command.text)
                      return (
                        <div key={idx} className="space-y-1">
                          {command.label && (
                            <p className="text-[11px] font-semibold text-primary font-mono">{command.label}</p>
                          )}
                          <div className="flex items-start gap-2 bg-surface-dim border border-outline-variant/60 p-2.5 rounded hover:border-outline transition-colors group">
                            <code className="flex-1 text-on-surface text-xs font-mono break-words leading-relaxed select-text">
                              {command.text}
                            </code>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleTogglePin(command, category.name)}
                                className={`p-1 rounded transition-colors text-xs ${
                                  isPinned
                                    ? 'text-primary bg-primary/10'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                }`}
                                title={isPinned ? 'Unpin Command' : 'Pin to Utility Panel'}
                              >
                                📌
                              </button>
                              <button
                                onClick={() => handleCopy(command.text, command.label)}
                                className="px-2 py-1 text-xs font-mono font-bold bg-primary hover:bg-primary-container text-on-primary rounded transition-colors flex items-center gap-1 shadow-sm"
                                title="Copy Command"
                              >
                                <span>📋</span> Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Department Messages */}
      <div>
        <h2 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2 font-mono">
          <span>📩 Inter-Department Radio Communications</span>
        </h2>
        <div className="space-y-3">
          {departmentMessages.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card overflow-hidden border border-outline-variant rounded-lg">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-3 flex items-center justify-between bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <h3 className="text-sm font-semibold text-on-surface font-mono">
                    {category.name}
                  </h3>
                  <svg
                    className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 space-y-2 bg-surface-container-lowest border-t border-outline-variant/60">
                    {category.commands.map((command, idx) => {
                      const isPinned = isItemPinned('command', command.text)
                      return (
                        <div key={idx} className="flex items-start gap-2 bg-surface-dim border border-outline-variant/60 p-2.5 rounded hover:border-outline transition-colors group">
                          <code className="flex-1 text-on-surface text-xs font-mono break-words leading-relaxed select-text">
                            {command.text}
                          </code>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleTogglePin(command, category.name)}
                              className={`p-1 rounded transition-colors text-xs ${
                                isPinned
                                  ? 'text-primary bg-primary/10'
                                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                              }`}
                              title={isPinned ? 'Unpin Command' : 'Pin to Utility Panel'}
                            >
                              📌
                            </button>
                            <button
                              onClick={() => handleCopy(command.text)}
                              className="px-2 py-1 text-xs font-mono font-bold bg-primary hover:bg-primary-container text-on-primary rounded transition-colors flex items-center gap-1 shadow-sm"
                              title="Copy Command"
                            >
                              <span>📋</span> Copy
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
