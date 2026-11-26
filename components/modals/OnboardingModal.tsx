/**
 * First-Time User Onboarding Modal for LEO-GRP
 * Lightweight, tactical precision wizard for configuring officer identity and active organization.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'
import { useServerPack } from '@/servers'
import ServerPicker from '@/components/ServerPicker'
import { useT } from '@/i18n/I18nProvider'

export default function OnboardingModal() {
  const t = useT()
  const pack = useServerPack()
  const ORGANIZATIONS = pack.departments.map((d) => ({ id: d.id, name: `${d.id} — ${d.name}`, icon: d.icon, short: d.id }))
  const { profile, completeOnboarding, isOnboardingModalOpen, setIsOnboardingModalOpen } = useUserProfile()
  const { setCurrentOrganization } = useDuty()
  const { showToast } = useToast()

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [name, setName] = useState(profile.name || '')
  const [organization, setOrganization] = useState(profile.organization || pack.server.defaultDepartment)
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
      setValidationError(t('onboarding.errName'))
      return
    }
    if (!organization.trim()) {
      setValidationError(t('onboarding.errOrg'))
      return
    }
    if (!passportNumber.trim()) {
      setValidationError(t('onboarding.errPassport'))
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
      showToast(t('onboarding.toastDone', { name: name.trim(), org: organization.trim() }), 'success')
      setStep('form')
    } catch (err: any) {
      setValidationError(`Failed to save profile: ${err.message}`)
      showToast(t('onboarding.toastError'), 'error')
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
              {step === 'form' ? t('onboarding.stepSetup') : t('onboarding.stepVerify')}
            </span>
          </div>
          <span className="font-mono text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 uppercase font-semibold">
            {step === 'form' ? t('onboarding.step', { n: 1 }) : t('onboarding.step', { n: 2 })}
          </span>
        </div>

        {/* Content Body */}
        {step === 'form' ? (
          <form onSubmit={handleNext} className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black tracking-tight text-on-surface font-sans">
                {t('onboarding.welcome')}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('onboarding.intro')}
              </p>
            </div>

            {validationError && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg flex items-center gap-2 text-xs text-error font-mono">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* RP Server */}
              <ServerPicker />

              {/* Officer Name */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  {t('onboarding.name')} <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm">👤</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={t('onboarding.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface font-sans placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Organization Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  {t('onboarding.department')} <span className="text-primary">*</span>
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
                  {t('onboarding.departmentHint')}
                </p>
              </div>

              {/* Passport / ID */}
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                  {t('onboarding.passport')} <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm">🪪</span>
                  <input
                    type="text"
                    required
                    placeholder={t('onboarding.passportPlaceholder')}
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
                  <span>{t('onboarding.optional')}</span>
                </button>

                {showOptionalFields && (
                  <div className="mt-3 p-3.5 bg-surface-container-lowest/60 border border-outline-variant/60 rounded-xl space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
                          {t('onboarding.badge')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('onboarding.badgePlaceholder')}
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
                          {t('onboarding.rank')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('onboarding.rankPlaceholder')}
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-sans focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-on-surface-variant mb-1 uppercase">
                        {t('onboarding.callsign')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('onboarding.callsignPlaceholder')}
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
                <span>{t('common.continue')}</span>
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
                {t('onboarding.done')}
              </h2>
              <p className="text-xs text-on-surface-variant font-mono">
                {t('onboarding.ready')}
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
                      <span>{t('common.officerName', { name: name.trim() })}</span>
                      {rank.trim() && (
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {rank.trim()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant font-mono">
                      {t('common.passportNo', { n: passportNumber.trim() })}
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
                  <span className="text-on-surface-variant text-[10px] block uppercase">{t('onboarding.badge')}</span>
                  <span className="text-on-surface font-bold">{badgeNumber.trim() || 'N/A'}</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant text-[10px] block uppercase">{t('onboarding.callsign')}</span>
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
                ← {t('onboarding.back')}
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <span>{isSubmitting ? t('onboarding.saving') : t('onboarding.enter')}</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
