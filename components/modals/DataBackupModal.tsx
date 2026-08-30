'use client'

import React, { useState, useRef } from 'react'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useToast } from '@/components/ToastProvider'
import {
  exportAllData,
  validateBackupJson,
  importBackupData,
  clearAllLocalProductivityData,
} from '@/utils/db'

interface DataBackupModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DataBackupModal({ isOpen, onClose }: DataBackupModalProps) {
  const { showToast } = useToast()
  const { notes, pinnedItems, quickAccessItems } = useProductivity()
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)
  const [isConfirmingReplace, setIsConfirmingReplace] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleExport = async () => {
    try {
      await exportAllData()
      showToast('Backup JSON exported successfully!', 'success')
    } catch (e) {
      showToast('Failed to export data backup', 'error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
    }
  }

  const handleImportSubmit = async () => {
    if (!importFile) {
      showToast('Please select a backup file first', 'warning')
      return
    }

    if (importMode === 'replace' && !isConfirmingReplace) {
      setIsConfirmingReplace(true)
      return
    }

    setIsProcessing(true)
    try {
      const text = await importFile.text()
      const validation = await validateBackupJson(text)

      if (!validation.valid || !validation.backup) {
        showToast(validation.error || 'Invalid backup file', 'error')
        setIsProcessing(false)
        setIsConfirmingReplace(false)
        return
      }

      const result = await importBackupData(validation.backup, importMode)
      showToast(
        `Imported successfully (${result.notesCount} notes, ${result.quickAccessCount} shortcuts, ${result.pinnedCount} pins, ${result.finesCount || 0} fines, ${result.arrestsCount || 0} arrests). Refreshing...`,
        'success'
      )

      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (e) {
      showToast('Failed to process backup file', 'error')
      setIsProcessing(false)
      setIsConfirmingReplace(false)
    }
  }

  const handleClearData = async () => {
    try {
      await clearAllLocalProductivityData()
      showToast('Local productivity data cleared successfully.', 'info')
      setTimeout(() => {
        window.location.reload()
      }, 600)
    } catch (e) {
      showToast('Failed to clear data', 'error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-brightness-75 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">💾</span>
            <h3 className="font-semibold text-base text-on-surface">Local Data & Backup</h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status info */}
          <div className="p-3 bg-surface-container border border-outline-variant rounded flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>Local-First Storage</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                {notes.length} Notes • {quickAccessItems.length} Shortcuts • {pinnedItems.length} Pinned
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase bg-secondary/10 text-secondary px-2 py-0.5 rounded border border-secondary/30">
              100% Offline
            </span>
          </div>

          {/* Export Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase text-on-surface tracking-wider">
              1. Export Data Backup
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Download a portable JSON file containing your officer notes, shortcuts, pinned items, and history.
            </p>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold rounded flex items-center gap-2 transition-colors"
            >
              <span>📥</span> Export Backup JSON
            </button>
          </div>

          <hr className="border-outline-variant" />

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-on-surface tracking-wider">
              2. Import / Restore Backup
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Restore previously exported notes and shortcuts from a valid LEO-GRP JSON backup.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full text-xs font-mono text-on-surface file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-surface-container-high file:text-on-surface hover:file:bg-surface-variant cursor-pointer"
            />

            {importFile && (
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-mono uppercase text-on-surface-variant block">
                  Import Mode:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-mono text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => {
                        setImportMode('merge')
                        setIsConfirmingReplace(false)
                      }}
                      className="accent-primary"
                    />
                    <span>Merge with existing (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-mono text-error cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-error"
                    />
                    <span>Replace all</span>
                  </label>
                </div>

                {isConfirmingReplace && (
                  <div className="p-3 bg-error-container/30 border border-error/50 rounded text-xs text-error animate-fadeIn">
                    <p className="font-semibold mb-1">⚠️ Warning: Replace Local Data?</p>
                    <p className="text-[11px] text-on-surface-variant">
                      This will replace all your current notes, shortcuts, and pins with the backup.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleImportSubmit}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant border border-outline-variant text-on-surface font-mono text-xs font-semibold rounded flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>📤</span> {isProcessing ? 'Importing...' : isConfirmingReplace ? 'Confirm Replace & Import' : 'Import Backup'}
                </button>
              </div>
            )}
          </div>

          <hr className="border-outline-variant" />

          {/* Clear Local Data */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase text-error tracking-wider">
              3. Clear Local Data
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Permanently remove all locally stored notes, shortcuts, and pins on this device.
            </p>

            {!isConfirmingClear ? (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="px-3 py-1.5 text-xs font-mono text-error hover:bg-error-container/20 border border-error/40 rounded transition-colors"
              >
                Clear Local Data...
              </button>
            ) : (
              <div className="p-3 bg-surface-container-highest border border-error/40 rounded space-y-3 animate-fadeIn">
                <p className="text-xs font-semibold text-on-surface">
                  Clear LEO-GRP Local Data?
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  This will permanently delete your notes, pins, and shortcuts from IndexedDB. Your profile loadouts and duty logs will not be affected.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleExport}
                    className="px-3 py-1 text-xs font-mono bg-primary hover:bg-primary-container text-on-primary rounded"
                  >
                    Export First (Recommended)
                  </button>
                  <button
                    onClick={handleClearData}
                    className="px-3 py-1 text-xs font-mono bg-error text-on-error rounded hover:bg-error-container"
                  >
                    Clear Data
                  </button>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="px-3 py-1 text-xs font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
