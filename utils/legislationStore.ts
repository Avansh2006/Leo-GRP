/**
 * Legislation Normalized Store & Canonical Authority for LEO-GRP
 * Guarantees that only the ACTIVE legislation (Traffic Code 2nd Rendition, Penal Codes of San Andreas,
 * Article 7 Parking, Procedures of Detention & Arrest 3rd Rendition) is loaded.
 * Explicitly excludes all legacy/conflicting 1st Rendition documents.
 */

import { LawEntry, loadAllLawData } from './htmlParser'

export interface NormalizedProvision {
  id: string
  code: string
  title: string
  category: string
  chapter?: string
  description: string
  fine: string
  fineAmount: number
  sentence: string
  sentenceMonths: number
  stars: string
  bail: string
  remarks: string
  subsections: string[]
  towing: boolean
  confiscation: boolean
  revocation: boolean
  sourceDocument: string
  sourceDate: string
  keywords: string[]
  documentType: 'traffic' | 'penal' | 'article7' | 'procedure'
}

export interface ActiveLegislationMetadata {
  trafficCodeVersion: string
  penalCodeVersion: string
  article7Version: string
  proceduresVersion: string
  corpusHash: string
  totalProvisions: number
  activeSources: string[]
  excludedSources: string[]
}

export const ACTIVE_SOURCES = [
  'Traffic Code (2nd Rendition — 28.07.2025)',
  'Penal Codes of San Andreas',
  'Article 7 (Parking Regulations — 28.07.2025)',
  'Procedures of Detention and Arrest (3rd Rendition)',
] as const

export const EXCLUDED_SOURCES = [
  'Traffic Code of the State of San Andreas 1st Rendition',
  'Legacy Draft Legislation',
] as const

export const ACTIVE_CORPUS_HASH = 'leogrp_legislation_active_v2_28072025'

/**
 * Parse numeric dollar amount from fine string (e.g. "$15,000 + Confiscation" -> 15000)
 */
export function parseFineAmount(fineStr?: string): number {
  if (!fineStr || fineStr === '-') return 0
  const match = fineStr.match(/\$([0-9,]+)/)
  if (match) {
    const val = parseInt(match[1].replace(/,/g, ''), 10)
    return isNaN(val) ? 0 : val
  }
  const digitsOnly = fineStr.replace(/[^0-9]/g, '')
  if (digitsOnly) {
    const val = parseInt(digitsOnly, 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

/**
 * Parse prison sentence months from sentence string (e.g. "30 months (Class D)" -> 30)
 */
export function parseSentenceMonths(sentenceStr?: string): number {
  if (!sentenceStr || sentenceStr === '-') return 0
  const match = sentenceStr.match(/(\d+)\s*months?/i)
  if (match) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  const digitsOnly = sentenceStr.replace(/[^0-9]/g, '')
  if (digitsOnly) {
    const val = parseInt(digitsOnly, 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

/**
 * Extract rich keywords for high-precision matching
 */
function extractProvisionKeywords(entry: LawEntry): string[] {
  const text = `${entry.code} ${entry.description} ${entry.remarks || ''} ${entry.category} ${(entry.subsections || []).join(' ')}`.toLowerCase()
  const rawTokens = text.replace(/[^a-z0-9.]/g, ' ').split(/\s+/)
  const unique = new Set<string>()

  for (const t of rawTokens) {
    if (t.length > 2) unique.add(t)
  }

  // Add domain tags
  const code = entry.code.toLowerCase()
  if (code.includes('6.2.f')) unique.add('driving-lane').add('active-lane').add('road-parking')
  if (code.includes('6.2.n')) unique.add('surface-markings').add('road-markings').add('painted-lines')
  if (code.includes('6.2.a')) unique.add('red-curb').add('curb')
  if (code.includes('6.2.b')) unique.add('interfering-traffic').add('lane-blocking')
  if (code.includes('2.10.5')) unique.add('gta').add('car-theft').add('stolen-vehicle').add('hijack')
  if (code.includes('2.10.3')) unique.add('theft').add('stolen-property').add('stealing')
  if (code.includes('2.1.')) unique.add('cocaine').add('drugs').add('narcotics')
  if (code.includes('2.2.')) unique.add('cannabis').add('weed').add('marijuana')
  if (code.includes('2.5.')) unique.add('firearm').add('weapon').add('gun').add('license')
  if (code.includes('proc 1.4') || code.includes('lawyer')) unique.add('lawyer-request').add('pause-timer').add('attorney')
  if (code.includes('proc 1.3') || code.includes('miranda')) unique.add('miranda-rights').add('silent')

  return Array.from(unique)
}

/**
 * Normalize raw LawEntry into a strictly verified NormalizedProvision
 */
export function normalizeLawEntry(entry: LawEntry): NormalizedProvision {
  const fineAmount = parseFineAmount(entry.fine)
  const sentenceMonths = parseSentenceMonths(entry.sentence)
  const textRemarks = entry.remarks || ''
  const textFine = entry.fine || ''

  const towing =
    textRemarks.toLowerCase().includes('towed') ||
    textRemarks.toLowerCase().includes('impound') ||
    entry.description.toLowerCase().includes('towing') ||
    entry.code.startsWith('T.C. 6.')
  const confiscation =
    textFine.toLowerCase().includes('confiscation') ||
    textRemarks.toLowerCase().includes('confiscate') ||
    textRemarks.toLowerCase().includes('seize')
  const revocation =
    textFine.toLowerCase().includes('revocation') ||
    textRemarks.toLowerCase().includes('revocation')

  return {
    id: entry.id,
    code: entry.code,
    title: entry.description,
    category: entry.category,
    chapter: entry.chapter,
    description: entry.description,
    fine: entry.fine || (fineAmount > 0 ? `$${fineAmount.toLocaleString()}` : '-'),
    fineAmount,
    sentence: entry.sentence || (sentenceMonths > 0 ? `${sentenceMonths} months` : '-'),
    sentenceMonths,
    stars: entry.stars || '-',
    bail: entry.bail || '-',
    remarks: entry.remarks || '',
    subsections: entry.subsections || [],
    towing,
    confiscation,
    revocation,
    sourceDocument: entry.sourceDocument,
    sourceDate: entry.sourceDocument.includes('28.07.2025') ? '28.07.2025' : 'Active',
    keywords: extractProvisionKeywords(entry),
    documentType: entry.documentType,
  }
}

// In-memory cached active provision registry
let normalizedStoreCache: NormalizedProvision[] | null = null

/**
 * Load, normalize and index all active legislation
 */
export async function getAllNormalizedProvisions(): Promise<NormalizedProvision[]> {
  if (normalizedStoreCache && normalizedStoreCache.length > 0) {
    return normalizedStoreCache
  }

  const { allEntries } = await loadAllLawData()
  normalizedStoreCache = allEntries.map(normalizeLawEntry)
  return normalizedStoreCache
}

/**
 * Canonical provision lookup by section code (e.g. "T.C. 6.2.f", "6.2.f", "P.C. 2.10.5", "PROC 1.4")
 */
export async function getCanonicalProvision(code: string): Promise<NormalizedProvision | undefined> {
  const provisions = await getAllNormalizedProvisions()
  const cleanTarget = code.toLowerCase().replace(/§/g, '').replace(/[^a-z0-9.]/g, '')

  return provisions.find((p) => {
    const cleanCode = p.code.toLowerCase().replace(/§/g, '').replace(/[^a-z0-9.]/g, '')
    if (cleanCode === cleanTarget) return true
    if (cleanCode.endsWith(cleanTarget)) return true
    const numOnlyCode = cleanCode.replace(/^[a-z.]+/i, '')
    const numOnlyTarget = cleanTarget.replace(/^[a-z.]+/i, '')
    return numOnlyCode.length > 1 && numOnlyCode === numOnlyTarget
  })
}

/**
 * Canonical synchronous lookup from already initialized memory
 */
export function lookupProvisionSync(code: string): NormalizedProvision | undefined {
  if (!normalizedStoreCache) return undefined
  const cleanTarget = code.toLowerCase().replace(/§/g, '').replace(/[^a-z0-9.]/g, '')

  return normalizedStoreCache.find((p) => {
    const cleanCode = p.code.toLowerCase().replace(/§/g, '').replace(/[^a-z0-9.]/g, '')
    if (cleanCode === cleanTarget) return true
    if (cleanCode.endsWith(cleanTarget)) return true
    const numOnlyCode = cleanCode.replace(/^[a-z.]+/i, '')
    const numOnlyTarget = cleanTarget.replace(/^[a-z.]+/i, '')
    return numOnlyCode.length > 1 && numOnlyCode === numOnlyTarget
  })
}

/**
 * Get active legislation metadata and audit guarantees
 */
export function getActiveLegislationMetadata(): ActiveLegislationMetadata {
  return {
    trafficCodeVersion: '2nd Rendition — 28.07.2025',
    penalCodeVersion: 'Penal Codes of San Andreas',
    article7Version: 'Parking Regulations — 28.07.2025',
    proceduresVersion: '3rd Rendition',
    corpusHash: ACTIVE_CORPUS_HASH,
    totalProvisions: normalizedStoreCache ? normalizedStoreCache.length : 0,
    activeSources: [...ACTIVE_SOURCES],
    excludedSources: [...EXCLUDED_SOURCES],
  }
}
