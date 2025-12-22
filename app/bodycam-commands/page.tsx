'use client'

import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'

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
  const [selectedOrg, setSelectedOrg] = useState('FIB')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['attaching'])

  const organizations = ['FIB', 'EMS', 'NG', 'SAHP', 'LSPD', 'GOV']

  const categories: Category[] = [
    {
      id: 'attaching',
      name: '📹 Attaching Bodycam',
      icon: '📹',
      commands: [
        {
          label: 'Attaching Bodycam (Uniform)',
          text: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof'
        },
        { text: '/me makes sure it is recording and checks for the red light' },
        { text: '/do It is recording, is ballistic and water proof' },
        { text: '/me connects PDA to the nearest cell tower' },
        {
          label: 'While Undercover',
          text: '/me takes out bodycam and attaches it to belt, hides it, checks its ballistic and water proof'
        },
        { text: '/me makes sure it is recording and checks for the red light' },
        { text: '/do It is recording, is ballistic and water proof' },
        { text: '/me connects PDA to the nearest cell tower' },
      ]
    },
    {
      id: 'refreshing',
      name: '📹 Refreshing Bodycam',
      icon: '📹',
      commands: [
        { label: 'Refreshing Bodycam', text: '/me refreshing bodycam' },
        { text: '/do It is recording' },
      ]
    },
    {
      id: 'saving',
      name: '🎥 Saving Bodycam',
      icon: '🎥',
      commands: [
        {
          label: 'Saving Bodycam',
          text: `/me saves bodycam, uploads it to the ${selectedOrg} Cloud and continues recording`
        },
        { text: '/do It is recording' },
      ]
    },
    {
      id: 'jumpsuit',
      name: '🧥 Taking Jumpsuit from Bench',
      icon: '🧥',
      commands: [
        {
          label: 'Taking Jumpsuit from Bench',
          text: '/me takes the XYZ size Jumpsuit from the Bench'
        },
        { text: '/me Places the Jumpsuit On the Bed' },
      ]
    },
    {
      id: 'drone',
      name: '✈ Drone Commands',
      icon: '✈',
      commands: [
        {
          label: 'While in Work Uniform',
          text: `/me launches the ${selectedOrg} Drone`
        },
        { text: `/me Takes the ${selectedOrg} Drone from the Ground and put it back in backpack` },
        {
          label: 'While Undercover',
          text: `/me takes the ${selectedOrg} drone from the trunk and puts it in the backpack`
        },
        { text: `/me takes the ${selectedOrg} drone from the backpack and launches it` },
        { text: `/me takes the ${selectedOrg} drone from the ground and puts it in the backpack` },
      ]
    },
    {
      id: 'lawyer',
      name: '⚖️ Handing Footage to the Lawyer',
      icon: '⚖️',
      commands: [
        {
          label: 'Handing Footage to the Lawyer',
          text: `/me saves bodycam contents onto an SD card and uploads contents to ${selectedOrg} servers`
        },
        { text: '/me Takes SD card out of the bodycam and hands it to the lawyer' },
      ]
    },
    {
      id: 'shift',
      name: '🏁 Finishing Your Shift',
      icon: '🏁',
      commands: [
        {
          label: 'Finishing Your Shift',
          text: `/me saves bodycam contents onto an SD card and uploads contents to ${selectedOrg} servers`
        },
        { text: '/me puts the badge in the locker' },
      ]
    },
    {
      id: 'searching',
      name: '🔎 Searching a Trunk',
      icon: '🔎',
      commands: [
        {
          label: 'Searching a Trunk',
          text: '/me carefully inspects the trunk and uses a crowbar to attempt opening it'
        },
        { text: '/me applies pressure with the crowbar to force the trunk open' },
      ]
    },
    {
      id: 'evidence',
      name: '🕵️‍♀️ Taking Evidence',
      icon: '🕵️‍♀️',
      commands: [
        {
          label: 'When License Plate Not Visible',
          text: '/me feels the edges of the vehicle for VIN and checks for ownership'
        },
        {
          label: 'When License Plate of Bike Not Visible',
          text: '/me checks the VIN from the steering neck of the bike and checks for ownership'
        },
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Command copied to clipboard!', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-400 mb-2">{selectedOrg} Bodycam Commands</h1>
          <p className="text-gray-400">
            Made by Avansh Yadav
          </p>
        </div>
        
        {/* Organization Selector */}
        <div className="flex flex-col items-end">
          <label className="text-sm text-gray-400 mb-2">Select Organization:</label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="input px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
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
        <h2 className="text-2xl font-bold text-blue-300 mb-4">General Commands</h2>
        <div className="space-y-4">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-gray-100">
                    {category.name}
                  </h3>
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${
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
                  <div className="px-6 pb-6 space-y-3">
                    {category.commands.map((command, idx) => (
                      <div key={idx} className="space-y-2">
                        {command.label && (
                          <p className="text-sm font-semibold text-blue-300">{command.label}</p>
                        )}
                        <div className="flex items-start gap-2 bg-gray-800 p-3 rounded-md">
                          <code className="flex-1 text-gray-200 text-sm break-words">
                            {command.text}
                          </code>
                          <button
                            onClick={() => handleCopy(command.text)}
                            className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                            title="Copy"
                          >
                            <svg
                              className="w-5 h-5"
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
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Department Messages */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blue-300 mb-4">📩 Department Messages</h2>
        <div className="space-y-4">
          {departmentMessages.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            
            return (
              <div key={category.id} className="card">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-gray-100">
                    {category.name}
                  </h3>
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${
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
                  <div className="px-6 pb-6 space-y-3">
                    {category.commands.map((command, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-gray-800 p-3 rounded-md">
                        <code className="flex-1 text-gray-200 text-sm break-words">
                          {command.text}
                        </code>
                        <button
                          onClick={() => handleCopy(command.text)}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                          title="Copy"
                        >
                          <svg
                            className="w-5 h-5"
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
                    ))}
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
