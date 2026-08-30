'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useProductivity } from '@/contexts/ProductivityContext'

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
  const [selectedOrg, setSelectedOrg] = useState('LSPD')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['saving_grandpro', 'attaching'])

  const organizations = ['LSPD', 'SAHP', 'FIB', 'GOV', 'NG', 'EMS']

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrg = localStorage.getItem('leogrp_selected_org')
      if (savedOrg && organizations.includes(savedOrg)) {
        setSelectedOrg(savedOrg)
      }
    }
  }, [])

  const handleOrgChange = (newOrg: string) => {
    setSelectedOrg(newOrg)
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_selected_org', newOrg)
    }
  }

  const categories: Category[] = [
    {
      id: 'saving_grandpro',
      name: '🔴 SAVING BODYCAM — GRANDPRO',
      icon: '🔴',
      commands: [
        {
          text: `/me saves bodycam to SD Card, ejects from GrandPro, inserts it into phone, uploads to ${selectedOrg} Cloud Servers.`
        },
        {
          text: '/do insert new SD card into GrandPro and it is recording'
        },
        {
          text: `/do put SD Card into phone, connects to ${selectedOrg} Cloud Servers, downloads Bodycam on SD Card`
        }
      ]
    },
    {
      id: 'attaching',
      name: '📹 Attaching Bodycam',
      icon: '📹',
      commands: [
        {
          label: 'ATTACHING BODYCAM (Uniform) - Must be done: in offices, next to NPCs at HQ, locker rooms, armory, or next to FIB car. Re-attach after Bad Dream, Code A, Change of Clothes, or every 4 hours.',
          text: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof'
        },
        { text: '/me makes sure it is recording and checks for the red light' },
        { text: '/do It is recording, is ballistic and water proof' },
        {
          label: 'ATTACHING BODYCAM UNDERCOVER - Must be done: in offices, next to NPCs at HQ, locker rooms, armory, or next to FIB car. Re-attach after Bad Dream, Code A, Change of Clothes, or every 4 hours.',
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
          label: 'SAVING A SITUATION - Bodycam needs to be uploaded to the FIB cloud to be valid.',
          text: `/me saves bodycam, uploads it to the ${selectedOrg} Cloud and continues recording`
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
          label: 'CONNECT PDA - PDA needs to be connected to the nearest cell tower to look up information.',
          text: `/me connects PDA to the nearest ${selectedOrg} cell tower`
        },
      ]
    },
    {
      id: 'drone',
      name: '🚁 Drone Commands',
      icon: '🚁',
      commands: [
        {
          label: 'WHILE ON DUTY - If in duty clothes, launch the FIB drone.',
          text: `/me launches ${selectedOrg} drone`
        },
        {
          label: 'WHILE UNDERCOVER - Take drone from FIB car (or lockers) and put in backpack. Cannot launch 2 drones in a row unless you picked it up off the ground.',
          text: `/me takes the ${selectedOrg} drone from the trunk and puts it in the backpack`
        },
        { 
          label: 'Later:',
          text: `/me takes the ${selectedOrg} drone from the backpack and launches it` 
        },
        { 
          label: 'After situation recorded:',
          text: `/me takes the ${selectedOrg} drone from the ground and puts it in the backpack` 
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
          text: `/do saves bodycam onto an SSD Card and uploads into PDA to ${selectedOrg} Cloud servers and continues recording`
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
      name: '📝 FIB Contracts',
      icon: '📝',
      commands: [
        {
          label: 'FIB CONTRACTS:',
          text: `/me Signs the ${selectedOrg} Employment Contract on the desk`
        },
        { text: `/me Signs the ${selectedOrg} Code of Conduct` },
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
  ]

  const departmentMessages: Category[] = [
    {
      id: 'doj',
      name: '⚖️ DOJ Related',
      icon: '⚖️',
      commands: [
        { text: `${selectedOrg} to DOJ: How copy?` },
        { text: `${selectedOrg} to DOJ: Good copy, send traffic!` },
        { text: `${selectedOrg} to DOJ: Bad copy!` },
        { text: `${selectedOrg} to DOJ: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to DOJ: We have a 10-15 at DOC requesting a lawyer, Are there any available?` },
        { text: `${selectedOrg} to DOJ: 10-4, much appreciated!` },
      ]
    },
    {
      id: 'lspd',
      name: '👮‍♂️👮‍♀️ LSPD Related',
      icon: '👮‍♂️',
      commands: [
        { text: `${selectedOrg} to LSPD: How copy?` },
        { text: `${selectedOrg} to LSPD: Good copy, send traffic!` },
        { text: `${selectedOrg} to LSPD: Bad copy!` },
        { text: `${selectedOrg} to LSPD: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to LSPD: Can we have a quick meeting at your HQ?` },
        { text: `${selectedOrg} to LSPD: Requesting permission to land at your helipad.` },
        { text: `${selectedOrg} to LSPD: We are entering your jurisdiction in chase of a car hijacker, help would be appreciated.` },
        { text: `${selectedOrg} to LSPD: We have one of your units in custody, could you 10-17 to DOC?` },
        { text: `${selectedOrg} to LSPD: We're currently enroute!` },
        { text: `${selectedOrg} to LSPD: 10-4, much appreciated!` },
        { text: `${selectedOrg} to LSPD: Permission Granted!` },
      ]
    },
    {
      id: 'sahp',
      name: '🚓 SAHP Related',
      icon: '🚓',
      commands: [
        { text: `${selectedOrg} to SAHP: Good copy, send traffic!` },
        { text: `${selectedOrg} to SAHP: Bad copy!` },
        { text: `${selectedOrg} to SAHP: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to SAHP: Can we have a quick meeting at your hall?` },
        { text: `${selectedOrg} to SAHP: Requesting permission to land at your helipad.` },
        { text: `${selectedOrg} to SAHP: We have one of your agents in custody, could you 10-17 to DOC?` },
        { text: `${selectedOrg} to SAHP: We're currently enroute!` },
        { text: `${selectedOrg} to SAHP: Troopers enroute!` },
        { text: `${selectedOrg} to SAHP: 10-4, much appreciated!` },
        { text: `${selectedOrg} to SAHP: Permission Granted!` },
      ]
    },
    {
      id: 'ng',
      name: '🙍‍♂️ NG Related',
      icon: '🙍‍♂️',
      commands: [
        { text: `${selectedOrg} to NG: How copy?` },
        { text: `${selectedOrg} to NG: Good copy, send traffic!` },
        { text: `${selectedOrg} to NG: Bad copy!` },
        { text: `${selectedOrg} to NG: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to NG: Can we have a quick meeting at your main barracks?` },
        { text: `${selectedOrg} to NG: Requesting permission to land at your main barracks.` },
        { text: `${selectedOrg} to NG: We have one of your soldiers in custody, could you 10-17 to DOC?` },
        { text: `${selectedOrg} to NG: We're currently enroute!` },
        { text: `${selectedOrg} to NG: 10-4, much appreciated!` },
        { text: `${selectedOrg} to NG: Permission Granted!` },
      ]
    },
    {
      id: 'ems',
      name: '👨‍⚕️👨‍⚕️ EMS Related',
      icon: '👨‍⚕️',
      commands: [
        { text: `${selectedOrg} to EMS: How copy?` },
        { text: `${selectedOrg} to EMS: Good copy, send traffic!` },
        { text: `${selectedOrg} to EMS: Bad copy!` },
        { text: `${selectedOrg} to EMS: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to EMS: Ghetto is off limits for the next 25 minutes, please inform all your units.` },
        { text: `${selectedOrg} to EMS: Can we have a quick meeting at Pillbox Hospital?` },
        { text: `${selectedOrg} to EMS: Requesting permission to land at your helipad.` },
        { text: `${selectedOrg} to EMS: We have one of your employees in custody, could you 10-17 to DOC?` },
        { text: `${selectedOrg} to EMS: We're currently enroute!` },
        { text: `${selectedOrg} to EMS: Clean!` },
        { text: `${selectedOrg} to EMS: 10-4, much appreciated!` },
        { text: `${selectedOrg} to EMS: Permission Granted!` },
      ]
    },
    {
      id: 'gov',
      name: '🚔 Government Related',
      icon: '🚔',
      commands: [
        { text: `${selectedOrg} to GOV: How copy?` },
        { text: `${selectedOrg} to GOV: Good copy, send traffic!` },
        { text: `${selectedOrg} to GOV: Bad copy!` },
        { text: `${selectedOrg} to GOV: Bad copy, we're currently in a situation!` },
        { text: `${selectedOrg} to GOV: Agents enroute!` },
        { text: `${selectedOrg} to GOV: Can we have a quick meeting at capitol?` },
        { text: `${selectedOrg} to GOV: Requesting permission to land on your lawn.` },
        { text: `${selectedOrg} to GOV: We have one of your units in custody, could you 10-17 to DOC?` },
        { text: `${selectedOrg} to GOV: 10-4, much appreciated!` },
      ]
    },
    {
      id: 'global',
      name: '🚨🚨 Global Related',
      icon: '🚨',
      commands: [
        { text: `${selectedOrg} to GLOBAL: What's the situation?` },
        { text: `${selectedOrg} to ALL: Global is for Regroupping for latest Store Robbery.Please Dispatch Max units` },
        { text: `${selectedOrg} to ALL: Global is for heavy 10-10s, send all available units!` },
        { text: `${selectedOrg} to ALL: Federals is getting robbed at global, send all available units!` },
        { text: `${selectedOrg} to ALL: Global is for a hood watch, send all available units!` },
        { text: `${selectedOrg} to ALL: Global is for a checkpoint, everyone is invited!` },
        { text: `${selectedOrg} to ALL: Be on standby for a possible hostage situation!` },
        { text: `${selectedOrg} to ALL: The Global is 10-99.` },
      ]
    },
  ]

  const { recordRecentItem, pinItem, unpinItem, isItemPinned } = useProductivity()

  useEffect(() => {
    recordRecentItem({
      type: 'page',
      targetId: '/bodycam-commands',
      title: `${selectedOrg} Bodycam Commands`,
      subtitle: 'Roleplay Macros & Dispatch',
      url: '/bodycam-commands',
    })
  }, [selectedOrg, recordRecentItem])

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
        subtitle: `${selectedOrg} • ${categoryName}`,
        data: { text: command.text, org: selectedOrg },
      })
      showToast('Pinned command to utility panel', 'success')
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">{selectedOrg} Bodycam Commands</h1>
          <p className="text-on-surface-variant text-sm">
            Standard Operating Procedure roleplay commands for {selectedOrg}
          </p>
        </div>
        
        {/* Organization Selector */}
        <div className="flex flex-col items-end">
          <label className="text-xs font-mono uppercase text-on-surface-variant mb-1">Select Organization:</label>
          <select
            value={selectedOrg}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="bg-surface-dim border border-outline-variant rounded px-3 py-1.5 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
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
      <div className="mb-8">
        <h2 className="text-xl font-bold text-on-surface mb-3 flex items-center gap-2">
          <span>General Commands</span>
        </h2>
        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <h3 className="text-base font-semibold text-on-surface flex items-center gap-2">
                    <span>{category.name}</span>
                  </h3>
                  <svg
                    className={`w-5 h-5 text-on-surface-variant transition-transform ${
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
                  <div className="px-5 pb-5 pt-2 space-y-3 bg-surface-container-lowest">
                    {category.commands.map((command, idx) => {
                      const isPinned = isItemPinned('command', command.text)
                      return (
                        <div key={idx} className="space-y-1.5">
                          {command.label && (
                            <p className="text-xs font-semibold text-primary">{command.label}</p>
                          )}
                          <div className="flex items-start gap-2 bg-surface-dim border border-outline-variant/60 p-3 rounded hover:border-outline transition-colors group">
                            <code className="flex-1 text-on-surface text-xs font-mono break-words leading-relaxed">
                              {command.text}
                            </code>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleTogglePin(command, category.name)}
                                className={`p-1.5 rounded transition-colors text-xs ${
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
                                className="p-1.5 text-primary hover:text-primary-container hover:bg-surface-container rounded transition-colors"
                                title="Copy Command"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
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
      <div className="mb-8">
        <h2 className="text-xl font-bold text-on-surface mb-3">📩 Department Messages</h2>
        <div className="space-y-3">
          {departmentMessages.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <h3 className="text-base font-semibold text-on-surface">
                    {category.name}
                  </h3>
                  <svg
                    className={`w-5 h-5 text-on-surface-variant transition-transform ${
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
                  <div className="px-5 pb-5 pt-2 space-y-2 bg-surface-container-lowest">
                    {category.commands.map((command, idx) => {
                      const isPinned = isItemPinned('command', command.text)
                      return (
                        <div key={idx} className="flex items-start gap-2 bg-surface-dim border border-outline-variant/60 p-2.5 rounded hover:border-outline transition-colors group">
                          <code className="flex-1 text-on-surface text-xs font-mono break-words leading-relaxed">
                            {command.text}
                          </code>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleTogglePin(command, category.name)}
                              className={`p-1.5 rounded transition-colors text-xs ${
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
                              className="p-1.5 text-primary hover:text-primary-container hover:bg-surface-container rounded transition-colors"
                              title="Copy Command"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
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
