'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useProductivity } from '@/contexts/ProductivityContext'
import DutyHeaderStatus from './DutyHeaderStatus'

interface HeaderProps {
  onToggleMobileSidebar: () => void
}

export default function Header({ onToggleMobileSidebar }: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme, colorScheme, setColorScheme, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { profile } = useUserProfile()
  const { setIsCommandPaletteOpen, toggleRightPanel, isRightPanelOpen } = useProductivity()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  // Map path to friendly section title
  const getSectionTitle = () => {
    switch (pathname) {
      case '/':
        return 'DASHBOARD'
      case '/bodycam-commands':
        return 'BODYCAM COMMANDS'
      case '/patrolman-guide':
        return 'PATROLMAN GUIDE'
      case '/reports':
        return 'REPORTS & DUTY'
      case '/profile':
        return 'OFFICER PROFILE'
      default:
        return 'OPERATIONS CENTER'
    }
  }

  const themeOptions = [
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'auto' as const, label: 'Auto', icon: '🌓' },
  ]

  const colorSchemes = [
    { value: 'blue' as const, label: 'Blue', color: 'bg-blue-500' },
    { value: 'purple' as const, label: 'Purple', color: 'bg-purple-500' },
    { value: 'green' as const, label: 'Green', color: 'bg-green-500' },
    { value: 'red' as const, label: 'Red', color: 'bg-red-500' },
    { value: 'orange' as const, label: 'Orange', color: 'bg-orange-500' },
  ]

  return (
    <header className="h-16 px-4 bg-background border-b border-outline-variant flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
      {/* Left side: Mobile burger + Title + Search trigger */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded lg:hidden transition-colors"
          aria-label="Open Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Section title */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-headline-md text-sm font-bold text-primary tracking-tight">
            {getSectionTitle()}
          </span>
        </div>

        {/* Search / Command Palette Button */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant hover:border-outline rounded px-2.5 sm:px-3 py-1.5 text-on-surface-variant transition-colors group"
          title="Search or press Ctrl+K"
        >
          <svg className="w-4 h-4 text-outline group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs font-mono hidden md:inline-block">
            Search or Command Palette
          </span>
          <span className="text-xs font-mono md:hidden">
            Search
          </span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-surface-variant px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side: Duty timer + Notifications + Theme + Profile + Utility Panel toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Duty Status Indicator (Isolated component) */}
        <DutyHeaderStatus />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors relative"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-low border border-outline-variant rounded-lg shadow-xl z-50 overflow-hidden text-on-surface animate-fadeIn">
              <div className="p-3 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-on-surface">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-mono text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-on-surface-variant">
                    No new notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3 hover:bg-surface-container cursor-pointer transition-colors ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base">
                          {notif.type === 'achievement' ? '🏆' : notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-on-surface">{notif.title}</div>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{notif.message}</p>
                          <span className="text-[9px] font-mono text-on-surface-variant mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Settings Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors"
            aria-label="Theme settings"
            title="Theme Settings"
          >
            <span className="text-sm">
              {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓'}
            </span>
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-surface-container-low border border-outline-variant rounded-lg shadow-xl z-50 p-3 text-on-surface animate-fadeIn">
              <span className="font-mono text-xs font-bold uppercase tracking-wider block mb-2 text-on-surface">
                Appearance
              </span>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant mb-1.5 block">Mode</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {themeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                          theme === opt.value
                            ? 'bg-primary text-on-primary font-bold'
                            : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant mb-1.5 block">Accent Color</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {colorSchemes.map((scheme) => (
                      <button
                        key={scheme.value}
                        onClick={() => setColorScheme(scheme.value)}
                        className={`h-7 rounded ${scheme.color} transition-transform hover:scale-105 ${
                          colorScheme === scheme.value ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : ''
                        }`}
                        title={scheme.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Card / Link */}
        <Link
          href="/profile"
          className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-outline-variant hover:bg-surface-container py-1 px-2 rounded transition-colors group"
          title="View Profile"
        >
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-on-surface truncate max-w-[120px]">
              {profile.name ? `Officer ${profile.name}` : 'Officer'}
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant">
              {profile.badgeNumber ? `Badge #${profile.badgeNumber}` : profile.rank || 'Officer'}
            </div>
          </div>
          <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 group-hover:border-primary transition-colors">
            {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'LEO'}
          </div>
        </Link>

        {/* Right Utility Panel Toggle Button */}
        <button
          onClick={toggleRightPanel}
          className={`p-2 rounded border transition-colors ${
            isRightPanelOpen
              ? 'bg-surface-container-high text-primary border-outline-variant'
              : 'text-on-surface-variant hover:text-on-surface border-transparent hover:bg-surface-container'
          }`}
          title={isRightPanelOpen ? 'Close Utility Panel' : 'Open Utility Panel'}
          aria-label="Toggle Utility Panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    </header>
  )
}
