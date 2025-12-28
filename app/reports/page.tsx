'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useDuty } from '@/contexts/DutyContext'
import { loadAllLawData, LawEntry } from '@/utils/htmlParser'

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
  const { isOnDuty, arrestCount, fineCount, currentShiftArrests, currentShiftFines, weaponsTaken, startDuty, endDuty, incrementFines } = useDuty()
  
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

  const [officerName, setOfficerName] = useState('')
  const [officerId, setOfficerId] = useState('')
  const [rank, setRank] = useState('')
  const [badgeNumber, setBadgeNumber] = useState('')
  const [eventsAttended, setEventsAttended] = useState('')
  const [selectedWeapons, setSelectedWeapons] = useState<{weapon: string, ammo: string}[]>([])
  const [selectedVests, setSelectedVests] = useState<string[]>([])
  const [weaponAmmo, setWeaponAmmo] = useState<{[key: string]: string}>({})
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false)
  const weaponDropdownRef = useRef<HTMLDivElement>(null)

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
    if (!officerName.trim() || !officerId.trim() || !rank.trim() || !badgeNumber.trim()) {
      showToast('Please fill in all officer information', 'error')
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

    generateShiftReport()
    endDuty(weaponsTaken, eventsAttended)
    
    setEventsAttended('')
    setSelectedWeapons([])
    setSelectedVests([])
    setWeaponAmmo({})
  }

  const generateShiftReport = () => {
    const pcTime = new Date()
    const gameTime = new Date(pcTime.getTime() + (60 * 60 * 1000)) // GMT+1
    
    const formatTime = (date: Date) => date.toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })

    const weaponsTakenList = weaponsTaken.join('\n')

    const report = `----------------------------------------------------------------
Name: ${officerName}
ID: ${officerId}
----------------------------------------------------------------
Rank: ${rank}
Badge Number: ${badgeNumber}
----------------------------------------------------------------
ON DUTY: ${formatTime(gameTime)}
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
OFF DUTY: ${formatTime(gameTime)}
----------------------------------------------------------------
Weapons Returned: ( with Ammunation )
${weaponsTakenList}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
              <input type="text" value={officerName} onChange={(e) => setOfficerName(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID *</label>
              <input type="text" value={officerId} onChange={(e) => setOfficerId(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rank *</label>
              <input type="text" value={rank} onChange={(e) => setRank(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Badge Number *</label>
              <input type="text" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} className="input w-full" />
            </div>
          </div>

          {!isOnDuty && (
            <>
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
              <button onClick={handleStartDuty} className="btn btn-primary" disabled={!officerName || !officerId || !rank || !badgeNumber}>Start Duty</button>
            ) : (
              <div className="space-y-2">
                <input type="text" value={eventsAttended} onChange={(e) => setEventsAttended(e.target.value)} className="input w-full" placeholder="Events Attended..." />
                <button onClick={handleEndDuty} className="btn btn-primary w-full">End Duty & Generate Report</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        Made by <span className="font-semibold text-blue-600 dark:text-blue-400">Avansh Yadav (EN3)</span> - Currently Server Administrator
      </footer>
    </div>
  )
}
