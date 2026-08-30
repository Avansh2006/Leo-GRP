'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useDuty } from '@/contexts/DutyContext'
import { useProductivity } from '@/contexts/ProductivityContext'

export default function Home() {
  const { profile } = useUserProfile()
  const { isOnDuty, currentDutyStart, lifetimeArrests, lifetimeFines, lifetimeFinesCount } = useDuty()
  const { createNote, recordRecentItem } = useProductivity()

  useEffect(() => {
    recordRecentItem({
      type: 'page',
      targetId: '/',
      title: 'Command Center Dashboard',
      subtitle: 'Main Operations Center',
      url: '/',
    })
  }, [recordRecentItem])

  const quickActions = [
    {
      title: 'Bodycam Commands',
      description: 'Roleplay /me and /do macros for all LEO organizations.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      link: '/bodycam-commands',
      color: 'text-primary',
    },
    {
      title: 'Patrolman\'s Guide',
      description: 'Penal Code & Traffic Code reference with charge collector.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      link: '/patrolman-guide',
      color: 'text-secondary',
    },
    {
      title: 'Evidence & Shift Reports',
      description: 'Arrest logs, fine records, weapon status and duty exports.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      link: '/reports',
      color: 'text-tertiary',
    },
    {
      title: 'Officer Profile',
      description: 'Duty logs, weapon loadouts, rank, and performance history.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      link: '/profile',
      color: 'text-primary',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Tactical Banner */}
      <section className="bg-surface-container-low border border-outline-variant rounded-lg p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span>LEO Operations Center</span>
            {profile.badgeNumber && <span>• Badge #{profile.badgeNumber}</span>}
          </div>
          <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface mb-2">
            Welcome back, {profile.name ? `Officer ${profile.name}` : 'Officer'}.
          </h1>
          <p className="text-on-surface-variant text-sm max-w-xl leading-relaxed">
            {isOnDuty
              ? 'Shift is currently ACTIVE. Maintain situational awareness and ensure reports are submitted before going 10-42.'
              : 'Off-duty. Review legislation, configure officer loadouts, or start a patrol shift when ready.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/reports"
              className={`px-4 py-2 text-xs font-mono font-semibold rounded transition-colors ${
                isOnDuty
                  ? 'bg-secondary hover:bg-secondary-container text-on-secondary'
                  : 'bg-primary hover:bg-primary-container text-on-primary'
              }`}
            >
              {isOnDuty ? 'Manage Active Shift' : 'Start Patrol Shift'}
            </Link>

            <button
              onClick={() => createNote({ title: 'Shift Notes' })}
              className="px-3.5 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface bg-surface-container-high border border-outline-variant hover:border-outline rounded transition-colors"
            >
              + Quick Note
            </button>

            <Link
              href="/patrolman-guide"
              className="px-3.5 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface bg-transparent border border-outline-variant hover:border-outline rounded transition-colors"
            >
              Browse Law Guide
            </Link>
          </div>
        </div>

        {/* Tactical subtle accent in corner */}
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-surface-variant/40 to-transparent pointer-events-none" />
      </section>

      {/* Duty & Performance Status Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest border border-outline-variant rounded p-3.5">
          <div className="font-mono text-[10px] uppercase text-on-surface-variant">Duty Status</div>
          <div className="text-base font-bold text-on-surface mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-secondary animate-pulse' : 'bg-outline'}`} />
            {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded p-3.5">
          <div className="font-mono text-[10px] uppercase text-on-surface-variant">Lifetime Arrests</div>
          <div className="text-base font-bold text-on-surface mt-1 font-mono">{lifetimeArrests}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded p-3.5">
          <div className="font-mono text-[10px] uppercase text-on-surface-variant">Lifetime Fines</div>
          <div className="text-base font-bold text-secondary mt-1 font-mono">${lifetimeFines.toLocaleString()}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded p-3.5">
          <div className="font-mono text-[10px] uppercase text-on-surface-variant">System Mode</div>
          <div className="text-base font-bold text-secondary mt-1 font-mono">100% Offline</div>
        </div>
      </section>

      {/* Bento Quick Action Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.link}
            className="bg-surface-container-low border border-outline-variant hover:border-primary p-5 rounded-lg flex items-start gap-4 group transition-all"
          >
            <div className={`p-3 rounded bg-surface-container-high border border-outline-variant group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary transition-colors ${action.color}`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-headline-md text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                {action.title}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                {action.description}
              </p>
            </div>
            <span className="text-on-surface-variant group-hover:text-primary transition-colors self-center text-sm">
              →
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
