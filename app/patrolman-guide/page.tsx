'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { useDuty } from '@/contexts/DutyContext'
import { useProductivity } from '@/contexts/ProductivityContext'
import { loadAllLawData, filterLawEntries, LawEntry } from '@/utils/htmlParser'
import {
  ChargeTemplate,
  getCustomChargeTemplates,
  saveCustomChargeTemplate,
  deleteCustomChargeTemplate,
} from '@/utils/presets'

function PatrolmanGuideContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const { incrementArrests, addArrestRecord } = useDuty()
  const {
    recordRecentItem,
    pinItem,
    unpinItem,
    isItemPinned,
    createNote,
    setIsRightPanelOpen,
    setUtilityTab,
    openAssistant,
  } = useProductivity()

  const [data, setData] = useState<LawEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocType, setSelectedDocType] = useState<'all' | 'traffic' | 'penal' | 'article7'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [activeDetailEntry, setActiveDetailEntry] = useState<LawEntry | null>(null)

  // Charge collector state
  const [selectedCharges, setSelectedCharges] = useState<LawEntry[]>([])
  const [suspectName, setSuspectName] = useState('')
  const [suspectId, setSuspectId] = useState('')
  const [showArrestModal, setShowArrestModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<ChargeTemplate[]>([])
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 16

  // Load initial data and track visit
  useEffect(() => {
    loadData()
    setCustomTemplates(getCustomChargeTemplates())
    recordRecentItem({
      type: 'page',
      targetId: '/patrolman-guide',
      title: 'Patrolman Law Guide',
      subtitle: 'Traffic Code (2nd Rendition) & Penal Code',
      url: '/patrolman-guide',
    })
  }, [recordRecentItem])

  const loadData = async () => {
    setLoading(true)
    try {
      const lawData = await loadAllLawData()
      setData(lawData.allEntries)
    } catch (error) {
      console.error('Failed to load law data:', error)
      showToast('Failed to load legislation data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Deep link support via URL query (?code=...)
  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('section')
    if (codeParam && data.length > 0) {
      const match = data.find(
        (e) => e.code.toLowerCase() === codeParam.toLowerCase() || e.id === codeParam
      )
      if (match) {
        setActiveDetailEntry(match)
        recordRecentItem({
          type: 'legislation',
          targetId: match.code,
          title: match.code,
          subtitle: match.description,
        })
      }
    }
  }, [searchParams, data, recordRecentItem])

  // Extract unique categories for current document type
  const availableCategories = useMemo(() => {
    const subset =
      selectedDocType === 'all' ? data : data.filter((e) => e.documentType === selectedDocType)
    const cats = Array.from(new Set(subset.map((e) => e.category).filter(Boolean)))
    return cats
  }, [data, selectedDocType])

  // Filtered & Ranked Data
  const filteredData = useMemo(() => {
    let result = data

    // Filter by document type
    if (selectedDocType !== 'all') {
      result = result.filter((e) => e.documentType === selectedDocType)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory)
    }

    // Filter and score by search term
    if (searchTerm.trim()) {
      result = filterLawEntries(result, searchTerm)
    }

    return result
  }, [data, selectedDocType, selectedCategory, searchTerm])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // Actions
  const handleCopyProvision = (entry: LawEntry) => {
    let text = `§ ${entry.code} — ${entry.description}`
    if (entry.fine && entry.fine !== '-') text += `\nFine: ${entry.fine}`
    if (entry.sentence && entry.sentence !== '-') text += `\nSentence: ${entry.sentence}`
    if (entry.stars && entry.stars !== '-') text += `\nWanted Level: ${entry.stars}`
    if (entry.bail && entry.bail !== '-') text += `\nBail: ${entry.bail}`
    if (entry.remarks && entry.remarks !== '-') text += `\nRemarks: ${entry.remarks}`

    navigator.clipboard.writeText(text)
    recordRecentItem({
      type: 'legislation',
      targetId: entry.code,
      title: entry.code,
      subtitle: entry.description,
    })
    showToast(`Copied ${entry.code} to clipboard`, 'success')
  }

  const handleTogglePinLaw = (entry: LawEntry) => {
    const isPinned = isItemPinned('legislation', entry.code)
    if (isPinned) {
      unpinItem('legislation', entry.code)
      showToast(`Unpinned ${entry.code}`, 'info')
    } else {
      pinItem({
        type: 'legislation',
        targetId: entry.code,
        title: entry.code,
        subtitle: entry.description.slice(0, 45),
        data: {
          code: entry.code,
          description: entry.description,
          fine: entry.fine,
          sentence: entry.sentence,
          source: entry.sourceDocument,
        },
      })
      showToast(`Pinned ${entry.code} to Utility Panel`, 'success')
    }
  }

  const handleCreateNoteFromLaw = (entry: LawEntry) => {
    const noteContent = `Reference: ${entry.code} — ${entry.description}\nSource: ${entry.sourceDocument}\nFine: ${entry.fine || 'N/A'}\nSentence: ${entry.sentence || 'N/A'}\n\nCase Notes / Incident Context:\n`
    createNote({
      title: `${entry.code} - ${entry.description.slice(0, 25)}`,
      content: noteContent,
      category: entry.documentType === 'traffic' ? 'Traffic' : 'Procedure',
    })
    setIsRightPanelOpen(true)
    setUtilityTab('notes')
    showToast(`Created note for ${entry.code}`, 'success')
  }

  const handleAddCharge = (entry: LawEntry) => {
    if (!selectedCharges.find((c) => c.code === entry.code)) {
      setSelectedCharges((prev) => [...prev, entry])
      recordRecentItem({
        type: 'legislation',
        targetId: entry.code,
        title: entry.code,
        subtitle: `Selected: ${entry.description}`,
      })
      showToast(`Added charge ${entry.code}`, 'success')
    } else {
      showToast('Charge already in collector', 'info')
    }
  }

  const handleRemoveCharge = (code: string) => {
    setSelectedCharges((prev) => prev.filter((c) => c.code !== code))
  }

  const handleClearCharges = () => {
    setSelectedCharges([])
    showToast('Cleared all selected charges', 'info')
  }

  const handleCopyAllCharges = () => {
    if (selectedCharges.length === 0) return
    const text = selectedCharges.map((c) => `${c.code} ${c.description}`).join('\n')
    navigator.clipboard.writeText(text)
    incrementArrests()
    showToast(`Copied ${selectedCharges.length} charges! Arrest count updated.`, 'success')
  }

  const calculateTotals = () => {
    let totalFine = 0
    let totalSentenceMonths = 0
    let maxStars = 0
    let hasNoBail = false

    selectedCharges.forEach((c) => {
      // Parse fine
      const fineMatch = c.fine.match(/\$?([\d,]+)/)
      if (fineMatch) {
        totalFine += parseInt(fineMatch[1].replace(/,/g, ''), 10)
      }

      // Parse sentence
      const sentenceMatch = c.sentence.match(/(\d+)\s*months/i)
      if (sentenceMatch) {
        totalSentenceMonths += parseInt(sentenceMatch[1], 10)
      }

      // Parse stars
      const starCount = (c.stars.match(/⭐/g) || []).length
      if (starCount > maxStars) maxStars = starCount

      // Parse bail
      if (c.bail && c.bail.toLowerCase().includes('no bail')) {
        hasNoBail = true
      }
    })

    return { totalFine, totalSentenceMonths, maxStars, hasNoBail }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Active Source Tag & Title Banner */}
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-primary/10 text-primary border border-primary/30">
              Active Source: Traffic Code 2nd Rendition (28.07.2025)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-secondary/10 text-secondary border border-secondary/30">
              Penal Codes of San Andreas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span>⚖️</span> Legislation 2.0 & Law Reference
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 font-sans">
            Search, reference, pin, and copy penal codes and traffic regulations with charge collector.
          </p>
        </div>

        {/* Global Stats / View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-surface-container rounded border border-outline-variant p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              📋 Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              📊 Table
            </button>
          </div>

          {selectedCharges.length > 0 && (
            <button
              onClick={() => setShowArrestModal(true)}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary-container text-black font-mono text-xs font-semibold rounded flex items-center gap-1.5 shadow"
            >
              <span>📑</span> Active Charges ({selectedCharges.length})
            </button>
          )}
        </div>
      </div>

      {/* Search & Hierarchy Filter Bar */}
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by code (e.g. 2.1.1, T.C. 3.5), law description, or keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-8 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface placeholder:text-on-surface-variant font-mono text-xs sm:text-sm focus:outline-none focus:border-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">All Chapters / Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-outline-variant">
          <span className="text-[11px] font-mono uppercase text-on-surface-variant mr-1">Filter:</span>
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'traffic', label: 'Traffic Code (2nd Rendition)' },
            { id: 'penal', label: 'Penal Code' },
            { id: 'article7', label: 'Article 7 (Parking)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedDocType(tab.id as any)
                setSelectedCategory('all')
                setCurrentPage(1)
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                selectedDocType === tab.id
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charge Collector Sticky Summary (if any selected) */}
      {selectedCharges.length > 0 && (
        <div className="p-3 bg-surface-container border border-secondary/40 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="font-bold text-secondary flex items-center gap-1.5">
              <span>⚡</span> {selectedCharges.length} Charges Selected
            </span>
            <span className="text-on-surface">
              Fine: <strong className="text-secondary">${totals.totalFine.toLocaleString()}</strong>
            </span>
            <span className="text-on-surface">
              Sentence: <strong className="text-amber-400">{totals.totalSentenceMonths} months</strong>
            </span>
            {totals.maxStars > 0 && (
              <span className="text-red-400">
                {'⭐'.repeat(totals.maxStars)}
              </span>
            )}
            {totals.hasNoBail && (
              <span className="px-1.5 py-0.5 bg-red-900/50 text-red-300 border border-red-700 text-[10px] rounded">
                NO BAIL
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllCharges}
              className="px-3 py-1 bg-secondary text-black hover:bg-secondary-container text-xs font-mono font-bold rounded flex items-center gap-1"
            >
              <span>📋</span> Copy All Charges
            </button>
            <button
              onClick={() => setShowArrestModal(true)}
              className="px-2.5 py-1 bg-primary text-on-primary hover:bg-primary-container text-xs font-mono rounded"
            >
              Log Arrest
            </button>
            <button
              onClick={handleClearCharges}
              className="px-2 py-1 text-on-surface-variant hover:text-error text-xs font-mono"
              title="Clear Selected Charges"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Provisions List */}
      {loading ? (
        <div className="py-16 text-center text-on-surface-variant font-mono text-sm">
          <span className="inline-block animate-spin mr-2">⚙️</span> Loading active legislation...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-16 text-center bg-surface-container-low border border-outline-variant rounded-lg space-y-2">
          <div className="text-3xl text-on-surface-variant">🔍</div>
          <h3 className="text-base font-semibold text-on-surface">No legislation provisions found</h3>
          <p className="text-xs text-on-surface-variant font-mono">
            No matches for "{searchTerm}". Try another search term or reset filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
              setSelectedDocType('all')
            }}
            className="mt-2 px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant border border-outline-variant text-on-surface text-xs font-mono rounded"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedData.map((entry) => {
            const isPinned = isItemPinned('legislation', entry.code)
            const isChargeSelected = selectedCharges.some((c) => c.code === entry.code)

            return (
              <div
                key={entry.id}
                className={`bg-surface-container-low border rounded-lg p-4 flex flex-col justify-between transition-all ${
                  isChargeSelected
                    ? 'border-secondary shadow-md bg-secondary/5'
                    : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div>
                  {/* Top Bar: Code, Category, Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-primary/15 text-primary font-mono text-xs font-bold rounded border border-primary/30">
                        {entry.code}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-on-surface-variant truncate max-w-[150px]">
                        {entry.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAssistant(`Explain § ${entry.code} — ${entry.description}`)}
                        className="p-1 rounded text-xs text-on-surface-variant hover:text-primary transition-colors"
                        title="Ask Legislation Assistant"
                      >
                        ⚖️
                      </button>
                      <button
                        onClick={() => handleTogglePinLaw(entry)}
                        className={`p-1 rounded text-xs transition-colors ${
                          isPinned ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        title={isPinned ? 'Unpin Provision' : 'Pin to Utility Panel'}
                      >
                        📌
                      </button>
                      <button
                        onClick={() => handleCreateNoteFromLaw(entry)}
                        className="p-1 rounded text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Create Note from Provision"
                      >
                        📝
                      </button>
                    </div>
                  </div>

                  {/* Title / Description */}
                  <h3
                    onClick={() => setActiveDetailEntry(entry)}
                    className="text-sm sm:text-base font-semibold text-on-surface leading-snug cursor-pointer hover:text-primary transition-colors"
                  >
                    {entry.description}
                  </h3>

                  {/* Remarks / Details */}
                  {entry.remarks && entry.remarks !== '-' && (
                    <div className="mt-2 text-xs text-on-surface-variant font-sans bg-surface-container-lowest p-2 rounded border border-outline-variant/60">
                      {entry.remarks}
                    </div>
                  )}

                  {/* Tags: Fine, Sentence, Stars, Bail */}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs font-mono">
                    {entry.fine && entry.fine !== '-' && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-secondary border border-secondary/20">
                        Fine: {entry.fine}
                      </span>
                    )}
                    {entry.sentence && entry.sentence !== '-' && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-amber-300 border border-amber-500/20">
                        {entry.sentence}
                      </span>
                    )}
                    {entry.stars && entry.stars !== '-' && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-red-400 border border-red-500/20">
                        {entry.stars}
                      </span>
                    )}
                    {entry.bail && entry.bail !== '-' && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-purple-300 border border-purple-500/20">
                        Bail: {entry.bail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-outline-variant">
                  <span className="text-[10px] font-mono text-on-surface-variant truncate">
                    {entry.sourceDocument.includes('Traffic') ? 'Traffic Code 2nd Rend.' : 'Penal Code'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyProvision(entry)}
                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-mono rounded flex items-center gap-1 border border-outline-variant transition-colors"
                      title="Copy full legal provision"
                    >
                      <span>📋</span> Copy
                    </button>
                    <button
                      onClick={() =>
                        isChargeSelected ? handleRemoveCharge(entry.code) : handleAddCharge(entry)
                      }
                      className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
                        isChargeSelected
                          ? 'bg-error/20 text-error border border-error/30 hover:bg-error/30'
                          : 'bg-primary text-on-primary hover:bg-primary-container font-semibold'
                      }`}
                    >
                      <span>{isChargeSelected ? '✕' : '+'}</span>
                      {isChargeSelected ? 'Remove' : 'Add Charge'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-surface-container-lowest border-b border-outline-variant text-[11px] font-mono uppercase text-on-surface-variant">
              <tr>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Fine</th>
                <th className="px-3 py-2.5">Sentence</th>
                <th className="px-3 py-2.5">Stars</th>
                <th className="px-3 py-2.5">Bail</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paginatedData.map((entry) => {
                const isPinned = isItemPinned('legislation', entry.code)
                const isChargeSelected = selectedCharges.some((c) => c.code === entry.code)

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-surface-container transition-colors ${
                      isChargeSelected ? 'bg-secondary/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-primary font-bold whitespace-nowrap">
                      {entry.code}
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant uppercase text-[10px] font-mono max-w-[120px] truncate">
                      {entry.category}
                    </td>
                    <td
                      onClick={() => setActiveDetailEntry(entry)}
                      className="px-3 py-2.5 font-medium text-on-surface cursor-pointer hover:text-primary max-w-sm truncate"
                    >
                      {entry.description}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-secondary whitespace-nowrap">
                      {entry.fine || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-amber-300 whitespace-nowrap">
                      {entry.sentence || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-red-400 whitespace-nowrap">
                      {entry.stars || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-purple-300 whitespace-nowrap">
                      {entry.bail || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTogglePinLaw(entry)}
                          className={`p-1 rounded ${isPinned ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                          title="Pin"
                        >
                          📌
                        </button>
                        <button
                          onClick={() => handleCopyProvision(entry)}
                          className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                          title="Copy"
                        >
                          📋
                        </button>
                        <button
                          onClick={() =>
                            isChargeSelected ? handleRemoveCharge(entry.code) : handleAddCharge(entry)
                          }
                          className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                            isChargeSelected
                              ? 'bg-error/20 text-error'
                              : 'bg-primary text-on-primary'
                          }`}
                        >
                          {isChargeSelected ? 'Remove' : '+ Charge'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-mono text-on-surface-variant">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} provisions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-surface-container rounded border border-outline-variant text-on-surface disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-surface-container rounded border border-outline-variant text-on-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal for Selected Provision */}
      {activeDetailEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-brightness-75 animate-fadeIn"
          onClick={() => setActiveDetailEntry(null)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/20 text-primary font-mono text-xs font-bold rounded border border-primary/40">
                  {activeDetailEntry.code}
                </span>
                <span className="text-xs font-mono text-on-surface-variant uppercase">
                  {activeDetailEntry.category}
                </span>
              </div>
              <button
                onClick={() => setActiveDetailEntry(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-xs font-mono text-on-surface-variant">
                Source Document: <span className="text-secondary">{activeDetailEntry.sourceDocument}</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-on-surface">
                  {activeDetailEntry.description}
                </h3>
              </div>

              {activeDetailEntry.remarks && (
                <div className="p-3 bg-surface-container border border-outline-variant rounded text-xs text-on-surface leading-relaxed">
                  <div className="font-mono text-[10px] uppercase text-on-surface-variant mb-1 font-bold">
                    Legal Text / Provisions:
                  </div>
                  {activeDetailEntry.remarks}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-surface-container rounded border border-outline-variant">
                  <div className="text-[10px] text-on-surface-variant">FINE</div>
                  <div className="font-bold text-secondary mt-0.5">{activeDetailEntry.fine || '-'}</div>
                </div>
                <div className="p-2 bg-surface-container rounded border border-outline-variant">
                  <div className="text-[10px] text-on-surface-variant">SENTENCE</div>
                  <div className="font-bold text-amber-300 mt-0.5">{activeDetailEntry.sentence || '-'}</div>
                </div>
                <div className="p-2 bg-surface-container rounded border border-outline-variant">
                  <div className="text-[10px] text-on-surface-variant">WANTED STARS</div>
                  <div className="font-bold text-red-400 mt-0.5">{activeDetailEntry.stars || '-'}</div>
                </div>
                <div className="p-2 bg-surface-container rounded border border-outline-variant">
                  <div className="text-[10px] text-on-surface-variant">BAIL</div>
                  <div className="font-bold text-purple-300 mt-0.5">{activeDetailEntry.bail || '-'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant">
                <button
                  onClick={() => {
                    openAssistant(`Explain § ${activeDetailEntry.code} — ${activeDetailEntry.description}`)
                    setActiveDetailEntry(null)
                  }}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-mono font-semibold rounded flex items-center gap-1.5"
                >
                  <span>⚖️</span> Ask Assistant
                </button>
                <button
                  onClick={() => handleCopyProvision(activeDetailEntry)}
                  className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-mono font-semibold rounded border border-outline-variant flex items-center gap-1.5"
                >
                  <span>📋</span> Copy Provision
                </button>
                <button
                  onClick={() => handleTogglePinLaw(activeDetailEntry)}
                  className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-mono font-semibold rounded border border-outline-variant flex items-center gap-1.5"
                >
                  <span>📌</span> {isItemPinned('legislation', activeDetailEntry.code) ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => handleCreateNoteFromLaw(activeDetailEntry)}
                  className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-mono font-semibold rounded border border-outline-variant flex items-center gap-1.5"
                >
                  <span>📝</span> Add Note
                </button>
                <button
                  onClick={() => {
                    handleAddCharge(activeDetailEntry)
                    setActiveDetailEntry(null)
                  }}
                  className="px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container text-xs font-mono font-semibold rounded flex items-center gap-1.5 ml-auto"
                >
                  <span>⚡</span> Add to Charges
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arrest / Charge Logging Modal */}
      {showArrestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-brightness-75 animate-fadeIn"
          onClick={() => setShowArrestModal(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl p-5 text-on-surface space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span>📑</span> Complete Arrest Record
              </h3>
              <button
                onClick={() => setShowArrestModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  Suspect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  Suspect ID / Passport
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={suspectId}
                  onChange={(e) => setSuspectId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 bg-surface-container rounded border border-outline-variant space-y-1.5 text-xs font-mono">
                <div className="font-bold text-on-surface">Selected Charges ({selectedCharges.length}):</div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-on-surface-variant">
                  {selectedCharges.map((c) => (
                    <div key={c.code} className="flex justify-between items-center text-[11px]">
                      <span>{c.code} {c.description}</span>
                      <button
                        onClick={() => handleRemoveCharge(c.code)}
                        className="text-error ml-2 hover:underline"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <button
                onClick={() => setShowArrestModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!suspectName.trim()) {
                    showToast('Please enter a suspect name', 'warning')
                    return
                  }
                  addArrestRecord(
                    suspectName,
                    selectedCharges.map((c) => c.code),
                    totals.totalFine,
                    suspectId
                  )
                  incrementArrests()
                  showToast('Arrest record logged successfully!', 'success')
                  setSelectedCharges([])
                  setSuspectName('')
                  setSuspectId('')
                  setShowArrestModal(false)
                }}
                className="px-4 py-1.5 bg-primary text-on-primary font-mono text-xs font-semibold rounded hover:bg-primary-container"
              >
                Save & Log Arrest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatrolmanGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-on-surface-variant font-mono text-sm">
          <span className="inline-block animate-spin mr-2">⚙️</span> Loading Legislation 2.0...
        </div>
      }
    >
      <PatrolmanGuideContent />
    </Suspense>
  )
}
