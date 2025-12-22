'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ToastProvider'
import { loadAllLawData, LawEntry } from '@/utils/htmlParser'

export default function EvidenceGeneratorPage() {
  const { showToast } = useToast()
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

  useEffect(() => {
    loadCharges()
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

  const generateReport = () => {
    if (!date || !time || !description) {
      showToast('Please fill in Date, Time, and Description', 'error')
      return
    }

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
    showToast('Evidence report copied to clipboard!', 'success')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">Evidence Generator</h1>
        <p className="text-gray-400">Generate properly formatted evidence reports.</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time *</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full min-h-[120px]"
            placeholder="Detailed description of the incident..."
          />
        </div>

        {/* Charges Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search & Add Charges from Patrolman's Guide
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchCharges(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowChargeDropdown(true)}
              onBlur={() => setTimeout(() => setShowChargeDropdown(false), 200)}
              className="input w-full"
              placeholder="Search for charges (e.g., P.C. 2.5.3 or robbery)..."
            />
            
            {showChargeDropdown && availableCharges.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {availableCharges.map((charge) => (
                  <button
                    key={charge.code}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      addCharge(charge)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-mono text-blue-300 text-sm">{charge.code}</div>
                    <div className="text-gray-300 text-sm">{charge.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Charges */}
          {selectedCharges.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-400">Selected charges:</p>
              {selectedCharges.map((charge) => (
                <div
                  key={charge.code}
                  className="flex items-start justify-between bg-gray-800 p-3 rounded-md"
                >
                  <div className="flex-1">
                    <span className="font-mono text-blue-300 text-sm">{charge.code} {charge.description}</span>
                  </div>
                  <button
                    onClick={() => removeCharge(charge.code)}
                    className="text-red-400 hover:text-red-300 ml-4"
                    title="Remove charge"
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

        {/* Links Section */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bodycam Footage
            </label>
            <input
              type="text"
              value={bodycamFootage}
              onChange={(e) => setBodycamFootage(e.target.value)}
              className="input w-full"
              placeholder="https://www.youtube.com/"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bodycam Proof
            </label>
            <input
              type="text"
              value={bodycamProof}
              onChange={(e) => setBodycamProof(e.target.value)}
              className="input w-full"
              placeholder="https://www.imgur.com/"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              License Plates
            </label>
            <input
              type="text"
              value={licensePlates}
              onChange={(e) => setLicensePlates(e.target.value)}
              className="input w-full"
              placeholder="https://www.imgur.com/"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Makeup
            </label>
            <input
              type="text"
              value={makeup}
              onChange={(e) => setMakeup(e.target.value)}
              className="input w-full"
              placeholder="Take screenshot from makeup log and attach here..."
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4">
          <button onClick={generateReport} className="btn btn-primary w-full">
            Generate & Copy Report
          </button>
        </div>
      </div>
    </div>
  )
}
