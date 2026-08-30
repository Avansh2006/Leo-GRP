/**
 * First-Time User Onboarding Modal for LEO-GRP
 * Lightweight, tactical precision wizard for configuring officer identity and active organization.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

const ORGANIZATIONS = [
  { id: 'LSPD', name: 'LSPD — Los Santos Police Department', icon: '👮‍♂️', short: 'LSPD' },
  { id: 'BCSO', name: 'BCSO — Blaine County Sheriff\'s Office', icon: '🤠', short: 'BCSO' },
  { id: 'SAHP', name: 'SAHP — San Andreas Highway Patrol', icon: '🚓', short: 'SAHP' },
  { id: 'FIB', name: 'FIB — Federal Investigation Bureau', icon: '🕵️‍♂️', short: 'FIB' },
  { id: 'GOV', name: 'GOV — Government of San Andreas', icon: '🏛️', short: 'GOV' },
  { id: 'NG', name: 'NG — National Guard', icon: '🪖', short: 'NG' },
  { id: 'EMS', name: 'EMS — Emergency Medical Services', icon: '🚑', short: 'EMS' },
]

export default function OnboardingModal() {
  const { profile, completeOnboarding, isOnboardingModalOpen, setIsOnboardingModalOpen } = useUserProfile()
  const { setCurrentOrganization } = useDuty()
  const { showToast } = useToast()

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [name, setName] = useState(profile.name || '')
  const [organization, setOrganization] = useState(profile.organization || 'LSPD')
  const [passportNumber, setPassportNumber] = useState(profile.passportNumber || '')
  const [badgeNumber, setBadgeNumber] = useState(profile.badgeNumber || '')
  const [rank, setRank] = useState(profile.rank || '')
  const [callsign, setCallsign] = useState(profile.callsign || '')
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync state if profile loads with initial data
  useEffect(() => {
    if (profile.name) setName(profile.name)
    if (profile.organization) setOrganization(profile.organization)
    if (profile.passportNumber) setPassportNumber(profile.passportNumber)
    if (profile.badgeNumber) setBadgeNumber(profile.badgeNumber)
    if (profile.rank) setRank(profile.rank)
    if (profile.callsign) setCallsign(profile.callsign)
    if (profile.badgeNumber || profile.rank || profile.callsign) {
      setShowOptionalFields(true)
    }
  }, [profile])

  if (!isOnboardingModalOpen) return null

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError('Officer Name is required to initialize your profile.')
      return
    }
    if (!organization.trim()) {
      setValidationError('Please select an active Organization.')
      return
    }
    if (!passportNumber.trim()) {
      setValidationError('Passport / Player ID is required.')
      return
    }

    setStep('confirm')
  }

  const handleFinalize = async () => {
    try {
      setIsSubmitting(true)
      await completeOnboarding({
        name: name.trim(),
        organization: organization.trim(),
        passportNumber: passportNumber.trim(),
        badgeNumber: badgeNumber.trim() || undefined,
        rank: rank.trim() || undefined,
        callsign: callsign.trim() || undefined,
      })
      setCurrentOrganization(organization.trim())
      showToast(`Profile initialized: Officer ${name.trim()} (${organization.trim()})`, 'success')
      setStep('form')
    } catch (err: any) {
      setValidationError(`Failed to save profile: ${err.message}`)
      showToast('Error saving profile', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedOrgInfo = ORGANIZATIONS.find((o) => o.id === organization) || {
    id: organization,
    name: organization,
    icon: '🛡️',
    short: organization,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-2xl shadow-2xl overflow-hidden text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Operational Status Bar */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              {step === 'form' ? 'OPERATIONS CENTER INITIALIZATION' : 'IDENTITY VERIFICATION'}
            </span>
          </div>
          <span className="font-mono text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 uppercase font-semibold">
            {step === 'form' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </span>
        </div>

        {/* Content Body */}
        {step === 'form' ? (
          <form onSubmit={handleNext} className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black tracking-tight text-on-surface font-sans">
                Welcome to LEO-GRP
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Configure your Operations Center identity. This will personalize commands, arrest statements, and duty logs.
              </p>
            </div>

            {validationError && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg flex items-center gap-2 text-xs text-error font-mono">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Officer Name */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  Officer Full Name <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm">👤</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Avansh Vukovic"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Organization Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  Active Department / Organization <span className="text-primary">*</span>
                </label>
                <select
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans focus:outline-none focus:border-primary cursor-pointer transition-colors"
                >
                  {ORGANIZATIONS.map((org) => (
                    <option key={org.id} value={org.id} className="bg-surface-container text-on-surface">
                      {org.icon} {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-on-surface-variant/80 mt-1 font-mono">
                  Commands and radio channels will automatically adjust to this organization.
                </p>
              </div>

              {/* Passport / ID */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  Passport / Player ID <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm">🪪</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 129253"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Optional Fields Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="text-xs text-primary hover:text-primary/80 font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>{showOptionalFields ? '▼' : '▶'}</span>
                  <span>Operational Credentials (Badge, Rank, Callsign)</span>
                </button>

                {showOptionalFields && (
                  <div className="mt-3 p-3.5 bg-surface-container-lowest/60 border border-outline-variant/60 rounded-xl space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
                          Badge Number
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
                        <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
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
                      <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
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
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant/60">
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <span>Continue</span>
                <span>→</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Screen */
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-2xl mx-auto shadow-inner">
                ✓
              </div>
              <h2 className="text-xl font-black tracking-tight text-on-surface font-sans">
                You're all set.
              </h2>
              <p className="text-xs text-on-surface-variant font-mono">
                LEO-GRP Operations Center is ready for duty.
              </p>
            </div>

            {/* Credential Card */}
            <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">
                    {selectedOrgInfo.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface font-sans flex items-center gap-1.5">
                      <span>Officer {name.trim()}</span>
                      {rank.trim() && (
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {rank.trim()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant font-mono">
                      Passport #{passportNumber.trim()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-surface-container border border-outline-variant text-xs font-mono font-bold text-primary">
                    {organization}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-surface-container-low p-2 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant text-[10px] block uppercase">Badge Number</span>
                  <span className="text-on-surface font-bold">{badgeNumber.trim() || 'N/A'}</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant text-[10px] block uppercase">Unit Callsign</span>
                  <span className="text-on-surface font-bold">{callsign.trim() || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-colors"
              >
                ← Back to Edit
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Configuring...' : 'Enter Operations Center'}</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
