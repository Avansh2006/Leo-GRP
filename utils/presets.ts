// Quick action presets and templates
export interface WeaponPreset {
  id: string
  name: string
  vests: string[]
  weapons: { weapon: string; ammo: string }[]
}

export interface ChargeTemplate {
  id: string
  name: string
  description: string
  chargeCodes: string[]
}

export interface EventPreset {
  id: string
  name: string
  icon: string
}

// Common weapon loadouts
export const WEAPON_PRESETS: WeaponPreset[] = [
  {
    id: 'patrol',
    name: '🚓 Standard Patrol',
    vests: ['Vest Level 3'],
    weapons: [
      { weapon: 'Stun gun', ammo: '1' },
      { weapon: 'PDW submachine gun', ammo: '150' },
      { weapon: 'Police baton', ammo: '1' },
    ],
  },
  {
    id: 'tactical',
    name: '⚔️ Tactical Response',
    vests: ['Vest Level 5', 'Vest Level 6'],
    weapons: [
      { weapon: 'Assault rifle', ammo: '300' },
      { weapon: 'Heavy shotgun', ammo: '50' },
      { weapon: 'Stun gun', ammo: '1' },
      { weapon: 'Armor-piercing pistol', ammo: '100' },
    ],
  },
  {
    id: 'undercover',
    name: '🕵️ Undercover',
    vests: ['Vest Level 2'],
    weapons: [
      { weapon: 'Armor-piercing pistol', ammo: '100' },
      { weapon: 'Balaclava', ammo: '1' },
    ],
  },
  {
    id: 'sniper',
    name: '🎯 Sniper Support',
    vests: ['Vest Level 4'],
    weapons: [
      { weapon: 'Sniper rifle', ammo: '50' },
      { weapon: 'Armor-piercing pistol', ammo: '100' },
      { weapon: 'Stun gun', ammo: '1' },
    ],
  },
  {
    id: 'heavy',
    name: '💪 Heavy Response',
    vests: ['Vest Level 6'],
    weapons: [
      { weapon: 'Light machine gun', ammo: '500' },
      { weapon: 'Bullpup assault rifle', ammo: '300' },
      { weapon: 'Heavy shotgun', ammo: '50' },
      { weapon: 'Armor-piercing pistol', ammo: '100' },
    ],
  },
]

// Common charge templates
export const CHARGE_TEMPLATES: ChargeTemplate[] = [
  {
    id: 'traffic_stop',
    name: '🚦 Basic Traffic Stop',
    description: 'Common traffic violations',
    chargeCodes: ['T.C. 3-1', 'T.C. 3-2', 'T.C. 3-3'],
  },
  {
    id: 'robbery',
    name: '🏪 Store Robbery',
    description: 'Armed robbery charges',
    chargeCodes: ['P.C. 2-1', 'P.C. 5-1', 'P.C. 9-1'],
  },
  {
    id: 'assault',
    name: '👊 Assault & Battery',
    description: 'Assault related charges',
    chargeCodes: ['P.C. 4-1', 'P.C. 4-2', 'P.C. 9-1'],
  },
  {
    id: 'drug_possession',
    name: '💊 Drug Possession',
    description: 'Drug related charges',
    chargeCodes: ['P.C. 8-1', 'P.C. 8-2'],
  },
  {
    id: 'weapons',
    name: '🔫 Illegal Weapons',
    description: 'Weapons possession charges',
    chargeCodes: ['P.C. 7-1', 'P.C. 7-2', 'P.C. 7-3'],
  },
  {
    id: 'evading',
    name: '🏃 Evading & Resisting',
    description: 'Evading and resisting arrest',
    chargeCodes: ['P.C. 9-3', 'P.C. 9-4', 'T.C. 3-4'],
  },
]

// Event presets for counters
export const EVENT_PRESETS: EventPreset[] = [
  { id: 'store_robbery', name: 'Store Robbery', icon: '🏪' },
  { id: 'traffic_stop', name: 'Traffic Stop', icon: '🚗' },
  { id: 'traffic_pursuit', name: 'Traffic Pursuit', icon: '🚓' },
  { id: 'gang_activity', name: 'Gang Activity', icon: '👥' },
  { id: 'drug_bust', name: 'Drug Bust', icon: '💊' },
  { id: 'weapon_seizure', name: 'Weapon Seizure', icon: '🔫' },
  { id: 'hostage_situation', name: 'Hostage Situation', icon: '🆘' },
  { id: 'bank_robbery', name: 'Bank Robbery', icon: '🏦' },
  { id: 'vehicle_theft', name: 'Vehicle Theft', icon: '🚙' },
  { id: 'domestic_disturbance', name: 'Domestic Disturbance', icon: '🏠' },
  { id: 'assault_call', name: 'Assault Call', icon: '👊' },
  { id: 'checkpoint', name: 'Checkpoint', icon: '🛑' },
]

// Save/load custom presets
export const saveCustomWeaponPreset = (preset: WeaponPreset) => {
  const custom = getCustomWeaponPresets()
  custom.push(preset)
  localStorage.setItem('customWeaponPresets', JSON.stringify(custom))
}

export const getCustomWeaponPresets = (): WeaponPreset[] => {
  const saved = localStorage.getItem('customWeaponPresets')
  return saved ? JSON.parse(saved) : []
}

export const deleteCustomWeaponPreset = (id: string) => {
  const custom = getCustomWeaponPresets()
  const updated = custom.filter(p => p.id !== id)
  localStorage.setItem('customWeaponPresets', JSON.stringify(updated))
}

export const saveCustomChargeTemplate = (template: ChargeTemplate) => {
  const custom = getCustomChargeTemplates()
  custom.push(template)
  localStorage.setItem('customChargeTemplates', JSON.stringify(custom))
}

export const getCustomChargeTemplates = (): ChargeTemplate[] => {
  const saved = localStorage.getItem('customChargeTemplates')
  return saved ? JSON.parse(saved) : []
}

export const deleteCustomChargeTemplate = (id: string) => {
  const custom = getCustomChargeTemplates()
  const updated = custom.filter(t => t.id !== id)
  localStorage.setItem('customChargeTemplates', JSON.stringify(updated))
}
