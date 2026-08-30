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

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['saving_grandpro', 'attaching'])

  const organizations = ['LSPD', 'BCSO', 'SAHP', 'FIB', 'GOV', 'NG', 'EMS']

  const handleOrgChange = (newOrg: string) => {
    setCurrentOrganization(newOrg)
    showToast(`Active organization set to ${newOrg}`, 'success')
  }

  // General Commands categories using active organization
  const categories: Category[] = useMemo(() => [
    {
      id: 'saving_grandpro',
      name: '🔴 SAVING BODYCAM — GRANDPRO',
      icon: '🔴',
      commands: [
        {
          text: `/me saves bodycam to SD Card, ejects from GrandPro, inserts it into phone, uploads to ${currentOrganization} Cloud Servers.`
        },
        {
          text: '/do insert new SD card into GrandPro and it is recording'
        },
        {
          text: `/do put SD Card into phone, connects to ${currentOrganization} Cloud Servers, downloads Bodycam on SD Card`
        }
      ]
    },
    {
      id: 'attaching',
      name: '📹 Attaching Bodycam',
      icon: '📹',
      commands: [
        {
          label: `ATTACHING BODYCAM (Uniform) - Must be done: in offices, next to NPCs at HQ, locker rooms, armory, or next to ${currentOrganization} vehicle. Re-attach after Bad Dream, Code A, Change of Clothes, or every 4 hours.`,
          text: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof'
        },
        { text: '/me makes sure it is recording and checks for the red light' },
        { text: '/do It is recording, is ballistic and water proof' },
        {
          label: `ATTACHING BODYCAM UNDERCOVER - Must be done: in offices, next to NPCs at HQ, locker rooms, armory, or next to ${currentOrganization} vehicle. Re-attach after Bad Dream, Code A, Change of Clothes, or every 4 hours.`,
          text: '/me takes out bodycam and attaches it to belt, hides it, checks its ballistic and water proof'
        },
        { text: '/me makes sure it is recording and checks for the red light' },
        { text: '/do It is recording, is ballistic and water proof.' },
        { 
          label: 'Optional:',
          text: '/me puts the ID in the car / on desk / in the closet' 
        },
      ]
    },
    {
      id: 'refreshing',
      name: '🔄 Refreshing Bodycam',
      icon: '🔄',
      commands: [
        { 
          label: 'REFRESHING BODYCAM - POV must start before refreshing bodycam, so refresh can be visible in POV. Exception: Refresh not required if POV starts with attaching bodycam.',
          text: '/me refreshing bodycam' 
        },
        { text: '/do It is recording.' },
      ]
    },
    {
      id: 'saving',
      name: '💾 Saving a Situation',
      icon: '💾',
      commands: [
        {
          label: `SAVING A SITUATION - Bodycam needs to be uploaded to the ${currentOrganization} cloud to be valid.`,
          text: `/me saves bodycam, uploads it to the ${currentOrganization} Cloud and continues recording`
        },
        { text: '/do It is recording.' },
      ]
    },
    {
      id: 'unconscious',
      name: '🏥 After Getting Patched Up',
      icon: '🏥',
      commands: [
        {
          label: 'IF YOU WERE UNCONSCIOUS AND GOT PATCHED UP - Must ensure bodycam is still recording after you get patched up.',
          text: '/me checks that the bodycam is still recording'
        },
        { text: '/do It is recording.' },
      ]
    },
    {
      id: 'pda',
      name: '📱 PDA Commands',
      icon: '📱',
      commands: [
        {
          label: `CONNECT PDA - PDA needs to be connected to the nearest ${currentOrganization} cell tower to look up information.`,
          text: `/me connects PDA to the nearest ${currentOrganization} cell tower`
        },
      ]
    },
    {
      id: 'drone',
      name: '🚁 Drone Commands',
      icon: '🚁',
      commands: [
        {
          label: `WHILE ON DUTY - If in duty clothes, launch the ${currentOrganization} drone.`,
          text: `/me launches ${currentOrganization} drone`
        },
        {
          label: `WHILE UNDERCOVER - Take drone from ${currentOrganization} car (or lockers) and put in backpack. Cannot launch 2 drones in a row unless you picked it up off the ground.`,
          text: `/me takes the ${currentOrganization} drone from the trunk and puts it in the backpack`
        },
        { 
          label: 'Later:',
          text: `/me takes the ${currentOrganization} drone from the backpack and launches it` 
        },
        { 
          label: 'After situation recorded:',
          text: `/me takes the ${currentOrganization} drone from the ground and puts it in the backpack` 
        },
      ]
    },
    {
      id: 'vehicle',
      name: '🚗 Checking Vehicle Owner',
      icon: '🚗',
      commands: [
        {
          label: 'LEARN THE OWNER OF A VEHICLE WITHOUT A LICENSE PLATE',
          text: '/me feels the edges of the vehicle for VIN and checks for ownership'
        },
        {
          label: 'OR',
          text: '/me looks up the VIN in the database for license plate and owner information'
        },
      ]
    },
    {
      id: 'searching',
      name: '🔍 Searching the Trunk',
      icon: '🔍',
      commands: [
        {
          label: 'ℹ️ All bodycam commands must be done outside of vehicle, with clothes visible and without holding weapons or PDA! Commands can be modified as long as they are realistic, fit the situation and comply with RP rules.',
          text: '/me breaks the trunk of vehicle with crowbar'
        },
      ]
    },
    {
      id: 'lawyer',
      name: '⚖️ Handing SSD to Lawyer',
      icon: '⚖️',
      commands: [
        {
          label: 'Option 1:',
          text: `/do saves bodycam onto an SSD Card and uploads into PDA to ${currentOrganization} Cloud servers and continues recording`
        },
        { text: '/me downloads bodycam onto USB stick using PDA and then hands over USB stick to Attorney' },
        {
          label: 'OR Option 2:',
          text: '/me Takes SSD out of the Bodycam'
        },
        { text: '/me Hands over bodycam SSD to the lawyer' },
      ]
    },
    {
      id: 'contracts',
      name: `📝 ${currentOrganization} Employment & Code of Conduct`,
      icon: '📝',
      commands: [
        {
          label: `${currentOrganization} CONTRACTS:`,
          text: `/me Signs the ${currentOrganization} Employment Contract on the desk`
        },
        { text: `/me Signs the ${currentOrganization} Code of Conduct` },
      ]
    },
    {
      id: 'cuffing',
      name: '🔗 Cuffing Person Under a Car',
      icon: '🔗',
      commands: [
        {
          label: 'CUFFING PERSON UNDER A CAR:',
          text: '/try reaches under the car and cuffs the person underneath it'
        },
      ]
    },
    {
      id: 'jumpsuit',
      name: '👔 Jumpsuit Commands',
      icon: '👔',
      commands: [
        { text: '/me grabs the detainee by left arm' },
        { text: '/me takes a universal size jumpsuit from behind the counter.' },
        { text: '/me grabs the detainee by right arm' },
        { text: '/me drops the jumpsuit on the bed' },
      ]
    },
  ], [currentOrganization])

  // Department Radio Messages dynamically generated for the active organization
  const departmentMessages: Category[] = useMemo(() => {
    const list: Category[] = [
      {
        id: 'doj',
        name: '⚖️ DOJ Related',
        icon: '⚖️',
        commands: [
          { text: `${currentOrganization} to DOJ: How copy?` },
          { text: `${currentOrganization} to DOJ: Good copy, send traffic!` },
          { text: `${currentOrganization} to DOJ: Bad copy!` },
          { text: `${currentOrganization} to DOJ: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to DOJ: We have a 10-15 at DOC requesting a lawyer, Are there any available?` },
          { text: `${currentOrganization} to DOJ: 10-4, much appreciated!` },
        ]
      }
    ]

    if (currentOrganization !== 'LSPD') {
      list.push({
        id: 'lspd',
        name: '👮‍♂️ LSPD Related',
        icon: '👮‍♂️',
        commands: [
          { text: `${currentOrganization} to LSPD: How copy?` },
          { text: `${currentOrganization} to LSPD: Good copy, send traffic!` },
          { text: `${currentOrganization} to LSPD: Bad copy!` },
          { text: `${currentOrganization} to LSPD: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to LSPD: Can we have a quick meeting at your HQ?` },
          { text: `${currentOrganization} to LSPD: Requesting permission to land at your helipad.` },
          { text: `${currentOrganization} to LSPD: We are entering your jurisdiction in chase of a car hijacker, help would be appreciated.` },
          { text: `${currentOrganization} to LSPD: We have one of your units in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to LSPD: We're currently enroute!` },
          { text: `${currentOrganization} to LSPD: 10-4, much appreciated!` },
          { text: `${currentOrganization} to LSPD: Permission Granted!` },
        ]
      })
    }

    if (currentOrganization !== 'BCSO') {
      list.push({
        id: 'bcso',
        name: '🤠 BCSO Related',
        icon: '🤠',
        commands: [
          { text: `${currentOrganization} to BCSO: How copy?` },
          { text: `${currentOrganization} to BCSO: Good copy, send traffic!` },
          { text: `${currentOrganization} to BCSO: Bad copy!` },
          { text: `${currentOrganization} to BCSO: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to BCSO: Can we have a quick meeting at Sandy Shores station?` },
          { text: `${currentOrganization} to BCSO: Requesting permission to land at your helipad.` },
          { text: `${currentOrganization} to BCSO: We have one of your deputies in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to BCSO: Deputies enroute!` },
          { text: `${currentOrganization} to BCSO: 10-4, much appreciated!` },
          { text: `${currentOrganization} to BCSO: Permission Granted!` },
        ]
      })
    }

    if (currentOrganization !== 'SAHP') {
      list.push({
        id: 'sahp',
        name: '🚓 SAHP Related',
        icon: '🚓',
        commands: [
          { text: `${currentOrganization} to SAHP: Good copy, send traffic!` },
          { text: `${currentOrganization} to SAHP: Bad copy!` },
          { text: `${currentOrganization} to SAHP: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to SAHP: Can we have a quick meeting at your hall?` },
          { text: `${currentOrganization} to SAHP: Requesting permission to land at your helipad.` },
          { text: `${currentOrganization} to SAHP: We have one of your agents in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to SAHP: We're currently enroute!` },
          { text: `${currentOrganization} to SAHP: Troopers enroute!` },
          { text: `${currentOrganization} to SAHP: 10-4, much appreciated!` },
          { text: `${currentOrganization} to SAHP: Permission Granted!` },
        ]
      })
    }

    if (currentOrganization !== 'FIB') {
      list.push({
        id: 'fib',
        name: '🕵️ FIB Related',
        icon: '🕵️',
        commands: [
          { text: `${currentOrganization} to FIB: How copy?` },
          { text: `${currentOrganization} to FIB: Good copy, send traffic!` },
          { text: `${currentOrganization} to FIB: Bad copy!` },
          { text: `${currentOrganization} to FIB: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to FIB: Can we have a quick meeting at your HQ?` },
          { text: `${currentOrganization} to FIB: Requesting permission to land at your roof helipad.` },
          { text: `${currentOrganization} to FIB: We have one of your agents in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to FIB: Agents enroute!` },
          { text: `${currentOrganization} to FIB: 10-4, much appreciated!` },
          { text: `${currentOrganization} to FIB: Permission Granted!` },
        ]
      })
    }

    if (currentOrganization !== 'GOV') {
      list.push({
        id: 'gov',
        name: '🚔 Government Related',
        icon: '🚔',
        commands: [
          { text: `${currentOrganization} to GOV: How copy?` },
          { text: `${currentOrganization} to GOV: Good copy, send traffic!` },
          { text: `${currentOrganization} to GOV: Bad copy!` },
          { text: `${currentOrganization} to GOV: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to GOV: Agents enroute!` },
          { text: `${currentOrganization} to GOV: Can we have a quick meeting at capitol?` },
          { text: `${currentOrganization} to GOV: Requesting permission to land on your lawn.` },
          { text: `${currentOrganization} to GOV: We have one of your units in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to GOV: 10-4, much appreciated!` },
        ]
      })
    }

    if (currentOrganization !== 'NG') {
      list.push({
        id: 'ng',
        name: '🎖️ National Guard Related',
        icon: '🎖️',
        commands: [
          { text: `${currentOrganization} to NG: How copy?` },
          { text: `${currentOrganization} to NG: Good copy, send traffic!` },
          { text: `${currentOrganization} to NG: Bad copy!` },
          { text: `${currentOrganization} to NG: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to NG: Can we have a quick meeting at your main barracks?` },
          { text: `${currentOrganization} to NG: Requesting permission to land at your main barracks.` },
          { text: `${currentOrganization} to NG: We have one of your soldiers in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to NG: We're currently enroute!` },
          { text: `${currentOrganization} to NG: 10-4, much appreciated!` },
          { text: `${currentOrganization} to NG: Permission Granted!` },
        ]
      })
    }

    if (currentOrganization !== 'EMS') {
      list.push({
        id: 'ems',
        name: '👨‍⚕️ EMS Related',
        icon: '👨‍⚕️',
        commands: [
          { text: `${currentOrganization} to EMS: How copy?` },
          { text: `${currentOrganization} to EMS: Good copy, send traffic!` },
          { text: `${currentOrganization} to EMS: Bad copy!` },
          { text: `${currentOrganization} to EMS: Bad copy, we're currently in a situation!` },
          { text: `${currentOrganization} to EMS: Ghetto is off limits for the next 25 minutes, please inform all your units.` },
          { text: `${currentOrganization} to EMS: Can we have a quick meeting at Pillbox Hospital?` },
          { text: `${currentOrganization} to EMS: Requesting permission to land at your helipad.` },
          { text: `${currentOrganization} to EMS: We have one of your employees in custody, could you 10-17 to DOC?` },
          { text: `${currentOrganization} to EMS: We're currently enroute!` },
          { text: `${currentOrganization} to EMS: Clean!` },
          { text: `${currentOrganization} to EMS: 10-4, much appreciated!` },
          { text: `${currentOrganization} to EMS: Permission Granted!` },
        ]
      })
    }

    // Global broadcasts
    list.push({
      id: 'global',
      name: '🚨 Global Broadcasts',
      icon: '🚨',
      commands: [
        { text: `${currentOrganization} to GLOBAL: What's the situation?` },
        { text: `${currentOrganization} to ALL: Global is for Regroupping for latest Store Robbery. Please Dispatch Max units` },
        { text: `${currentOrganization} to ALL: Global is for heavy 10-10s, send all available units!` },
        { text: `${currentOrganization} to ALL: Federals is getting robbed at global, send all available units!` },
        { text: `${currentOrganization} to ALL: Global is for a hood watch, send all available units!` },
        { text: `${currentOrganization} to ALL: Global is for a checkpoint, everyone is invited!` },
        { text: `${currentOrganization} to ALL: Be on standby for a possible hostage situation!` },
        { text: `${currentOrganization} to ALL: The Global is 10-99.` },
      ]
    })

    return list
  }, [currentOrganization])

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
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-3 flex items-center justify-between bg-surface-container-low hover:bg-surface-container transition-colors"
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
