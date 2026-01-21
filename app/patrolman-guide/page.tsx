'use client'

import { useState, useEffect } from 'react'
import CopyButton from '@/components/CopyButton'
import { useToast } from '@/components/ToastProvider'
import { useDuty } from '@/contexts/DutyContext'
import { loadAllLawData, filterLawEntries, LawEntry } from '@/utils/htmlParser'
import { ChargeTemplate, getCustomChargeTemplates, saveCustomChargeTemplate, deleteCustomChargeTemplate } from '@/utils/presets'

export default function PatrolmanGuidePage() {
  const { showToast } = useToast()
  const { incrementArrests, addArrestRecord } = useDuty()
  const [data, setData] = useState<LawEntry[]>([])
  const [filteredData, setFilteredData] = useState<LawEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCharges, setSelectedCharges] = useState<LawEntry[]>([])
  const [suspectName, setSuspectName] = useState('')
  const [suspectId, setSuspectId] = useState('')
  const [showArrestModal, setShowArrestModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<ChargeTemplate[]>([])
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('')
  const [allCharges, setAllCharges] = useState<LawEntry[]>([])
  const itemsPerPage = 20

  useEffect(() => {
    loadData()
    setCustomTemplates(getCustomChargeTemplates())
  }, [])

  useEffect(() => {
    let dataToFilter = data
    if (selectedCategory !== 'all') {
      dataToFilter = data.filter(entry => 
        entry.code.startsWith(selectedCategory === 'penal' ? 'P.C.' : 'T.C.')
      )
    }
    const filtered = filterLawEntries(dataToFilter, searchTerm)
    setFilteredData(filtered)
    setCurrentPage(1)
  }, [searchTerm, data, selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      const lawData = await loadAllLawData()
      setData(lawData.allEntries)
      setFilteredData(lawData.allEntries)
      setAllCharges(lawData.allEntries)
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(lawData.allEntries.map(e => e.category).filter(Boolean))
      )
      setCategories(uniqueCategories as string[])
    } catch (error) {
      console.error('Failed to load data:', error)
      showToast('Failed to load law codes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyRow = (entry: LawEntry) => {
    const text = `${entry.code} ${entry.description}`
    navigator.clipboard.writeText(text)
    showToast('Law code copied!', 'success')
  }

  const handleAddCharge = (entry: LawEntry) => {
    if (!selectedCharges.find(c => c.code === entry.code)) {
      setSelectedCharges([...selectedCharges, entry])
      showToast('Charge added!', 'success')
    } else {
      showToast('Charge already added', 'error')
    }
  }

  const removeCharge = (code: string) => {
    setSelectedCharges(selectedCharges.filter(c => c.code !== code))
  }

  const copyAllCharges = () => {
    if (selectedCharges.length === 0) {
      showToast('No charges to copy', 'error')
      return
    }
    setShowArrestModal(true)
  }

  const finalizeArrest = () => {
    const text = selectedCharges.map(charge => `- ${charge.code} ${charge.description}`).join('\n')
    navigator.clipboard.writeText(text)
    
    // Calculate total fines
    const totalFines = selectedCharges.reduce((sum, charge) => {
      const fineStr = charge.fine?.replace(/[^0-9]/g, '') || '0'
      return sum + parseInt(fineStr)
    }, 0)
    
    // Add arrest record if on duty
    if (suspectName.trim()) {
      addArrestRecord(
        suspectName,
        selectedCharges.map(c => `${c.code} ${c.description}`),
        totalFines,
        suspectId.trim() || undefined
      )
    }
    
    incrementArrests()
    showToast(`${selectedCharges.length} charges copied! Arrest count increased${suspectName ? ` for ${suspectName}` : ''}`, 'success')
    
    // Reset
    setShowArrestModal(false)
    setSuspectName('')
    setSuspectId('')
  }

  const quickCopy = () => {
    const text = selectedCharges.map(charge => `- ${charge.code} ${charge.description}`).join('\n')
    navigator.clipboard.writeText(text)
    incrementArrests()
    showToast(`${selectedCharges.length} charges copied! Arrest count increased`, 'success')
    setShowArrestModal(false)
  }

  const applyChargeTemplate = (template: ChargeTemplate) => {
    const matchedCharges = allCharges.filter(charge => 
      template.chargeCodes.includes(charge.code)
    )
    const newCharges = matchedCharges.filter(c => !selectedCharges.find(sc => sc.code === c.code))
    if (newCharges.length > 0) {
      setSelectedCharges([...selectedCharges, ...newCharges])
      showToast(`Added ${newCharges.length} charges from template`, 'success')
    } else {
      showToast('All template charges already added', 'info')
    }
  }

  const saveCurrentAsTemplate = () => {
    if (!saveTemplateName.trim()) {
      showToast('Please enter a template name', 'error')
      return
    }
    if (selectedCharges.length === 0) {
      showToast('Please select charges first', 'error')
      return
    }

    const newTemplate: ChargeTemplate = {
      id: Date.now().toString(),
      name: saveTemplateName,
      description: saveTemplateDesc || 'Custom template',
      chargeCodes: selectedCharges.map(c => c.code),
    }

    saveCustomChargeTemplate(newTemplate)
    setCustomTemplates(getCustomChargeTemplates())
    setSaveTemplateName('')
    setSaveTemplateDesc('')
    showToast('Template saved!', 'success')
  }

  const deleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      deleteCustomChargeTemplate(id)
      setCustomTemplates(getCustomChargeTemplates())
      showToast('Template deleted', 'success')
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">Patrolman's Guide</h1>
        <p className="text-gray-400">
          Complete law reference including penal codes, traffic codes, and regulations.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Category Filter */}
        <div className="card p-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Codes ({data.length})
            </button>
            <button
              onClick={() => setSelectedCategory('penal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'penal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Penal Codes ({data.filter(e => e.code.startsWith('P.C.')).length})
            </button>
            <button
              onClick={() => setSelectedCategory('traffic')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'traffic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Traffic Codes ({data.filter(e => e.code.startsWith('T.C.')).length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by code, description, category, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="btn-secondary">
                Clear
              </button>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Showing {filteredData.length} of {data.length} codes
          </div>
        </div>
      </div>

      {/* Charge Templates */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-400">⚡ My Charge Templates</h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
        </div>

        {showTemplates && (
          <>
            {customTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium mb-1">No templates yet</p>
                <p className="text-sm">Select charges below and save them as a template for quick access!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customTemplates.map((template) => (
                  <div key={template.id} className="relative">
                    <button
                      onClick={() => applyChargeTemplate(template)}
                      className="w-full p-4 text-left bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg border-2 border-purple-200 dark:border-purple-800 transition-colors"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xl">⭐</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{template.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium">
                          {template.chargeCodes.length} charges
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="absolute top-2 right-2 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Charges Section */}
      {selectedCharges.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-400">Selected Charges ({selectedCharges.length})</h3>
            <div className="flex gap-2">
              <button onClick={copyAllCharges} className="btn btn-primary text-sm">
                Copy All Charges
              </button>
              <button 
                onClick={() => setSelectedCharges([])} 
                className="btn btn-secondary text-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Save as Template */}
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <p className="font-semibold text-purple-800 dark:text-purple-300">Save Current Selection as Template</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Create a reusable template with your selected charges for future use
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Template name (e.g., 'Armed Robbery', 'DUI Stop')..."
                className="input w-full"
              />
              <textarea
                value={saveTemplateDesc}
                onChange={(e) => setSaveTemplateDesc(e.target.value)}
                placeholder="Description (optional - e.g., 'Common charges for armed store robbery')..."
                className="input w-full resize-none"
                rows={2}
              />
              <button
                onClick={saveCurrentAsTemplate}
                className="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 font-medium"
                disabled={!saveTemplateName.trim()}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save as Template
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedCharges.map((charge) => (
              <div key={charge.code} className="bg-gray-800 p-3 rounded-md flex items-start justify-between">
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  <div className="col-span-2">
                    <div className="font-mono text-blue-300 text-sm font-semibold">{charge.code}</div>
                    <div className="text-gray-300 text-sm">{charge.description}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Fine</div>
                    <div className="text-green-400 text-sm">{charge.fine || '-'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Sentence</div>
                    <div className="text-yellow-400 text-sm">{charge.sentence || '-'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Stars</div>
                    <div className="text-red-400 text-sm">{charge.stars || '-'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Bail</div>
                    <div className="text-purple-400 text-sm">{charge.bail || '-'}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeCharge(charge.code)}
                  className="text-red-400 hover:text-red-300 ml-4"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-4">Loading law codes...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Fine</th>
                    <th className="px-4 py-3 text-left">Sentence</th>
                    <th className="px-4 py-3 text-left">Stars</th>
                    <th className="px-4 py-3 text-left">Bail</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((entry, index) => (
                    <tr key={index} className="table-row">
                      <td className="px-4 py-3 font-mono text-blue-300 whitespace-nowrap font-semibold">
                        {entry.code}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 uppercase">
                        {entry.category ? (
                          <span className="bg-gray-700 px-2 py-1 rounded">{entry.category.slice(0, 20)}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3 text-green-400">{entry.fine || '-'}</td>
                      <td className="px-4 py-3 text-yellow-400">{entry.sentence || '-'}</td>
                      <td className="px-4 py-3 text-red-400">{entry.stars || '-'}</td>
                      <td className="px-4 py-3 text-purple-400">{entry.bail || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate" title={entry.remarks}>
                        {entry.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleCopyRow(entry)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Copy to Clipboard"
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
                          <button
                            onClick={() => handleAddCharge(entry)}
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Add to Charges"
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
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of{' '}
                {filteredData.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Arrest Modal */}
      {showArrestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Record Arrest</h2>
            <p className="text-gray-400 mb-4">
              Enter the suspect's details to log this arrest (optional).
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Suspect Name (Optional)
                </label>
                <input
                  type="text"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="input w-full"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Suspect ID (Optional)
                </label>
                <input
                  type="text"
                  value={suspectId}
                  onChange={(e) => setSuspectId(e.target.value)}
                  placeholder="e.g., 12345"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Can be searched later to find this 10-15
                </p>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-400 mb-2">Charges to copy:</p>
              <div className="text-sm text-gray-300">
                {selectedCharges.slice(0, 3).map(c => (
                  <div key={c.code}>• {c.code}</div>
                ))}
                {selectedCharges.length > 3 && (
                  <div className="text-gray-500">... and {selectedCharges.length - 3} more</div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowArrestModal(false)}
                className="flex-1 btn bg-gray-700 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={quickCopy}
                className="flex-1 btn bg-gray-600 text-white hover:bg-gray-500"
              >
                Skip & Copy
              </button>
              <button
                onClick={finalizeArrest}
                className="flex-1 btn btn-primary"
              >
                {suspectName ? 'Log & Copy' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
