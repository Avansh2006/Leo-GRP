'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useDuty } from '@/contexts/DutyContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useToast } from '@/components/ToastProvider'
import { loadAllLawData, LawEntry } from '@/utils/htmlParser'

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: 'Actions' | 'Pages' | 'Commands' | 'Legislation' | 'Notes' | 'Quick Access' | 'Pinned' | 'Recent'
  icon: string
  action: () => void
  keywords?: string[]
  score?: number
}

export default function CommandPaletteModal() {
  const router = useRouter()
  const { showToast } = useToast()
  const { toggleTheme } = useTheme()
  const { profile, setIsProfileEditModalOpen } = useUserProfile()
  const {
    activeDetention,
    setIsArrestCommandCenterOpen,
    currentOrganization,
    setCurrentOrganization,
  } = useDuty()
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    notes,
    setActiveNote,
    createNote,
    isRightPanelOpen,
    setIsRightPanelOpen,
    toggleRightPanel,
    setUtilityTab,
    quickAccessItems,
    pinnedItems,
    recentItems,
    setIsAddShortcutOpen,
    setIsBackupModalOpen,
    recordRecentItem,
    openAssistant,
  } = useProductivity()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lawEntries, setLawEntries] = useState<LawEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for both Ctrl+K and Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsCommandPaletteOpen])

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 40)

      // Lazy load laws for search
      if (lawEntries.length === 0) {
        loadAllLawData()
          .then((res) => setLawEntries(res.allEntries))
          .catch(() => {})
      }
    }
  }, [isCommandPaletteOpen, lawEntries.length])

  // Real commands from the application dynamically built for current organization
  const appCommands: PaletteItem[] = useMemo(() => {
    const org = currentOrganization || 'LSPD'
    return [
      {
        id: 'cmd-grandpro-save-1',
        title: 'Save Bodycam to SD Card (GrandPro)',
        subtitle: `/me saves bodycam to SD Card, ejects from GrandPro, inserts it into phone, uploads to ${org} Cloud Servers.`,
        category: 'Commands',
        icon: '🔴',
        keywords: ['grandpro', 'sd card', 'save', 'saving', 'bodycam', 'cloud', 'upload', org.toLowerCase()],
        action: () => {
          const text = `/me saves bodycam to SD Card, ejects from GrandPro, inserts it into phone, uploads to ${org} Cloud Servers.`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Save Bodycam to SD Card (GrandPro)',
            subtitle: text,
          })
          showToast('Command copied: GrandPro Save Bodycam', 'success')
        },
      },
      {
        id: 'cmd-grandpro-save-2',
        title: 'Insert New SD Card (GrandPro)',
        subtitle: '/do insert new SD card into GrandPro and it is recording',
        category: 'Commands',
        icon: '🔴',
        keywords: ['grandpro', 'sd card', 'insert', 'recording', 'new'],
        action: () => {
          const text = '/do insert new SD card into GrandPro and it is recording'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Insert New SD Card (GrandPro)',
            subtitle: text,
          })
          showToast('Command copied: GrandPro Insert SD Card', 'success')
        },
      },
      {
        id: 'cmd-grandpro-save-3',
        title: 'Download Bodycam to SD Card (GrandPro)',
        subtitle: `/do put SD Card into phone, connects to ${org} Cloud Servers, downloads Bodycam on SD Card`,
        category: 'Commands',
        icon: '🔴',
        keywords: ['grandpro', 'sd card', 'phone', 'download', 'bodycam', 'cloud', org.toLowerCase()],
        action: () => {
          const text = `/do put SD Card into phone, connects to ${org} Cloud Servers, downloads Bodycam on SD Card`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Download Bodycam to SD Card (GrandPro)',
            subtitle: text,
          })
          showToast('Command copied: GrandPro Download Bodycam', 'success')
        },
      },
      {
        id: 'cmd-attach-uniform',
        title: 'Attach Bodycam (Uniform)',
        subtitle: '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof',
        category: 'Commands',
        icon: '📹',
        keywords: ['bodycam', 'attach', 'uniform', 'recording', 'vest'],
        action: () => {
          const text = '/me Takes out bodycam, attaches it to chest, checks its ballistic, water proof'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Attach Bodycam (Uniform)',
            subtitle: text,
          })
          showToast('Command copied: Attach Bodycam (Uniform)', 'success')
        },
      },
      {
        id: 'cmd-attach-undercover',
        title: 'Attach Bodycam (Undercover)',
        subtitle: '/me takes out bodycam and attaches it to belt, hides it, checks its ballistic and water proof',
        category: 'Commands',
        icon: '🕵️',
        keywords: ['bodycam', 'undercover', 'belt', 'hide', 'covert'],
        action: () => {
          const text = '/me takes out bodycam and attaches it to belt, hides it, checks its ballistic and water proof'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Attach Bodycam (Undercover)',
            subtitle: text,
          })
          showToast('Command copied: Attach Bodycam (Undercover)', 'success')
        },
      },
      {
        id: 'cmd-refresh-bodycam',
        title: 'Refresh Bodycam',
        subtitle: '/me refreshing bodycam (POV restart)',
        category: 'Commands',
        icon: '🔄',
        keywords: ['refresh', 'bodycam', 'restart', 'pov'],
        action: () => {
          const text = '/me refreshing bodycam\n/do It is recording.'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Refresh Bodycam',
            subtitle: text,
          })
          showToast('Command copied: Refresh Bodycam', 'success')
        },
      },
      {
        id: 'cmd-save-situation',
        title: `Save Situation (${org} Cloud)`,
        subtitle: `/me saves bodycam, uploads it to the ${org} Cloud and continues recording`,
        category: 'Commands',
        icon: '💾',
        keywords: ['save', 'cloud', 'bodycam', 'situation', org.toLowerCase()],
        action: () => {
          const text = `/me saves bodycam, uploads it to the ${org} Cloud and continues recording`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: `Save Situation (${org})`,
            subtitle: text,
          })
          showToast('Command copied: Save Situation', 'success')
        },
      },
      {
        id: 'cmd-miranda-rights',
        title: 'Miranda Rights Warning',
        subtitle: '/me reads Miranda Rights: You have the right to remain silent...',
        category: 'Commands',
        icon: '⚖️',
        keywords: ['miranda', 'rights', 'arrest', 'warning', 'lawyer', 'silent'],
        action: () => {
          const text = '/me reads Miranda Rights: You have the right to remain silent. Anything you say can and will be used against you in a court of law. You have the right to an attorney. If you cannot afford one, one will be provided for you. Do you understand these rights as they have been read to you?'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Miranda Rights',
            subtitle: text,
          })
          showToast('Command copied: Miranda Rights', 'success')
        },
      },
      {
        id: 'cmd-show-badge',
        title: 'Show Official Badge & ID',
        subtitle: '/me reaches into pocket, shows badge and official identification',
        category: 'Commands',
        icon: '🛡️',
        keywords: ['badge', 'id', 'show', 'identification', 'officer'],
        action: () => {
          const text = '/me reaches into pocket, shows badge and official identification'
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Show Badge & ID',
            subtitle: text,
          })
          showToast('Command copied: Show Badge & ID', 'success')
        },
      },
      {
        id: 'cmd-connect-pda',
        title: `Connect PDA to ${org} Tower`,
        subtitle: `/me connects PDA to the nearest ${org} cell tower`,
        category: 'Commands',
        icon: '📱',
        keywords: ['pda', 'tower', 'connect', 'lookup', 'mdc', org.toLowerCase()],
        action: () => {
          const text = `/me connects PDA to the nearest ${org} cell tower`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Connect PDA',
            subtitle: text,
          })
          showToast('Command copied: Connect PDA', 'success')
        },
      },
      {
        id: 'cmd-launch-drone',
        title: `Launch ${org} Drone`,
        subtitle: `/me launches ${org} drone`,
        category: 'Commands',
        icon: '🚁',
        keywords: ['drone', 'launch', 'recon', 'aerial', org.toLowerCase()],
        action: () => {
          const text = `/me launches ${org} drone`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Launch Drone',
            subtitle: text,
          })
          showToast('Command copied: Launch Drone', 'success')
        },
      },
      {
        id: 'cmd-lawyer-ssd',
        title: `Hand SSD to Lawyer (${org} Cloud)`,
        subtitle: `/do saves bodycam onto an SSD Card and uploads into PDA to ${org} Cloud servers and continues recording`,
        category: 'Commands',
        icon: '⚖️',
        keywords: ['lawyer', 'ssd', 'usb', 'attorney', org.toLowerCase()],
        action: () => {
          const text = `/do saves bodycam onto an SSD Card and uploads into PDA to ${org} Cloud servers and continues recording`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: 'Hand SSD to Lawyer',
            subtitle: text,
          })
          showToast('Command copied: Hand SSD to Lawyer', 'success')
        },
      },
      {
        id: 'cmd-employment-contract',
        title: `Sign ${org} Employment Contract`,
        subtitle: `/me Signs the ${org} Employment Contract on the desk`,
        category: 'Commands',
        icon: '📝',
        keywords: ['contract', 'employment', 'sign', org.toLowerCase()],
        action: () => {
          const text = `/me Signs the ${org} Employment Contract on the desk`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: `Sign ${org} Contract`,
            subtitle: text,
          })
          showToast('Command copied: Sign Contract', 'success')
        },
      },
      {
        id: 'cmd-radio-doj',
        title: `${org} to DOJ Radio Traffic`,
        subtitle: `${org} to DOJ: How copy?`,
        category: 'Commands',
        icon: '📻',
        keywords: ['radio', 'doj', 'dispatch', org.toLowerCase()],
        action: () => {
          const text = `${org} to DOJ: How copy?`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: `${org} to DOJ`,
            subtitle: text,
          })
          showToast('Command copied: Radio DOJ', 'success')
        },
      },
      {
        id: 'cmd-radio-global-1010',
        title: `${org} Global Broadcast (Heavy 10-10s)`,
        subtitle: `${org} to ALL: Global is for heavy 10-10s, send all available units!`,
        category: 'Commands',
        icon: '🚨',
        keywords: ['radio', 'global', '10-10', 'backup', org.toLowerCase()],
        action: () => {
          const text = `${org} to ALL: Global is for heavy 10-10s, send all available units!`
          navigator.clipboard.writeText(text)
          recordRecentItem({
            type: 'command',
            targetId: text,
            title: `${org} Global 10-10s`,
            subtitle: text,
          })
          showToast('Command copied: Global 10-10 Broadcast', 'success')
        },
      },
    ]
  }, [currentOrganization, recordRecentItem, showToast])

  // Pages
  const pageItems: PaletteItem[] = useMemo(
    () => [
      {
        id: 'page-dashboard',
        title: 'Dashboard',
        subtitle: 'Main Operations Center overview & quick links',
        category: 'Pages',
        icon: '📊',
        keywords: ['home', 'dashboard', 'overview', 'center'],
        action: () => router.push('/'),
      },
      {
        id: 'page-commands',
        title: 'Bodycam Commands',
        subtitle: 'Complete list of roleplay commands by organization',
        category: 'Pages',
        icon: '📹',
        keywords: ['commands', 'bodycam', 'macros', 'roleplay', 'radio'],
        action: () => router.push('/bodycam-commands'),
      },
      {
        id: 'page-guide',
        title: 'Patrolman\'s Guide / Legislation',
        subtitle: 'Penal Code, Traffic Code, and Charge Collector',
        category: 'Pages',
        icon: '⚖️',
        keywords: ['guide', 'legislation', 'laws', 'penal', 'traffic', 'code', 'charges'],
        action: () => router.push('/patrolman-guide'),
      },
      {
        id: 'page-reports',
        title: 'Reports & Duty Logs',
        subtitle: 'Evidence generator, shift manager, and arrest records',
        category: 'Pages',
        icon: '📝',
        keywords: ['reports', 'duty', 'shift', 'evidence', 'fines', 'arrests'],
        action: () => router.push('/reports'),
      },
      {
        id: 'page-profile',
        title: 'Officer Profile',
        subtitle: 'Statistics, loadouts, badge number, and local storage',
        category: 'Pages',
        icon: '👤',
        keywords: ['profile', 'badge', 'loadouts', 'stats', 'achievements', 'settings'],
        action: () => router.push('/profile'),
      },
    ],
    [router]
  )

  // Quick Actions
  const actionItems: PaletteItem[] = useMemo(
    () => {
      const items: PaletteItem[] = [
        {
          id: 'action-arrest-center',
          title: 'Open Arrest Command Center',
          subtitle: 'Tactical arrest workstation, fine-first processing & checklist',
          category: 'Actions',
          icon: '🚨',
          keywords: ['arrest', 'detain', 'custody', 'fine', 'charges', 'command', 'center'],
          action: () => {
            setIsArrestCommandCenterOpen(true)
          },
        },
        {
          id: 'action-assistant',
          title: 'Open Legislation Assistant',
          subtitle: 'Ask questions about Traffic Code (2nd Rendition) and Penal Codes',
          category: 'Actions',
          icon: '⚖️',
          keywords: ['assistant', 'ai', 'legislation', 'help', 'explain', 'law'],
          action: () => {
            openAssistant()
          },
        },
        {
          id: 'action-new-note',
          title: 'Create New Note',
          subtitle: 'Open officer notebook and start typing immediately',
          category: 'Actions',
          icon: '⚡',
          keywords: ['new', 'note', 'create', 'memo', 'reminder'],
          action: () => {
            createNote({ title: 'New Note' })
            setIsRightPanelOpen(true)
            setUtilityTab('notes')
          },
        },
        {
          id: 'action-add-shortcut',
          title: 'Add Quick Access Shortcut',
          subtitle: 'Pin a custom command, law, or page to the left sidebar',
          category: 'Actions',
          icon: '📌',
          keywords: ['shortcut', 'add', 'quick', 'access', 'pin'],
          action: () => {
            setIsAddShortcutOpen(true)
          },
        },
        {
          id: 'action-edit-profile',
          title: 'Edit Officer Profile',
          subtitle: `Name: Officer ${profile.name || 'N/A'} • Dept: ${profile.organization || currentOrganization} • Passport: #${profile.passportNumber || 'N/A'}`,
          category: 'Actions',
          icon: '🎖️',
          keywords: ['profile', 'edit', 'name', 'passport', 'badge', 'rank', 'callsign', 'department', 'organization', 'credentials'],
          action: () => {
            setIsProfileEditModalOpen(true)
          },
        },
        {
          id: 'action-switch-org-lspd',
          title: 'Switch Department: LSPD',
          subtitle: 'Active department → Los Santos Police Department',
          category: 'Actions',
          icon: '👮‍♂️',
          keywords: ['switch', 'organization', 'department', 'lspd', 'police', 'org'],
          action: () => {
            setCurrentOrganization('LSPD')
            showToast('Active department set to LSPD', 'success')
          },
        },
        {
          id: 'action-switch-org-bcso',
          title: 'Switch Department: BCSO',
          subtitle: 'Active department → Blaine County Sheriff\'s Office',
          category: 'Actions',
          icon: '🤠',
          keywords: ['switch', 'organization', 'department', 'bcso', 'sheriff', 'org'],
          action: () => {
            setCurrentOrganization('BCSO')
            showToast('Active department set to BCSO', 'success')
          },
        },
        {
          id: 'action-switch-org-sahp',
          title: 'Switch Department: SAHP',
          subtitle: 'Active department → San Andreas Highway Patrol',
          category: 'Actions',
          icon: '🚓',
          keywords: ['switch', 'organization', 'department', 'sahp', 'highway', 'patrol', 'org'],
          action: () => {
            setCurrentOrganization('SAHP')
            showToast('Active department set to SAHP', 'success')
          },
        },
        {
          id: 'action-switch-org-fib',
          title: 'Switch Department: FIB',
          subtitle: 'Active department → Federal Investigation Bureau',
          category: 'Actions',
          icon: '🕵️‍♂️',
          keywords: ['switch', 'organization', 'department', 'fib', 'federal', 'bureau', 'org'],
          action: () => {
            setCurrentOrganization('FIB')
            showToast('Active department set to FIB', 'success')
          },
        },
        {
          id: 'action-switch-org-gov',
          title: 'Switch Department: GOV',
          subtitle: 'Active department → Government of San Andreas',
          category: 'Actions',
          icon: '🏛️',
          keywords: ['switch', 'organization', 'department', 'gov', 'government', 'usss', 'org'],
          action: () => {
            setCurrentOrganization('GOV')
            showToast('Active department set to GOV', 'success')
          },
        },
        {
          id: 'action-switch-org-ng',
          title: 'Switch Department: NG',
          subtitle: 'Active department → National Guard / Military',
          category: 'Actions',
          icon: '🪖',
          keywords: ['switch', 'organization', 'department', 'ng', 'national', 'guard', 'military', 'org'],
          action: () => {
            setCurrentOrganization('NG')
            showToast('Active department set to NG', 'success')
          },
        },
        {
          id: 'action-switch-org-ems',
          title: 'Switch Department: EMS',
          subtitle: 'Active department → Emergency Medical Services',
          category: 'Actions',
          icon: '🚑',
          keywords: ['switch', 'organization', 'department', 'ems', 'medical', 'hospital', 'org'],
          action: () => {
            setCurrentOrganization('EMS')
            showToast('Active department set to EMS', 'success')
          },
        },
        {
          id: 'action-backup',
          title: 'Backup & Storage Manager',
          subtitle: 'Export JSON backup, import backup, or manage local data',
          category: 'Actions',
          icon: '💾',
          keywords: ['backup', 'export', 'import', 'restore', 'storage', 'data', 'json'],
          action: () => {
            setIsBackupModalOpen(true)
          },
        },
        {
          id: 'action-toggle-panel',
          title: isRightPanelOpen ? 'Collapse Utility Panel' : 'Expand Utility Panel',
          subtitle: 'Toggle right sidebar for Notes, Pinned, and Recent items',
          category: 'Actions',
          icon: '📂',
          keywords: ['panel', 'toggle', 'utility', 'sidebar'],
          action: () => {
            toggleRightPanel()
          },
        },
        {
          id: 'action-toggle-theme',
          title: 'Toggle Theme Appearance',
          subtitle: 'Switch between Dark, Light, or Auto mode',
          category: 'Actions',
          icon: '🌓',
          keywords: ['theme', 'dark', 'light', 'mode', 'color'],
          action: () => {
            toggleTheme()
            showToast('Theme updated', 'info')
          },
        },
      ]

      if (activeDetention) {
        items.unshift({
          id: 'action-resume-detention',
          title: `Resume Active Detention (Passport #${activeDetention.passportNumber || 'N/A'})`,
          subtitle: `Active Case ${activeDetention.caseId} • ${activeDetention.charges.length} charge(s)`,
          category: 'Actions',
          icon: '⚡',
          keywords: ['active', 'detention', 'resume', 'custody', 'suspect', activeDetention.passportNumber],
          action: () => {
            setIsArrestCommandCenterOpen(true)
          },
        })
      }

      return items
    },
    [
      activeDetention,
      createNote,
      currentOrganization,
      isRightPanelOpen,
      openAssistant,
      profile.name,
      profile.organization,
      profile.passportNumber,
      setCurrentOrganization,
      setIsAddShortcutOpen,
      setIsArrestCommandCenterOpen,
      setIsBackupModalOpen,
      setIsProfileEditModalOpen,
      setIsRightPanelOpen,
      setUtilityTab,
      showToast,
      toggleRightPanel,
      toggleTheme,
    ]
  )

  // Notes Items
  const noteItems: PaletteItem[] = useMemo(
    () =>
      notes.map((n) => ({
        id: `note-${n.id}`,
        title: n.title || 'Untitled Note',
        subtitle: `Note [${n.category}] — ${n.content ? n.content.slice(0, 45) : 'Empty'}`,
        category: 'Notes',
        icon: '📝',
        keywords: ['note', n.category, n.content],
        action: () => {
          setActiveNote(n)
          setIsRightPanelOpen(true)
          setUtilityTab('notes')
        },
      })),
    [notes, setActiveNote, setIsRightPanelOpen, setUtilityTab]
  )

  // Pinned Items
  const pinnedPaletteItems: PaletteItem[] = useMemo(
    () =>
      pinnedItems.map((p) => ({
        id: `pin-${p.id}`,
        title: p.title,
        subtitle: `Pinned ${p.type} • ${p.subtitle || ''}`,
        category: 'Pinned',
        icon: '📌',
        keywords: ['pinned', p.type, p.title],
        action: () => {
          if (p.type === 'note') {
            const n = notes.find((note) => note.id === p.targetId)
            if (n) {
              setActiveNote(n)
              setIsRightPanelOpen(true)
              setUtilityTab('notes')
            }
          } else if (p.type === 'command') {
            const text = p.data?.text || p.targetId
            navigator.clipboard.writeText(text)
            showToast(`Copied: ${p.title}`, 'success')
          } else if (p.type === 'legislation') {
            router.push('/patrolman-guide')
          } else {
            router.push('/reports')
          }
        },
      })),
    [pinnedItems, notes, setActiveNote, setIsRightPanelOpen, setUtilityTab, showToast, router]
  )

  // Quick Access Items
  const qaPaletteItems: PaletteItem[] = useMemo(
    () =>
      quickAccessItems.map((qa) => ({
        id: `qa-${qa.id}`,
        title: qa.title,
        subtitle: `Shortcut: ${qa.snippet || qa.target}`,
        category: 'Quick Access',
        icon: qa.icon || (qa.type === 'command' ? '⚡' : '🔗'),
        keywords: ['quick', 'access', 'shortcut', qa.title, qa.target],
        action: () => {
          if (qa.type === 'command') {
            navigator.clipboard.writeText(qa.target)
            recordRecentItem({
              type: 'command',
              targetId: qa.target,
              title: qa.title,
              subtitle: qa.snippet,
            })
            showToast(`Copied: ${qa.title}`, 'success')
          } else {
            router.push(qa.target)
          }
        },
      })),
    [quickAccessItems, recordRecentItem, showToast, router]
  )

  // Recent Items
  const recentPaletteItems: PaletteItem[] = useMemo(
    () =>
      recentItems.slice(0, 10).map((r) => ({
        id: `recent-${r.id}`,
        title: r.title,
        subtitle: `Recent: ${r.subtitle || r.type}`,
        category: 'Recent',
        icon: '🕒',
        keywords: ['recent', r.type, r.title],
        action: () => {
          if (r.type === 'command') {
            navigator.clipboard.writeText(r.targetId)
            showToast(`Copied: ${r.title}`, 'success')
          } else if (r.url) {
            router.push(r.url)
          } else if (r.type === 'page') {
            router.push(r.targetId)
          } else {
            router.push('/reports')
          }
        },
      })),
    [recentItems, showToast, router]
  )

  // Legislation Items
  const legislationPaletteItems: PaletteItem[] = useMemo(
    () =>
      lawEntries.map((law) => ({
        id: `law-${law.code}`,
        title: `§ ${law.code} — ${law.description}`,
        subtitle: `[${law.sourceDocument.includes('Traffic') ? 'Traffic Code 2nd Rend.' : 'Penal Code'}] Fine: ${law.fine || '-'} | Sentence: ${law.sentence || '-'}`,
        category: 'Legislation',
        icon: '⚖️',
        keywords: [law.code, law.description, law.category, law.remarks || '', law.fine || '', law.sentence || ''],
        action: () => {
          recordRecentItem({
            type: 'legislation',
            targetId: law.code,
            title: law.code,
            subtitle: law.description,
          })
          router.push(`/patrolman-guide?code=${encodeURIComponent(law.code)}`)
        },
      })),
    [lawEntries, recordRecentItem, router]
  )

  // Filter and Score results
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // When empty query: show Quick Actions, Pages, and Recent
      return [...actionItems, ...pageItems, ...recentPaletteItems]
    }

    const all = [
      ...actionItems,
      ...pageItems,
      ...appCommands,
      ...legislationPaletteItems,
      ...pinnedPaletteItems,
      ...qaPaletteItems,
      ...noteItems,
      ...recentPaletteItems,
    ]

    const scored: PaletteItem[] = []

    for (const item of all) {
      const titleLower = item.title.toLowerCase()
      const subtitleLower = (item.subtitle || '').toLowerCase()
      const categoryLower = item.category.toLowerCase()
      const keywordsStr = (item.keywords || []).join(' ').toLowerCase()

      let score = 0

      // Exact title match
      if (titleLower === q) {
        score += 100
      } else if (titleLower.startsWith(q)) {
        score += 75
      } else if (titleLower.includes(q)) {
        score += 50
      } else if (keywordsStr.includes(q)) {
        score += 35
      } else if (subtitleLower.includes(q)) {
        score += 25
      } else if (categoryLower.includes(q)) {
        score += 10
      }

      if (score > 0) {
        scored.push({ ...item, score })
      }
    }

    // Sort by score descending
    scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    return scored
  }, [
    query,
    actionItems,
    pageItems,
    appCommands,
    pinnedPaletteItems,
    qaPaletteItems,
    noteItems,
    recentPaletteItems,
  ])

  // Group results by Category
  const groupedCategories = useMemo(() => {
    const groups: { category: string; items: PaletteItem[] }[] = []
    const catMap = new Map<string, PaletteItem[]>()

    filteredItems.forEach((item) => {
      if (!catMap.has(item.category)) {
        catMap.set(item.category, [])
      }
      catMap.get(item.category)!.push(item)
    })

    catMap.forEach((items, category) => {
      groups.push({ category, items })
    })

    return groups
  }, [filteredItems])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action()
        setIsCommandPaletteOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false)
    }
  }

  if (!isCommandPaletteOpen) return null

  let globalIndex = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 bg-black/75 backdrop-brightness-75 animate-fadeIn"
      onClick={() => setIsCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-2xl bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <svg className="w-5 h-5 text-outline flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant font-mono text-sm focus:ring-0"
            placeholder="Search commands, notes, shortcuts, pages, laws..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-on-surface-variant hover:text-on-surface text-xs font-mono px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-surface-variant text-on-surface-variant rounded border border-outline-variant">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-2xl text-on-surface-variant">🔍</span>
              <div className="text-sm font-semibold text-on-surface">No results found for "{query}"</div>
              <p className="text-xs text-on-surface-variant font-mono">
                Try searching for commands like "bodycam", "miranda", or notes.
              </p>
            </div>
          ) : (
            groupedCategories.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-lowest rounded">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  globalIndex++
                  const currentIndex = globalIndex
                  const isSelected = currentIndex === selectedIndex

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action()
                        setIsCommandPaletteOpen(false)
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${
                        isSelected
                          ? 'bg-surface-container-high text-primary border-l-2 border-primary'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="text-base flex-shrink-0">{item.icon}</span>
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-medium leading-tight truncate">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-[11px] text-on-surface-variant font-mono truncate mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {item.category === 'Commands' && (
                          <span className="text-[9px] font-mono uppercase text-secondary bg-secondary/10 border border-secondary/20 px-1.5 py-0.2 rounded">
                            Copy
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-on-surface-variant opacity-60">
                          ↵
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between text-[11px] font-mono text-on-surface-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute / Open</span>
          </div>
          <span>Esc to Close</span>
        </div>
      </div>
    </div>
  )
}
