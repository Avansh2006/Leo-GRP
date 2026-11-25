// Quick action presets and templates.
// Built-in presets come from the active server pack (servers/<id>/presets.json);
// officers' own custom presets are kept in per-server storage.
import { getActivePack, scopedStorage } from '@/servers'
import type { WeaponPreset, ChargeTemplate, EventPreset } from '@/servers'

export type { WeaponPreset, ChargeTemplate, EventPreset }

// Read at call time so they always match the active server
export const getWeaponPresets = (): WeaponPreset[] => getActivePack().presets.loadouts
export const getChargeTemplates = (): ChargeTemplate[] => getActivePack().presets.chargeTemplates
export const getEventPresets = (): EventPreset[] => getActivePack().presets.events

// Save/load custom presets
export const saveCustomWeaponPreset = (preset: WeaponPreset) => {
  const custom = getCustomWeaponPresets()
  custom.push(preset)
  scopedStorage.setItem('customWeaponPresets', JSON.stringify(custom))
}

export const getCustomWeaponPresets = (): WeaponPreset[] => {
  const saved = scopedStorage.getItem('customWeaponPresets')
  return saved ? JSON.parse(saved) : []
}

export const deleteCustomWeaponPreset = (id: string) => {
  const custom = getCustomWeaponPresets()
  const updated = custom.filter(p => p.id !== id)
  scopedStorage.setItem('customWeaponPresets', JSON.stringify(updated))
}

export const saveCustomChargeTemplate = (template: ChargeTemplate) => {
  const custom = getCustomChargeTemplates()
  custom.push(template)
  scopedStorage.setItem('customChargeTemplates', JSON.stringify(custom))
}

export const getCustomChargeTemplates = (): ChargeTemplate[] => {
  const saved = scopedStorage.getItem('customChargeTemplates')
  return saved ? JSON.parse(saved) : []
}

export const deleteCustomChargeTemplate = (id: string) => {
  const custom = getCustomChargeTemplates()
  const updated = custom.filter(t => t.id !== id)
  scopedStorage.setItem('customChargeTemplates', JSON.stringify(updated))
}
