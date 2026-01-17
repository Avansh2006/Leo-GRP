'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useDuty } from '@/contexts/DutyContext'
import { useNotifications } from '@/contexts/NotificationContext'

const Navbar = () => {
  const pathname = usePathname()
  const { theme, colorScheme, setTheme, setColorScheme, toggleTheme } = useTheme()
  const { isOnDuty, arrestCount, fineCount } = useDuty()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  
  const navItems = [
    { name: 'Bodycam Commands', href: '/bodycam-commands' },
    { name: 'Patrolman\'s Guide', href: '/patrolman-guide' },
    { name: 'Reports', href: '/reports' },
    { name: 'Profile', href: '/profile' },
  ]

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
  
  const navItems = [
    { name: 'Bodycam Commands', href: '/bodycam-commands' },
    { name: 'Patrolman\'s Guide', href: '/patrolman-guide' },
    { name: 'Reports', href: '/reports' },
    { name: 'Profile', href: '/profile' },
  ]

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              LEO Toolkit
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
            {isOnDuty && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  On Duty
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Arrests: {arrestCount}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Fines: {fineCount}</span>
              </div>
            )}
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-2xl">{notif.type === 'achievement' ? '🏆' : notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{notif.title}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(notif.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Menu */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Theme settings"
              >
                {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓'}
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Theme Settings</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Mode</label>
                      <div className="grid grid-cols-3 gap-2">
                        {themeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              theme === option.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {option.icon} {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Color Scheme</label>
                      <div className="grid grid-cols-5 gap-2">
                        {colorSchemes.map((scheme) => (
                          <button
                            key={scheme.value}
                            onClick={() => setColorScheme(scheme.value)}
                            className={`w-10 h-10 rounded-md ${scheme.color} transition-transform hover:scale-110 ${
                              colorScheme === scheme.value ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100' : ''
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

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
