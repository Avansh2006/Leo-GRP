'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useToast } from '@/components/ToastProvider'
import { QuickAccessItem } from '@/utils/db'

interface SidebarProps {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const { showToast } = useToast()
  const {
    quickAccessItems,
    removeQuickAccessItem,
    reorderQuickAccess,
    setIsAddShortcutOpen,
    recordRecentItem,
    openAssistant,
  } = useProductivity()

  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leogrp_sidebar_collapsed')
      if (saved !== null) {
        setIsCollapsed(saved === 'true')
      }
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('leogrp_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Commands',
      href: '/bodycam-commands',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Legislation',
      href: '/patrolman-guide',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  const handleQuickAccessClick = (qa: QuickAccessItem) => {
    recordRecentItem({
      type: qa.type as any,
      targetId: qa.target,
      title: qa.title,
      subtitle: qa.snippet,
      url: qa.type === 'page' ? qa.target : undefined,
    })

    if (qa.type === 'command') {
      navigator.clipboard.writeText(qa.target)
      showToast(`Copied command: ${qa.title}`, 'success')
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`fixed lg:static top-0 left-0 h-full z-40 bg-surface-container-lowest border-r border-outline-variant flex flex-col transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand / Header */}
        <div className="h-16 px-4 border-b border-outline-variant flex items-center justify-between bg-background">
          {!isCollapsed && (
            <Link href="/" className="flex flex-col truncate">
              <span className="font-headline-md text-base font-bold text-primary tracking-tight">
                LEO-GRP
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                OPERATIONS CENTER
              </span>
            </Link>
          )}

          {isCollapsed && (
            <Link href="/" className="mx-auto font-bold text-primary text-base">
              LG
            </Link>
          )}

          <button
            onClick={toggleCollapse}
            className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors hidden lg:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Main Navigation links */}
        <div className="flex-1 py-4 overflow-y-auto flex flex-col justify-between">
          <div>
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  NAVIGATION
                </span>
              </div>
            )}

            <ul className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors relative ${
                        isActive
                          ? 'bg-surface-container-high text-primary border-r-2 border-primary font-medium'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      title={item.name}
                    >
                      {item.icon}
                      {!isCollapsed && <span className="text-sm">{item.name}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Quick Access Section */}
            {!isCollapsed && (
              <div className="mt-6 pt-4 border-t border-outline-variant">
                <div className="px-4 mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    QUICK ACCESS
                  </span>
                  <button
                    onClick={() => setIsAddShortcutOpen(true)}
                    className="text-[10px] font-mono text-primary hover:text-primary-container px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors"
                    title="Add Shortcut"
                  >
                    + Add
                  </button>
                </div>

                {quickAccessItems.length === 0 ? (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-on-surface-variant mb-2">No shortcuts yet</p>
                    <button
                      onClick={() => setIsAddShortcutOpen(true)}
                      className="text-xs font-mono text-primary hover:underline"
                    >
                      + Add Shortcut
                    </button>
                  </div>
                ) : (
                  <ul className="flex flex-col space-y-1 px-2">
                    {quickAccessItems.map((qa, index) => (
                      <li key={qa.id} className="group relative">
                        {qa.type === 'page' ? (
                          <Link
                            href={qa.target}
                            onClick={() => handleQuickAccessClick(qa)}
                            className="flex items-center justify-between px-2.5 py-1.5 text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-primary text-[10px]">📌</span>
                              <span className="truncate">{qa.title}</span>
                            </div>
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleQuickAccessClick(qa)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-primary text-[10px]">📌</span>
                              <span className="truncate font-mono">{qa.title}</span>
                            </div>
                          </button>
                        )}

                        {/* Quick action controls (reorder, remove) on hover */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-surface-container-high px-1 py-0.5 rounded border border-outline-variant">
                          {index > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                reorderQuickAccess(qa.id, 'up')
                              }}
                              className="p-0.5 text-on-surface-variant hover:text-on-surface text-[10px]"
                              title="Move Up"
                            >
                              ▲
                            </button>
                          )}
                          {index < quickAccessItems.length - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                reorderQuickAccess(qa.id, 'down')
                              }}
                              className="p-0.5 text-on-surface-variant hover:text-on-surface text-[10px]"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeQuickAccessItem(qa.id)
                            }}
                            className="p-0.5 text-on-surface-variant hover:text-error text-[10px]"
                            title="Remove Shortcut"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Footer Support / Legislation Assistant */}
          <div className="p-3 border-t border-outline-variant bg-surface-container-lowest">
            {!isCollapsed ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openAssistant()}
                  className="w-full px-2.5 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded flex items-center justify-between transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">⚖️</span>
                    <span className="font-mono text-xs text-primary font-semibold truncate group-hover:underline">
                      AI Assistant
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-primary text-on-primary px-1.5 py-0.2 rounded font-bold">
                    Ask
                  </span>
                </button>
                <div className="flex items-center justify-between px-1 text-[10px] font-mono text-on-surface-variant">
                  <span>LEO-GRP v2.0</span>
                  <span className="text-secondary">● 100% Local</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openAssistant()}
                className="w-full text-center text-sm p-1 rounded hover:bg-surface-container-high transition-colors"
                title="Open Legislation Assistant"
              >
                ⚖️
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
