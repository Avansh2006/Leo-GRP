/**
 * Profile Edit Modal for LEO-GRP
 * Quick tactical modal for updating officer name, organization, passport, badge, rank, and callsign.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

const ORGANIZATIONS = [
  { id: 'LSPD', name: 'LSPD — Los Santos Police Department', icon: '👮‍♂️' },
  { id: 'BCSO', name: 'BCSO — Blaine County Sheriff\'s Office', icon: '🤠' },
  { id: 'SAHP', name: 'SAHP — San Andreas Highway Patrol', icon: '🚓' },
  { id: 'FIB', name: 'FIB — Federal Investigation Bureau', icon: '🕵️‍♂️' },
  { id: 'GOV', name: 'GOV — Government of San Andreas', icon: '🏛️' },
  { id: 'NG', name: 'NG — National Guard', icon: '🪖' },
  { id: 'EMS', name: 'EMS — Emergency Medical Services', icon: '🚑' },
]

export default function ProfileEditModal() {
  const { profile, updateProfile, isProfileEditModalOpen, setIsProfileEditModalOpen } = useUserProfile()
  const { setCurrentOrganization } = useDuty()
  const { showToast } = useToast()

  const [name, setName] = useState(profile.name || '')
  const [organization, setOrganization] = useState(profile.organization || 'LSPD')
  const [passportNumber, setPassportNumber] = useState(profile.passportNumber || '')
  const [badgeNumber, setBadgeNumber] = useState(profile.badgeNumber || '')
  const [rank, setRank] = useState(profile.rank || '')
  const [callsign, setCallsign] = useState(profile.callsign || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isProfileEditModalOpen) {
      setName(profile.name || '')
      setOrganization(profile.organization || 'LSPD')
      setPassportNumber(profile.passportNumber || '')
      setBadgeNumber(profile.badgeNumber || '')
      setRank(profile.rank || '')
      setCallsign(profile.callsign || '')
    }
  }, [isProfileEditModalOpen, profile])

  if (!isProfileEditModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !organization.trim() || !passportNumber.trim()) {
      showToast('Name, Organization, and Passport ID are required', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      await updateProfile({
        name: name.trim(),
        organization: organization.trim(),
        passportNumber: passportNumber.trim(),
        badgeNumber: badgeNumber.trim() || undefined,
        rank: rank.trim() || undefined,
        callsign: callsign.trim() || undefined,
      })
      setCurrentOrganization(organization.trim())
      showToast('Officer profile updated successfully', 'success')
      setIsProfileEditModalOpen(false)
    } catch (err: any) {
      showToast(`Failed to update profile: ${err.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none"
      onClick={() => setIsProfileEditModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">🎖️</span>
            <div>
              <h3 className="font-bold text-sm font-mono tracking-wider uppercase text-on-surface">
                Edit Officer Profile
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Update operational credentials & active department
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileEditModalOpen(false)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
              Officer Full Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Avansh Vukovic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface font-sans placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
              Department / Organization <span className="text-primary">*</span>
            </label>
            <select
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface font-sans focus:outline-none focus:border-primary cursor-pointer"
            >
              {ORGANIZATIONS.map((org) => (
                <option key={org.id} value={org.id} className="bg-surface-container text-on-surface">
                  {org.icon} {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-on-surface mb-1 uppercase tracking-wider">
              Passport / Player ID <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 129253"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                Badge #
              </label>
              <input
                type="text"
                placeholder="e.g. 402"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
                Rank
              </label>
              <input
                type="text"
                placeholder="e.g. Captain III"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-sans focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">
              Unit Callsign
            </label>
            <input
              type="text"
              placeholder="e.g. 1-ADAM-12"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsProfileEditModalOpen(false)}
              className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary font-mono font-bold text-xs uppercase tracking-wider rounded shadow transition-all flex items-center gap-1.5"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
