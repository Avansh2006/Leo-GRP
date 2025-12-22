'use client'

import { useState, useEffect } from 'react'
import CopyButton from '@/components/CopyButton'
import { useToast } from '@/components/ToastProvider'
import { useDuty } from '@/contexts/DutyContext'
import { loadAllLawData, filterLawEntries, LawEntry } from '@/utils/htmlParser'

export default function PatrolmanGuidePage() {
  const { showToast } = useToast()
  const { incrementArrests } = useDuty()
  const [data, setData] = useState<LawEntry[]>([])
  const [filteredData, setFilteredData] = useState<LawEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCharges, setSelectedCharges] = useState<LawEntry[]>([])
  const itemsPerPage = 20

  useEffect(() => {
    loadData()
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
    const text = selectedCharges.map(charge => `- ${charge.code} ${charge.description}`).join('\n')
    navigator.clipboard.writeText(text)
    incrementArrests()
    showToast(`${selectedCharges.length} charges copied! Arrest count increased`, 'success')
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
    </div>
  )
}
