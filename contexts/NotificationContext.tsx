'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'achievement'
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  achievements: Achievement[]
  unreadCount: number
  addNotification: (type: Notification['type'], title: string, message: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  checkAchievements: (arrests: number, fines: number, shifts: number, hours: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_arrest', title: 'First Arrest', description: 'Make your first arrest', icon: '🎯' },
  { id: 'arrest_10', title: 'Rising Officer', description: 'Complete 10 arrests', icon: '⭐' },
  { id: 'arrest_50', title: 'Veteran Officer', description: 'Complete 50 arrests', icon: '🏆' },
  { id: 'arrest_100', title: 'Elite Officer', description: 'Complete 100 arrests', icon: '👑' },
  { id: 'arrest_500', title: 'Legend', description: 'Complete 500 arrests', icon: '💎' },
  { id: 'fine_25', title: 'Revenue Generator', description: 'Issue 25 fines', icon: '💰' },
  { id: 'fine_100', title: 'Tax Collector', description: 'Issue 100 fines', icon: '💵' },
  { id: 'shift_10', title: 'Dedicated', description: 'Complete 10 shifts', icon: '📅' },
  { id: 'shift_50', title: 'Career Officer', description: 'Complete 50 shifts', icon: '🎖️' },
  { id: 'hours_100', title: 'Centurion', description: 'Work 100 hours on duty', icon: '⏰' },
  { id: 'hours_500', title: 'Time Lord', description: 'Work 500 hours on duty', icon: '⌛' },
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    // Load from localStorage
    const savedNotifications = localStorage.getItem('notifications')
    const savedAchievements = localStorage.getItem('achievements')
    
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
    
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements))
    } else {
      // Initialize achievements
      const initialAchievements = ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }))
      setAchievements(initialAchievements)
      localStorage.setItem('achievements', JSON.stringify(initialAchievements))
    }
  }, [])

  const addNotification = (type: Notification['type'], title: string, message: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    }
    
    const updated = [newNotification, ...notifications].slice(0, 50) // Keep last 50
    setNotifications(updated)
    localStorage.setItem('notifications', JSON.stringify(updated))
  }

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifications(updated)
    localStorage.setItem('notifications', JSON.stringify(updated))
  }

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    localStorage.setItem('notifications', JSON.stringify(updated))
  }

  const clearNotifications = () => {
    setNotifications([])
    localStorage.removeItem('notifications')
  }

  const checkAchievements = (arrests: number, fines: number, shifts: number, hours: number) => {
    let updated = [...achievements]
    let hasNewAchievement = false

    const checks = [
      { id: 'first_arrest', condition: arrests >= 1 },
      { id: 'arrest_10', condition: arrests >= 10 },
      { id: 'arrest_50', condition: arrests >= 50 },
      { id: 'arrest_100', condition: arrests >= 100 },
      { id: 'arrest_500', condition: arrests >= 500 },
      { id: 'fine_25', condition: fines >= 25 },
      { id: 'fine_100', condition: fines >= 100 },
      { id: 'shift_10', condition: shifts >= 10 },
      { id: 'shift_50', condition: shifts >= 50 },
      { id: 'hours_100', condition: hours >= 100 },
      { id: 'hours_500', condition: hours >= 500 },
    ]

    checks.forEach(({ id, condition }) => {
      const achievement = updated.find(a => a.id === id)
      if (achievement && !achievement.unlocked && condition) {
        achievement.unlocked = true
        achievement.unlockedAt = new Date().toISOString()
        hasNewAchievement = true
        addNotification('achievement', `Achievement Unlocked! ${achievement.icon}`, achievement.title)
      }
    })

    if (hasNewAchievement) {
      setAchievements(updated)
      localStorage.setItem('achievements', JSON.stringify(updated))
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        achievements,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        checkAchievements,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
