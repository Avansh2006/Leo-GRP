/**
 * Legislation Retriever & Context Engine for LEO-GRP Legislation Assistant
 * 100% Client-side, offline-first, local search and structured context builder.
 */

import { loadAllLawData, LawEntry } from './htmlParser'

export interface RetrievedSource {
  code: string
  title: string
  sourceDocument: string
  fine?: string
  sentence?: string
  stars?: string
  bail?: string
  remarks?: string
  relevanceScore: number
}

export interface RetrievalResult {
  query: string
  sources: RetrievedSource[]
  contextText: string
  hasMatch: boolean
}

/**
 * Normalize query for consistent matching without losing legal specifics
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?,!;:"'(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retrieve top relevant legislation provisions for a user query
 */
export async function retrieveLegislationContext(
  query: string,
  topK = 5
): Promise<RetrievalResult> {
  const normQuery = normalizeQuery(query)
  if (!normQuery) {
    return { query, sources: [], contextText: '', hasMatch: false }
  }

  const { allEntries } = await loadAllLawData()
  const queryTokens = normQuery.split(' ').filter((t) => t.length > 1)
  const scoredSources: RetrievedSource[] = []

  for (const entry of allEntries) {
    const codeNorm = normalizeQuery(entry.code)
    const descNorm = normalizeQuery(entry.description)
    const remarksNorm = normalizeQuery(entry.remarks || '')
    const catNorm = normalizeQuery(entry.category || '')

    let score = 0

    // Exact code match (e.g., "p.c. 2.1.1" or "t.c. 3.5")
    if (codeNorm === normQuery || codeNorm.replace(/\s+/g, '') === normQuery.replace(/\s+/g, '')) {
      score += 150
    } else if (codeNorm.includes(normQuery)) {
      score += 100
    } else if (descNorm === normQuery) {
      score += 90
    } else if (descNorm.startsWith(normQuery)) {
      score += 75
    } else if (descNorm.includes(normQuery)) {
      score += 50
    }

    // Token overlap scoring
    let tokenMatches = 0
    for (const token of queryTokens) {
      if (codeNorm.includes(token)) {
        score += 30
        tokenMatches++
      }
      if (descNorm.includes(token)) {
        score += 20
        tokenMatches++
      }
      if (remarksNorm.includes(token)) {
        score += 10
        tokenMatches++
      }
      if (catNorm.includes(token)) {
        score += 8
        tokenMatches++
      }
    }

    // Specific traffic/penal legal keywords boost
    if (normQuery.includes('traffic') || normQuery.includes('speed') || normQuery.includes('parking') || normQuery.includes('drive') || normQuery.includes('vehicle')) {
      if (entry.documentType === 'traffic') score += 15
    }
    if (normQuery.includes('arrest') || normQuery.includes('weapon') || normQuery.includes('drug') || normQuery.includes('murder') || normQuery.includes('assault')) {
      if (entry.documentType === 'penal') score += 15
    }

    if (score > 0 && tokenMatches > 0) {
      scoredSources.push({
        code: entry.code,
        title: entry.description,
        sourceDocument: entry.sourceDocument,
        fine: entry.fine,
        sentence: entry.sentence,
        stars: entry.stars,
        bail: entry.bail,
        remarks: entry.remarks,
        relevanceScore: score,
      })
    }
  }

  scoredSources.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const topSources = scoredSources.slice(0, topK)

  if (topSources.length === 0) {
    return {
      query,
      sources: [],
      contextText: 'No matching legislation provision found in the active Traffic Code or Penal Code.',
      hasMatch: false,
    }
  }

  // Construct structured context text
  const contextLines = topSources.map((s, idx) => {
    let line = `[Source ${idx + 1}] § ${s.code} — ${s.title} (${s.sourceDocument})\n`
    if (s.fine && s.fine !== '-') line += `  - Fine: ${s.fine}\n`
    if (s.sentence && s.sentence !== '-') line += `  - Sentence: ${s.sentence}\n`
    if (s.stars && s.stars !== '-') line += `  - Wanted Level: ${s.stars}\n`
    if (s.bail && s.bail !== '-') line += `  - Bail: ${s.bail}\n`
    if (s.remarks && s.remarks !== '-') line += `  - Text / Remarks: ${s.remarks}\n`
    return line
  })

  const contextText = contextLines.join('\n')

  return {
    query,
    sources: topSources,
    contextText,
    hasMatch: true,
  }
}

/**
 * Standard System Prompt for the Legislation Assistant
 */
export const LEGISLATION_ASSISTANT_SYSTEM_PROMPT = `
You are the official LEO-GRP Legislation Assistant for Law Enforcement Officers in San Andreas.
Your primary role is to explain official legal provisions from the active Traffic Code (2nd Rendition — 28.07.2025) and Penal Codes of San Andreas.

CRITICAL RULES:
1. The retrieved legislation context provided to you is the ONLY authoritative source of truth.
2. ALWAYS cite the exact section code using bracketed notation, e.g. [§ T.C. 3.5] or [§ P.C. 2.1.1].
3. Clearly explain what the law requires, prohibited actions, fines, sentences, and star levels based directly on the cited provisions.
4. NEVER invent laws, section numbers, or penalties that are not in the context.
5. If the retrieved context does not contain sufficient information to answer the question, clearly state: "The active legislation database does not contain a specific provision covering this scenario."
6. Provide concise, clear, and professional explanations suited for active patrol duty.
`.trim()

/**
 * Generates an instant, highly readable legal breakdown without needing an LLM download
 */
export function generateInstantLegalExplanation(result: RetrievalResult): string {
  if (!result.hasMatch || result.sources.length === 0) {
    return `No matching legislation provision found in the active Traffic Code (2nd Rendition) or Penal Code for: "${result.query}".\n\nTry searching by section number (e.g. 3.5, 2.1.1) or specific legal terms like "speed limit", "reckless", or "weapons".`
  }

  const primary = result.sources[0]
  let answer = `According to **§ ${primary.code} (${primary.title})** under the *${primary.sourceDocument}*:\n\n`

  if (primary.remarks && primary.remarks !== '-') {
    answer += `📋 **Legal Definition & Requirements:**\n${primary.remarks}\n\n`
  }

  answer += `⚖️ **Penalties & Consequences:**\n`
  if (primary.fine && primary.fine !== '-') answer += `• **Fine:** ${primary.fine}\n`
  if (primary.sentence && primary.sentence !== '-') answer += `• **Sentence:** ${primary.sentence}\n`
  if (primary.stars && primary.stars !== '-') answer += `• **Wanted Level:** ${primary.stars}\n`
  if (primary.bail && primary.bail !== '-') answer += `• **Bail:** ${primary.bail}\n`

  if (result.sources.length > 1) {
    answer += `\n🔍 **Related Provisions Found:**\n`
    result.sources.slice(1, 4).forEach((sec) => {
      answer += `• **§ ${sec.code}** — ${sec.title} (${sec.fine ? `Fine: ${sec.fine}` : ''}${sec.sentence ? `, Sentence: ${sec.sentence}` : ''})\n`
    })
  }

  return answer
}
