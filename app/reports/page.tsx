'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useDuty } from '@/contexts/DutyContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { loadAllLawData, LawEntry } from '@/utils/htmlParser'
import { EVENT_PRESETS } from '@/utils/presets'

const VESTS = [
  'Vest Level 1',
  'Vest Level 2',
  'Vest Level 3',
  'Vest Level 4',
  'Vest Level 5',
  'Vest Level 6',
]

const WEAPONS = [
  'Armor-piercing pistol',
  'Stun gun',
  'PDW submachine gun',
  'Shotgun',
  'Heavy shotgun',
  'Assault rifle',
  'Bullpup assault rifle',
  'Sniper rifle',
  'Light machine gun',
  'Assault rifle carbine',
  'AUG assault rifle',
  'Police baton',
  'Balaclava',
]

export default function ReportsPage() {
  const { showToast } = useToast()
  const { profile } = useUserProfile()
  const { 
    isOnDuty, 
    arrestCount, 
    fineCount, 
    currentShiftArrests, 
    currentShiftFines, 
    weaponsTaken, 
    currentDutyStart, 
    currentEventCounters,
    startDuty, 
    endDuty, 
    incrementFines,
    addEventCounter,
    incrementEventCounter,
    removeEventCounter,
  } = useDuty()
  
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [bodycamFootage, setBodycamFootage] = useState('https://www.youtube.com/')
  const [bodycamProof, setBodycamProof] = useState('https://www.imgur.com/')
  const [licensePlates, setLicensePlates] = useState('https://www.imgur.com/')
  const [makeup, setMakeup] = useState('')
  const [selectedCharges, setSelectedCharges] = useState<LawEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [availableCharges, setAvailableCharges] = useState<LawEntry[]>([])
  const [showChargeDropdown, setShowChargeDropdown] = useState(false)
  const [allCharges, setAllCharges] = useState<LawEntry[]>([])

  const [eventsAttended, setEventsAttended] = useState('')
  const [selectedWeapons, setSelectedWeapons] = useState<{weapon: string, ammo: string}[]>([])
  const [selectedVests, setSelectedVests] = useState<string[]>([])
  const [weaponAmmo, setWeaponAmmo] = useState<{[key: string]: string}>({})
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false)
  const weaponDropdownRef = useRef<HTMLDivElement>(null)

  // Populate officer info from profile
  useEffect(() => {
    // Profile info is now managed in Profile page, no need for local state
  }, [profile])

  useEffect(() => {
    loadCharges()
    
    const handleClickOutside = (event: MouseEvent) => {
      if (weaponDropdownRef.current && !weaponDropdownRef.current.contains(event.target as Node)) {
        setShowWeaponDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadCharges = async () => {
    try {
      const data = await loadAllLawData()
      setAllCharges(data.allEntries)
    } catch (error) {
      console.error('Failed to load charges:', error)
    }
  }

  const handleSearchCharges = (term: string) => {
    setSearchTerm(term)
    if (term.length < 2) {
      setAvailableCharges([])
      setShowChargeDropdown(false)
      return
    }

    const filtered = allCharges.filter(
      (charge) =>
        charge.code.toLowerCase().includes(term.toLowerCase()) ||
        charge.description.toLowerCase().includes(term.toLowerCase())
    )
    setAvailableCharges(filtered.slice(0, 10))
    setShowChargeDropdown(true)
  }

  const addCharge = (charge: LawEntry) => {
    if (!selectedCharges.find((c) => c.code === charge.code)) {
      setSelectedCharges([...selectedCharges, charge])
    }
    setSearchTerm('')
    setShowChargeDropdown(false)
  }

  const removeCharge = (code: string) => {
    setSelectedCharges(selectedCharges.filter((c) => c.code !== code))
  }

  const generateEvidenceReport = () => {
    if (!date || !time || !description) {
      showToast('Please fill in Date, Time, and Description', 'error')
      return
    }

    incrementFines()

    const chargesList = selectedCharges
      .map((charge) => `- ${charge.code} ${charge.description}`)
      .join('\n')

    const report = `Date: ${date}
Time: ${time}
Description:
${description}

Charges: (Below are most common ones for you to copy from here simply)
${chargesList || '- No charges added'}

- Bodycam Footage: [${bodycamFootage}]
- Bodycam Proof: [${bodycamProof}]
- License Plates: [${licensePlates}]
- Makeup: ${makeup || 'Take screenshot from makeup log of your log and attach here. (Can also post on imgur and attach link)'}
`

    navigator.clipboard.writeText(report)
    showToast('Evidence report copied! Fine count increased', 'success')
  }

  const handleStartDuty = () => {
    if (!profile.name || !profile.id || !profile.rank || !profile.badgeNumber) {
      showToast('Please complete your profile information first', 'error')
      return
    }
    if (selectedVests.length === 0) {
      showToast('Please select at least one vest', 'error')
      return
    }
    if (selectedWeapons.length === 0) {
      showToast('Please select at least one weapon', 'error')
      return
    }

    const hasEmptyAmmo = selectedWeapons.some(w => !w.ammo.trim())
    if (hasEmptyAmmo) {
      showToast('Please enter ammo amount for all weapons', 'error')
      return
    }

    const weapons = [...selectedVests, ...selectedWeapons.map(w => `${w.weapon} (${w.ammo})`)]
    startDuty(weapons)
    showToast('Duty started!', 'success')
  }

  const handleEndDuty = () => {
    if (!eventsAttended.trim()) {
      showToast('Please fill in Events Attended', 'error')
      return
    }

    // Open weapon status modal
    showWeaponStatusModal()
  }

  const [showWeaponModal, setShowWeaponModal] = useState(false)
  const [weaponStatuses, setWeaponStatuses] = useState<{[key: string]: 'returned' | 'lost' | 'broken' | 'used'}>({})
  const [newEventName, setNewEventName] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  const showWeaponStatusModal = () => {
    // Initialize all weapons as returned
    const initialStatuses: {[key: string]: 'returned' | 'lost' | 'broken' | 'used'} = {}
    weaponsTaken.forEach(weapon => {
      initialStatuses[weapon] = 'returned'
    })
    setWeaponStatuses(initialStatuses)
    setShowWeaponModal(true)
  }

  const finalizeEndDuty = () => {
    const weaponStatusArray = Object.entries(weaponStatuses).map(([name, status]) => ({
      name,
      status
    }))

    generateShiftReport(weaponStatusArray)
    endDuty(weaponStatusArray, eventsAttended)
    
    setEventsAttended('')
    setSelectedWeapons([])
    setSelectedVests([])
    setWeaponAmmo({})
    setShowWeaponModal(false)
    setWeaponStatuses({})
  }

  const generateShiftReport = (weaponStatusArray: {name: string, status: string}[]) => {
    // Get GMT+0 server time
    const getGMT0Time = () => {
      const now = new Date()
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
      const gmt0 = new Date(utc) // GMT+0
      return gmt0
    }

    const onDutyTime = new Date(currentDutyStart || '')
    const offDutyTime = getGMT0Time()
    
    const formatTime = (date: Date) => date.toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })

    const weaponsTakenList = weaponsTaken.join('\n')
    
    const returnedWeapons = weaponStatusArray.filter(w => w.status === 'returned')
    const lostWeapons = weaponStatusArray.filter(w => w.status === 'lost')
    const brokenWeapons = weaponStatusArray.filter(w => w.status === 'broken')
    const usedWeapons = weaponStatusArray.filter(w => w.status === 'used')
    
    let weaponsReturnedSection = returnedWeapons.map(w => w.name).join('\n')
    if (lostWeapons.length > 0) {
      weaponsReturnedSection += '\n\n🔴 LOST:\n' + lostWeapons.map(w => w.name).join('\n')
    }
    if (brokenWeapons.length > 0) {
      weaponsReturnedSection += '\n\n💔 BROKEN:\n' + brokenWeapons.map(w => w.name).join('\n')
    }
    if (usedWeapons.length > 0) {
      weaponsReturnedSection += '\n\n⚡ USED:\n' + usedWeapons.map(w => w.name).join('\n')
    }

    const report = `----------------------------------------------------------------
Name: ${profile.name || 'Not set'}
ID: ${profile.id || 'Not set'}
----------------------------------------------------------------
Rank: ${profile.rank || 'Not set'}
Badge Number: ${profile.badgeNumber || 'Not set'}
----------------------------------------------------------------
ON DUTY: ${formatTime(onDutyTime)}
----------------------------------------------------------------
Weapons Taken: ( with Ammunation )
${weaponsTakenList}
----------------------------------------------------------------
Events Attended: ${eventsAttended}
----------------------------------------------------------------
Total Arrests: ${currentShiftArrests}
----------------------------------------------------------------
Total Fines: ${currentShiftFines}
----------------------------------------------------------------
OFF DUTY: ${formatTime(offDutyTime)}
----------------------------------------------------------------
Weapons Returned: ( with Ammunation )
${weaponsReturnedSection}
----------------------------------------------------------------`

    navigator.clipboard.writeText(report)
    showToast('Shift report copied and duty ended!', 'success')
  }

  const updateWeaponAmmo = (weapon: string, ammo: string) => {
    setWeaponAmmo(prev => ({ ...prev, [weapon]: ammo }))
    setSelectedWeapons(prev => 
      prev.map(w => w.weapon === weapon ? { ...w, ammo } : w)
    )
  }

  const addVest = (vest: string) => {
    setSelectedVests(prev => [...prev, vest])
  }

  const removeVest = (index: number) => {
    setSelectedVests(prev => prev.filter((_, i) => i !== index))
  }

  const removeWeapon = (weapon: string) => {
    setSelectedWeapons(prev => prev.filter(w => w.weapon !== weapon))
    setWeaponAmmo(prev => {
      const newAmmo = {...prev}
      delete newAmmo[weapon]
      return newAmmo
    })
  }

  const addWeaponFromDropdown = (weapon: string) => {
    if (!selectedWeapons.find(w => w.weapon === weapon)) {
      setSelectedWeapons(prev => [...prev, { weapon, ammo: '' }])
    }
    setShowWeaponDropdown(false)
  }

  const applyWeaponPreset = (loadoutId: string) => {
    const loadout = profile.loadouts.find(l => l.id === loadoutId)
    if (!loadout) return
    
    setSelectedVests(loadout.vests)
    setSelectedWeapons(loadout.weapons)
    setShowPresets(false)
    showToast(`Applied loadout: ${loadout.name}`, 'success')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Evidence Generator</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate properly formatted evidence reports.</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Current Time: {new Date().toLocaleString()}</p>
        </div>

        <div className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full min-h-[120px]" placeholder="Detailed description of the incident..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search & Add Charges</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchCharges(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowChargeDropdown(true)}
                onBlur={() => setTimeout(() => setShowChargeDropdown(false), 200)}
                className="input w-full"
                placeholder="Search for charges..."
              />
              
              {showChargeDropdown && availableCharges.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {availableCharges.map((charge) => (
                    <button
                      key={charge.code}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addCharge(charge)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-mono text-blue-600 dark:text-blue-300 text-sm">{charge.code}</div>
                      <div className="text-gray-900 dark:text-gray-300 text-sm">{charge.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCharges.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Selected charges:</p>
                {selectedCharges.map((charge) => (
                  <div key={charge.code} className="flex items-start justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <span className="font-mono text-blue-600 dark:text-blue-300 text-sm">{charge.code} {charge.description}</span>
                    <button onClick={() => removeCharge(charge.code)} className="text-red-600 dark:text-red-400 ml-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bodycam Footage</label>
              <input type="text" value={bodycamFootage} onChange={(e) => setBodycamFootage(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bodycam Proof</label>
              <input type="text" value={bodycamProof} onChange={(e) => setBodycamProof(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">License Plates</label>
              <input type="text" value={licensePlates} onChange={(e) => setLicensePlates(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Makeup</label>
              <input type="text" value={makeup} onChange={(e) => setMakeup(e.target.value)} className="input w-full" />
            </div>
          </div>

          <button onClick={generateEvidenceReport} className="btn btn-primary w-full">Generate & Copy Report</button>
        </div>
      </div>

      <div>
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Shift Report Generator</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your duty and generate shift reports.</p>
        </div>

        <div className="card p-6 space-y-6">
          {/* Display Officer Info from Profile */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">👤 Officer Information</h3>
            {(!profile.name || !profile.id || !profile.rank || !profile.badgeNumber) ? (
              <div className="text-center py-2">
                <p className="text-gray-600 dark:text-gray-400 mb-2">Profile information incomplete</p>
                <a 
                  href="/profile" 
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  Complete your profile →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{profile.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">ID</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{profile.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Rank</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{profile.rank}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Badge Number</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{profile.badgeNumber}</p>
                </div>
              </div>
            )}
          </div>

          {!isOnDuty && (
            <>
              {/* Weapon Loadout Presets */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">⚡ Quick Loadouts</h3>
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showPresets ? 'Hide' : 'Show'} Loadouts
                  </button>
                </div>

                {showPresets && (
                  <div className="space-y-4">
                    {profile.loadouts.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 mb-2">No custom loadouts created yet.</p>
                        <a 
                          href="/profile" 
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Go to Profile to create loadouts →
                        </a>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {profile.loadouts.map((loadout) => (
                          <button
                            key={loadout.id}
                            onClick={() => applyWeaponPreset(loadout.id)}
                            className="p-4 text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">{loadout.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              <div>{loadout.vests.length} vest(s)</div>
                              <div>{loadout.weapons.length} weapon(s)</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Vests *</label>
                <div className="space-y-2">
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        addVest(e.target.value)
                        e.target.value = ''
                      }
                    }} 
                    className="input w-full"
                  >
                    <option value="">Add a vest...</option>
                    {VESTS.map((vest) => <option key={vest} value={vest}>{vest}</option>)}
                  </select>
                  
                  {selectedVests.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Selected vests:</p>
                      {selectedVests.map((vest, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md">
                          <span className="text-sm text-gray-900 dark:text-gray-200">{vest}</span>
                          <button 
                            onClick={() => removeVest(index)} 
                            className="text-red-600 dark:text-red-400 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Weapons *</label>
                <div className="space-y-3">
                  <div className="relative" ref={weaponDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowWeaponDropdown(!showWeaponDropdown)}
                      className="input w-full text-left flex items-center justify-between"
                    >
                      <span className="text-gray-500 dark:text-gray-400">Add weapons...</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showWeaponDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {WEAPONS.filter(w => !selectedWeapons.find(sw => sw.weapon === w)).length > 0 ? (
                          WEAPONS.filter(w => !selectedWeapons.find(sw => sw.weapon === w)).map((weapon) => (
                            <button
                              key={weapon}
                              onClick={() => addWeaponFromDropdown(weapon)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-200"
                            >
                              {weapon}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">All weapons selected</div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedWeapons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Selected weapons:</p>
                      {selectedWeapons.map((item) => (
                        <div key={item.weapon} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.weapon}</p>
                          </div>
                          <input
                            type="text"
                            value={item.ammo}
                            onChange={(e) => updateWeaponAmmo(item.weapon, e.target.value)}
                            placeholder="Ammo amount"
                            className="input w-32"
                          />
                          <button 
                            onClick={() => removeWeapon(item.weapon)} 
                            className="text-red-600 dark:text-red-400 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Event Counters Section */}
          {isOnDuty && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Event Counters</h3>
              
              {/* Event Presets */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-2 font-medium">⚡ Quick Events</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (!currentEventCounters.find(e => e.name === preset.name)) {
                          addEventCounter(preset.name)
                          showToast(`Added "${preset.name}" counter`, 'success')
                        } else {
                          showToast('Counter already exists', 'info')
                        }
                      }}
                      className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md border border-blue-200 dark:border-blue-700 text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors"
                    >
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Event */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newEventName.trim()) {
                      addEventCounter(newEventName.trim())
                      setNewEventName('')
                      showToast('Event counter added!', 'success')
                    }
                  }}
                  placeholder="Add event counter (e.g., Store Robbery, Traffic Stop)..."
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    if (newEventName.trim()) {
                      addEventCounter(newEventName.trim())
                      setNewEventName('')
                      showToast('Event counter added!', 'success')
                    }
                  }}
                  className="btn btn-primary"
                  disabled={!newEventName.trim()}
                >
                  Add
                </button>
              </div>

              {/* Event Counters List */}
              {currentEventCounters.length > 0 ? (
                <div className="space-y-2">
                  {currentEventCounters.map((event) => (
                    <div key={event.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{event.name}</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{event.count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => incrementEventCounter(event.name)}
                          className="btn bg-green-600 text-white hover:bg-green-700 px-4 py-2"
                        >
                          + 1
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${event.name}" counter?`)) {
                              removeEventCounter(event.name)
                              showToast('Event counter removed', 'success')
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>No event counters yet. Add one to track events during your shift!</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Status</p>
              <p className={`text-2xl font-bold ${isOnDuty ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
              </p>
              {isOnDuty && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">This Shift - Arrests: {currentShiftArrests} | Fines: {currentShiftFines}</p>}
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Lifetime - Arrests: {arrestCount} | Fines: {fineCount}</p>
            </div>
            
            {!isOnDuty ? (
              <button 
                onClick={handleStartDuty} 
                className="btn btn-primary" 
                disabled={!profile.name || !profile.id || !profile.rank || !profile.badgeNumber}
              >
                Start Duty
              </button>
            ) : (
              <div className="space-y-2">
                <input type="text" value={eventsAttended} onChange={(e) => setEventsAttended(e.target.value)} className="input w-full" placeholder="Events Attended..." />
                <button onClick={handleEndDuty} className="btn btn-primary w-full">End Duty & Generate Report</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weapon Status Modal */}
      {showWeaponModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                Weapon Status Check
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please mark the status of each weapon taken during your shift:
              </p>
              
              <div className="space-y-4">
                {weaponsTaken.map((weapon) => (
                  <div key={weapon} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">{weapon}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => setWeaponStatuses(prev => ({ ...prev, [weapon]: 'returned' }))}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          weaponStatuses[weapon] === 'returned'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        ✅ Returned
                      </button>
                      <button
                        onClick={() => setWeaponStatuses(prev => ({ ...prev, [weapon]: 'lost' }))}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          weaponStatuses[weapon] === 'lost'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        🔴 Lost
                      </button>
                      <button
                        onClick={() => setWeaponStatuses(prev => ({ ...prev, [weapon]: 'broken' }))}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          weaponStatuses[weapon] === 'broken'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        💔 Broken
                      </button>
                      <button
                        onClick={() => setWeaponStatuses(prev => ({ ...prev, [weapon]: 'used' }))}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          weaponStatuses[weapon] === 'used'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        ⚡ Used
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowWeaponModal(false)}
                  className="flex-1 btn bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={finalizeEndDuty}
                  className="flex-1 btn btn-primary"
                >
                  Complete & End Duty
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        Made by <span className="font-semibold text-blue-600 dark:text-blue-400">Avansh Yadav (EN3)</span> - Currently Server Administrator
      </footer>
    </div>
  )
}
