/**
 * Legislation loading for the active server.
 *
 * Laws come from public/servers/<serverId>/laws.json, which `npm run import-laws` builds from
 * the source files listed in servers/<serverId>/legislation.json (see utils/lawImport.ts).
 */
import { getActiveServerId } from '@/servers'
import type { LawEntry, LawsFile } from './lawImport'

export type { LawEntry } from './lawImport'
export { generateLawId } from './lawImport'

export interface ParsedLawData {
  entries: LawEntry[]
  categories: string[]
  sourceDocument: string
}

export interface AllLawData {
  penalCodes: ParsedLawData
  trafficCodes: ParsedLawData
  article7: ParsedLawData
  procedures: ParsedLawData
  allEntries: LawEntry[]
}

function group(entries: LawEntry[], docType: LawEntry['documentType']): ParsedLawData {
  const list = entries.filter((e) => e.documentType === docType)
  return {
    entries: list,
    categories: Array.from(new Set(list.map((e) => e.category))),
    sourceDocument: list[0]?.sourceDocument || '',
  }
}

// One fetch per page load; several screens ask for laws at once.
let cache: { serverId: string; promise: Promise<AllLawData> } | null = null

async function fetchLaws(serverId: string): Promise<AllLawData> {
  let entries: LawEntry[] = []
  try {
    const res = await fetch(`/servers/${encodeURIComponent(serverId)}/laws.json`)
    if (res.ok) {
      const file = (await res.json()) as LawsFile
      entries = Array.isArray(file.entries) ? file.entries : []
    } else if (res.status !== 404) {
      console.error(`Failed to load laws for ${serverId}: HTTP ${res.status}`)
    }
  } catch (error) {
    console.error(`Failed to load laws for ${serverId}:`, error)
  }
  return {
    penalCodes: group(entries, 'penal'),
    trafficCodes: group(entries, 'traffic'),
    article7: group(entries, 'article7'),
    procedures: group(entries, 'procedure'),
    allEntries: entries,
  }
}

/** All legislation for the active server. A server without laws.json gets empty lists. */
export const loadAllLawData = (): Promise<AllLawData> => {
  const serverId = getActiveServerId()
  if (!cache || cache.serverId !== serverId) {
    const promise = fetchLaws(serverId)
    cache = { serverId, promise }
    // Don't keep a failed/empty result forever if the network hiccups
    promise.then((d) => { if (d.allEntries.length === 0 && cache?.promise === promise) cache = null })
  }
  return cache.promise
}

/**
 * Scored in-memory filter and rank for legislation entries
 */
export const filterLawEntries = (entries: LawEntry[], searchTerm: string): LawEntry[] => {
  if (!searchTerm.trim()) return entries

  const term = searchTerm.toLowerCase().trim()
  const scored: { entry: LawEntry; score: number }[] = []

  for (const entry of entries) {
    const codeLower = entry.code.toLowerCase()
    const descLower = entry.description.toLowerCase()
    const remarksLower = (entry.remarks || '').toLowerCase()
    const catLower = (entry.category || '').toLowerCase()

    let score = 0

    // Exact code match (e.g. "p.c. 2.1.1" or "2.1.1" or "t.c. 3.5")
    if (codeLower === term || codeLower.replace(/\s+/g, '') === term.replace(/\s+/g, '')) {
      score += 150
    } else if (codeLower.includes(term)) {
      score += 100
    } else if (descLower === term) {
      score += 90
    } else if (descLower.startsWith(term)) {
      score += 75
    } else if (descLower.includes(term)) {
      score += 50
    } else if (remarksLower.includes(term)) {
      score += 25
    } else if (catLower.includes(term)) {
      score += 15
    }

    if (score > 0) {
      scored.push({ entry, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.entry)
}
