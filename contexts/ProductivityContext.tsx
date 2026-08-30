'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import {
  Note,
  QuickAccessItem,
  PinnedItem,
  RecentItem,
  getAllNotes,
  saveNote as dbSaveNote,
  deleteNote as dbDeleteNote,
  getQuickAccessItems,
  saveQuickAccessItem as dbSaveQAItem,
  saveQuickAccessList as dbSaveQAList,
  deleteQuickAccessItem as dbDeleteQAItem,
  getAllPinnedItems,
  savePinnedItem as dbSavePinned,
  deletePinnedItem as dbDeletePinned,
  getRecentItems,
  addRecentItem as dbAddRecent,
  clearRecentItems as dbClearRecent,
} from '@/utils/db'

interface ProductivityContextType {
  // Notes
  notes: Note[]
  activeNote: Note | null
  setActiveNote: (note: Note | null) => void
  createNote: (initial?: Partial<Note>) => Note
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => Promise<void>
  togglePinNote: (id: string) => Promise<void>
  saveStatus: 'idle' | 'saving' | 'saved'

  // Quick Access
  quickAccessItems: QuickAccessItem[]
  addQuickAccessItem: (item: Omit<QuickAccessItem, 'id' | 'position' | 'createdAt'>) => Promise<void>
  removeQuickAccessItem: (id: string) => Promise<void>
  reorderQuickAccess: (id: string, direction: 'up' | 'down') => Promise<void>

  // Pinned Items
  pinnedItems: PinnedItem[]
  pinItem: (item: Omit<PinnedItem, 'id' | 'position' | 'createdAt'>) => Promise<void>
  unpinItem: (type: string, targetId: string) => Promise<void>
  isItemPinned: (type: string, targetId: string) => boolean

  // Recent Items
  recentItems: RecentItem[]
  recordRecentItem: (item: Omit<RecentItem, 'id' | 'timestamp'>) => Promise<void>
  clearAllRecentItems: () => Promise<void>

  // UI state for Right Panel & Modals
  utilityTab: 'notes' | 'pinned' | 'recent'
  setUtilityTab: (tab: 'notes' | 'pinned' | 'recent') => void
  isRightPanelOpen: boolean
  setIsRightPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  toggleRightPanel: () => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
  isAddShortcutOpen: boolean
  setIsAddShortcutOpen: React.Dispatch<React.SetStateAction<boolean>>
  isBackupModalOpen: boolean
  setIsBackupModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  isAssistantOpen: boolean
  setIsAssistantOpen: React.Dispatch<React.SetStateAction<boolean>>
  assistantInitialQuery: string
  setAssistantInitialQuery: (q: string) => void
  openAssistant: (initialQuery?: string) => void
}

const ProductivityContext = createContext<ProductivityContextType | undefined>(undefined)

export function ProductivityProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([])
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // UI States with local storage preference
  const [utilityTab, setUtilityTabState] = useState<'notes' | 'pinned' | 'recent'>('notes')
  const [isRightPanelOpen, setIsRightPanelOpenState] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [assistantInitialQuery, setAssistantInitialQuery] = useState('')

  const openAssistant = useCallback((initialQuery = '') => {
    setAssistantInitialQuery(initialQuery)
    setIsAssistantOpen(true)
  }, [])

  // Debounce timer ref for note autosave
  const noteSaveTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Load initial data
  useEffect(() => {
    // Load persisted UI preferences
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('leogrp_utility_tab') as 'notes' | 'pinned' | 'recent' | null
      if (savedTab && ['notes', 'pinned', 'recent'].includes(savedTab)) {
        setUtilityTabState(savedTab)
      }

      const savedPanel = localStorage.getItem('leogrp_right_panel_open')
      if (savedPanel !== null) {
        setIsRightPanelOpenState(savedPanel === 'true')
      } else {
        // Default to open on desktop
        setIsRightPanelOpenState(window.innerWidth >= 1280)
      }
    }

    // Load data from IndexedDB
    getAllNotes().then(setNotes).catch(console.error)
    getQuickAccessItems().then(setQuickAccessItems).catch(console.error)
    getAllPinnedItems().then(setPinnedItems).catch(console.error)
    getRecentItems().then(setRecentItems).catch(console.error)
  }, [])

  const setUtilityTab = (tab: 'notes' | 'pinned' | 'recent') => {
    setUtilityTabState(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem('leogrp_utility_tab', tab)
    }
  }

  const setIsRightPanelOpen = (action: boolean | ((prev: boolean) => boolean)) => {
    setIsRightPanelOpenState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action
      if (typeof window !== 'undefined') {
        localStorage.setItem('leogrp_right_panel_open', String(next))
      }
      return next
    })
  }

  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => !prev)
  }

  // -------------------------------------------------------------
  // NOTES LOGIC
  // -------------------------------------------------------------

  const createNote = useCallback((initial?: Partial<Note>): Note => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: initial?.title || '',
      content: initial?.content || '',
      category: initial?.category || 'General',
      pinned: initial?.pinned || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setNotes((prev) => [newNote, ...prev])
    setActiveNote(newNote)
    dbSaveNote(newNote).catch(console.error)

    // Open right panel and switch to notes tab
    setIsRightPanelOpen(true)
    setUtilityTab('notes')

    return newNote
  }, [])

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setSaveStatus('saving')

    setNotes((prev) => {
      const updatedList = prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, ...updates, updatedAt: new Date().toISOString() }
          if (activeNote?.id === id) {
            setActiveNote(updated)
          }
          return updated
        }
        return n
      })

      // Resort pinned first, then updatedAt
      return [...updatedList].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    })

    // Clear existing timer
    if (noteSaveTimers.current[id]) {
      clearTimeout(noteSaveTimers.current[id])
    }

    // Debounce save to IndexedDB by 400ms
    noteSaveTimers.current[id] = setTimeout(async () => {
      const currentNotes = await getAllNotes()
      const noteToSave = currentNotes.find((n) => n.id === id) || {
        ...activeNote,
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      }
      if (noteToSave) {
        await dbSaveNote(noteToSave as Note)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      }
    }, 400)
  }, [activeNote])

  const deleteNote = useCallback(async (id: string) => {
    if (noteSaveTimers.current[id]) {
      clearTimeout(noteSaveTimers.current[id])
      delete noteSaveTimers.current[id]
    }

    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (activeNote?.id === id) {
      setActiveNote(null)
    }

    // Also unpin if pinned
    await dbDeletePinned(`pin-note-${id}`).catch(() => {})
    setPinnedItems((prev) => prev.filter((p) => !(p.type === 'note' && p.targetId === id)))

    await dbDeleteNote(id)
  }, [activeNote])

  const togglePinNote = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return

    const newPinned = !note.pinned
    const updatedNote = { ...note, pinned: newPinned, updatedAt: new Date().toISOString() }

    setNotes((prev) => {
      const list = prev.map((n) => (n.id === id ? updatedNote : n))
      return [...list].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    })

    if (activeNote?.id === id) {
      setActiveNote(updatedNote)
    }

    await dbSaveNote(updatedNote)

    if (newPinned) {
      const pinItem: PinnedItem = {
        id: `pin-note-${id}`,
        type: 'note',
        targetId: id,
        title: note.title || 'Untitled Note',
        subtitle: note.category || 'General',
        position: 0,
        createdAt: new Date().toISOString(),
      }
      await dbSavePinned(pinItem)
      setPinnedItems((prev) => [pinItem, ...prev.filter((p) => p.targetId !== id)])
    } else {
      await dbDeletePinned(`pin-note-${id}`).catch(() => {})
      setPinnedItems((prev) => prev.filter((p) => !(p.type === 'note' && p.targetId === id)))
    }
  }, [notes, activeNote])

  // -------------------------------------------------------------
  // QUICK ACCESS LOGIC
  // -------------------------------------------------------------

  const addQuickAccessItem = useCallback(
    async (item: Omit<QuickAccessItem, 'id' | 'position' | 'createdAt'>) => {
      const newItem: QuickAccessItem = {
        ...item,
        id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: quickAccessItems.length,
        createdAt: new Date().toISOString(),
      }

      const updated = [...quickAccessItems, newItem]
      setQuickAccessItems(updated)
      await dbSaveQAList(updated)
    },
    [quickAccessItems]
  )

  const removeQuickAccessItem = useCallback(async (id: string) => {
    setQuickAccessItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      const reindexed = filtered.map((item, index) => ({ ...item, position: index }))
      dbSaveQAList(reindexed).catch(console.error)
      return reindexed
    })
    await dbDeleteQAItem(id)
  }, [])

  const reorderQuickAccess = useCallback(async (id: string, direction: 'up' | 'down') => {
    setQuickAccessItems((prev) => {
      const index = prev.findIndex((i) => i.id === id)
      if (index === -1) return prev

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const items = [...prev]
      const [moved] = items.splice(index, 1)
      items.splice(targetIndex, 0, moved)

      const reindexed = items.map((item, idx) => ({ ...item, position: idx }))
      dbSaveQAList(reindexed).catch(console.error)
      return reindexed
    })
  }, [])

  // -------------------------------------------------------------
  // PINNED ITEMS LOGIC
  // -------------------------------------------------------------

  const pinItem = useCallback(
    async (item: Omit<PinnedItem, 'id' | 'position' | 'createdAt'>) => {
      const pinId = `pin-${item.type}-${item.targetId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      const newPin: PinnedItem = {
        ...item,
        id: pinId,
        position: 0,
        createdAt: new Date().toISOString(),
      }

      setPinnedItems((prev) => {
        const filtered = prev.filter((p) => !(p.type === item.type && p.targetId === item.targetId))
        return [newPin, ...filtered]
      })

      await dbSavePinned(newPin)
    },
    []
  )

  const unpinItem = useCallback(async (type: string, targetId: string) => {
    const pinId = `pin-${type}-${targetId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    setPinnedItems((prev) => prev.filter((p) => !(p.type === type && p.targetId === targetId)))
    await dbDeletePinned(pinId).catch(() => {})

    // If it's a note, update the note's pinned boolean
    if (type === 'note') {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id === targetId) {
            const updated = { ...n, pinned: false }
            dbSaveNote(updated).catch(console.error)
            return updated
          }
          return n
        })
      )
    }
  }, [])

  const isItemPinned = useCallback(
    (type: string, targetId: string) => {
      return pinnedItems.some((p) => p.type === type && p.targetId === targetId)
    },
    [pinnedItems]
  )

  // -------------------------------------------------------------
  // RECENT ITEMS LOGIC
  // -------------------------------------------------------------

  const recordRecentItem = useCallback(
    async (item: Omit<RecentItem, 'id' | 'timestamp'>) => {
      const recent: RecentItem = {
        ...item,
        id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      }

      setRecentItems((prev) => {
        const filtered = prev.filter((r) => !(r.type === item.type && r.targetId === item.targetId))
        return [recent, ...filtered].slice(0, 30)
      })

      await dbAddRecent(recent)
    },
    []
  )

  const clearAllRecentItems = useCallback(async () => {
    setRecentItems([])
    await dbClearRecent()
  }, [])

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ProductivityContext.Provider
      value={{
        notes,
        activeNote,
        setActiveNote,
        createNote,
        updateNote,
        deleteNote,
        togglePinNote,
        saveStatus,
        quickAccessItems,
        addQuickAccessItem,
        removeQuickAccessItem,
        reorderQuickAccess,
        pinnedItems,
        pinItem,
        unpinItem,
        isItemPinned,
        recentItems,
        recordRecentItem,
        clearAllRecentItems,
        utilityTab,
        setUtilityTab,
        isRightPanelOpen,
        setIsRightPanelOpen,
        toggleRightPanel,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isAddShortcutOpen,
        setIsAddShortcutOpen,
        isBackupModalOpen,
        setIsBackupModalOpen,
        isAssistantOpen,
        setIsAssistantOpen,
        assistantInitialQuery,
        setAssistantInitialQuery,
        openAssistant,
      }}
    >
      {children}
    </ProductivityContext.Provider>
  )
}

export function useProductivity() {
  const context = useContext(ProductivityContext)
  if (!context) {
    throw new Error('useProductivity must be used within a ProductivityProvider')
  }
  return context
}
