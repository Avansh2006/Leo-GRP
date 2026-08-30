'use client'

import React, { useState, useMemo } from 'react'
import { useProductivity } from '@/contexts/ProductivityContext'
import { Note } from '@/utils/db'

export default function NotesPanel() {
  const {
    notes,
    activeNote,
    setActiveNote,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    saveStatus,
  } = useProductivity()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)

  const categories = ['All', 'General', 'Traffic', 'Arrest', 'Pursuit', 'Procedure', 'Personal']

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory
      const matchesSearch =
        !searchTerm.trim() ||
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.category.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [notes, searchTerm, selectedCategory])

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return `${diffDays}d ago`
    } catch {
      return ''
    }
  }

  // If a note is currently being edited
  if (activeNote) {
    return (
      <div className="flex flex-col h-full bg-surface-container-low text-on-surface">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant bg-surface-container-lowest">
          <button
            onClick={() => setActiveNote(null)}
            className="flex items-center gap-1 text-xs font-mono text-on-surface-variant hover:text-primary transition-colors"
          >
            <span>←</span> Back to Notes
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-on-surface-variant">
              {saveStatus === 'saving' && <span className="text-tertiary">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-secondary">✓ Saved</span>}
            </span>
            <button
              onClick={() => togglePinNote(activeNote.id)}
              className={`p-1 rounded text-sm transition-colors ${
                activeNote.pinned
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title={activeNote.pinned ? 'Unpin Note' : 'Pin Note'}
            >
              📌
            </button>
            <button
              onClick={() => setNoteToDelete(activeNote)}
              className="p-1 text-xs text-error hover:bg-error-container/20 rounded transition-colors"
              title="Delete Note"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex flex-col p-3 gap-2 overflow-y-auto">
          {/* Note Title */}
          <input
            type="text"
            className="w-full bg-transparent border-b border-outline-variant/60 pb-1 font-headline-md text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            placeholder="Note Title..."
            value={activeNote.title}
            onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
            autoFocus
          />

          {/* Category Selector */}
          <div className="flex items-center gap-2 py-1">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase">Category:</span>
            <select
              value={activeNote.category}
              onChange={(e) => updateNote(activeNote.id, { category: e.target.value })}
              className="bg-surface-dim border border-outline-variant text-[11px] font-mono text-on-surface rounded px-2 py-0.5 focus:outline-none focus:border-primary"
            >
              {categories.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Note Content Textarea */}
          <textarea
            className="flex-1 w-full bg-surface-dim border border-outline-variant text-on-surface font-mono text-xs rounded p-2.5 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 leading-relaxed"
            placeholder="Write tactical notes, suspect descriptions, license plates, reminders..."
            value={activeNote.content}
            onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
          />
        </div>

        {/* Delete Confirmation Modal inside Panel */}
        {noteToDelete && (
          <div className="p-3 bg-surface-container-highest border-t border-outline-variant animate-fadeIn">
            <p className="text-xs text-on-surface font-medium mb-2">Delete this note?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNoteToDelete(null)}
                className="px-2.5 py-1 text-xs font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteNote(noteToDelete.id)
                  setNoteToDelete(null)
                }}
                className="px-2.5 py-1 text-xs font-mono font-semibold bg-error text-on-error rounded hover:bg-error-container"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Note List View
  return (
    <div className="flex flex-col h-full bg-surface-container-low text-on-surface">
      {/* Top action header */}
      <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
        <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          OFFICER NOTEBOOK ({notes.length})
        </span>
        <button
          onClick={() => createNote({ title: 'New Note' })}
          className="flex items-center gap-1 text-xs font-mono font-semibold text-primary hover:text-primary-container px-2 py-0.5 rounded hover:bg-surface-container transition-colors"
        >
          <span>+</span> New Note
        </button>
      </div>

      {/* Search and Category filters */}
      <div className="p-2.5 border-b border-outline-variant flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-surface-dim border border-outline-variant text-on-surface font-mono text-xs rounded pl-7 pr-2.5 py-1.5 focus:outline-none focus:border-primary placeholder:text-on-surface-variant"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-2 top-2 text-on-surface-variant text-xs">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1.5 text-on-surface-variant hover:text-on-surface text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {filteredNotes.length === 0 ? (
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl text-on-surface-variant">📝</span>
            <div className="font-semibold text-sm text-on-surface">No notes yet</div>
            <p className="text-xs text-on-surface-variant max-w-[200px]">
              Create a note to keep procedures, reminders and useful information close at hand.
            </p>
            <button
              onClick={() => createNote({ title: 'New Note' })}
              className="mt-2 px-3 py-1 text-xs font-mono font-semibold bg-primary hover:bg-primary-container text-on-primary rounded transition-colors"
            >
              + New Note
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setActiveNote(note)}
              className="p-2.5 border border-outline-variant rounded bg-surface-dim hover:border-primary hover:bg-surface-container transition-all cursor-pointer group flex flex-col gap-1 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  {note.pinned && <span className="text-primary text-xs flex-shrink-0">📌</span>}
                  <span className="font-semibold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                    {note.title || 'Untitled Note'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant flex-shrink-0">
                  {formatRelativeTime(note.updatedAt)}
                </span>
              </div>

              {note.content && (
                <p className="font-mono text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                  {note.content}
                </p>
              )}

              <div className="flex items-center justify-between mt-1 pt-1 border-t border-outline-variant/40">
                <span className="text-[9px] font-mono uppercase text-on-surface-variant px-1.5 py-0.2 bg-surface-container rounded">
                  {note.category}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePinNote(note.id)
                    }}
                    className="p-1 hover:text-primary text-xs"
                    title={note.pinned ? 'Unpin Note' : 'Pin Note'}
                  >
                    📌
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setNoteToDelete(note)
                    }}
                    className="p-1 hover:text-error text-xs"
                    title="Delete Note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="p-3 bg-surface-container-highest border-t border-outline-variant animate-fadeIn">
          <p className="text-xs text-on-surface font-medium mb-2">Delete "{noteToDelete.title || 'Untitled'}"?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setNoteToDelete(null)}
              className="px-2.5 py-1 text-xs font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteNote(noteToDelete.id)
                setNoteToDelete(null)
              }}
              className="px-2.5 py-1 text-xs font-mono font-semibold bg-error text-on-error rounded hover:bg-error-container"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
