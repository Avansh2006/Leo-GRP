/**
 * Legislation Retriever & Context Engine for LEO-GRP Legislation Assistant
 * 100% Client-side, offline-first, question-aware retrieval and structured context builder.
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
  matchedTokens?: string[]
}

export interface RetrievalResult {
  query: string
  cleanedQuery: string
  detectedSection?: string
  intent: 'penalty' | 'arrest' | 'refusal_id' | 'dui_traffic' | 'weapons' | 'lawyer' | 'general'
  sources: RetrievedSource[]
  contextText: string
  hasMatch: boolean
}

export interface ConversationTurn {
  sender: 'user' | 'assistant'
  text: string
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'this', 'that', 'these', 'those', 'can', 'i', 'you', 'they', 'we', 'do',
  'does', 'how', 'when', 'where', 'why', 'should', 'would', 'could', 'about', 'under',
  'are', 'if', 'someone', 'person', 'say', 'tell', 'mean', 'meaning', 'apply', 'applies',
  'happens', 'mention', 'mentioned', 'situation', 'based', 'provision', 'rule', 'rules',
  'law', 'laws', 'act', 'code', 'codes', 'give', 'gives', 'get', 'gets'
])

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
 * Extract exact section code references from query
 * e.g. "§ 3.5", "3.5", "tc 3.5", "p.c. 2.1.1", "2.1.1", "tc 7.1", "proc 1.4"
 */
export function extractSectionCode(query: string): string | undefined {
  const norm = query.toLowerCase().replace(/§/g, '').trim()
  
  // Match patterns like "p.c. 2.1.1", "pc 2.1.1", "t.c. 3.5", "tc 3.5", "proc 1.5", "7.1", "2.6.4", "3.5"
  const fullCodeMatch = norm.match(/\b(p\.c\.|t\.c\.|pc|tc|proc)\s*([0-9]+(?:\.[0-9a-z]+)*)\b/i)
  if (fullCodeMatch) {
    const prefix = fullCodeMatch[1].toUpperCase().replace(/\./g, '')
    const num = fullCodeMatch[2]
    return `${prefix} ${num}`
  }

  const numOnlyMatch = norm.match(/\b([0-9]+\.[0-9]+(?:\.[0-9a-z]+)*)\b/)
  if (numOnlyMatch) {
    return numOnlyMatch[1]
  }

  return undefined
}

/**
 * Detect user legal intent from query
 */
export function detectQueryIntent(query: string): 'penalty' | 'arrest' | 'refusal_id' | 'dui_traffic' | 'weapons' | 'lawyer' | 'general' {
  const q = query.toLowerCase()

  if (q.includes('fine') || q.includes('sentence') || q.includes('jail') || q.includes('month') || q.includes('star') || q.includes('bail') || q.includes('penalty') || q.includes('penalties') || q.includes('how much') || q.includes('cost')) {
    return 'penalty'
  }
  if (q.includes('refus') || q.includes('identif') || q.includes('passport') || q.includes('mask') || q.includes('name') || q.includes('show id') || q.includes('disobey') || q.includes('comply')) {
    return 'refusal_id'
  }
  if (q.includes('lawyer') || q.includes('attorney') || q.includes('counsel') || q.includes('miranda') || q.includes('rights')) {
    return 'lawyer'
  }
  if (q.includes('dui') || q.includes('drunk') || q.includes('alcohol') || q.includes('drugs') || q.includes('speed') || q.includes('lane') || q.includes('racing') || q.includes('park') || q.includes('tow') || q.includes('impound') || q.includes('traffic')) {
    return 'dui_traffic'
  }
  if (q.includes('weapon') || q.includes('gun') || q.includes('open carry') || q.includes('brandish') || q.includes('serial') || q.includes('ammo') || q.includes('firearm') || q.includes('xxx')) {
    return 'weapons'
  }
  if (q.includes('arrest') || q.includes('detain') || q.includes('handcuff') || q.includes('taze') || q.includes('search')) {
    return 'arrest'
  }

  return 'general'
}

/**
 * Retrieve top relevant legislation provisions for a user query with question-awareness
 */
export async function retrieveLegislationContext(
  query: string,
  topK = 4,
  conversationHistory: ConversationTurn[] = []
): Promise<RetrievalResult> {
  const normQuery = normalizeQuery(query)
  if (!normQuery) {
    return {
      query,
      cleanedQuery: '',
      intent: 'general',
      sources: [],
      contextText: '',
      hasMatch: false,
    }
  }

  const { allEntries } = await loadAllLawData()
  const detectedSection = extractSectionCode(query)
  const intent = detectQueryIntent(query)

  // Meaningful content tokens (excluding stop words)
  const queryTokens = normQuery
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  // If follow-up question (e.g. "what about the penalty for this?"), incorporate previous user/assistant context
  const previousTopicTokens: string[] = []
  if (conversationHistory.length > 0 && queryTokens.length <= 3) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.sender === 'assistant')
    if (lastAssistantMsg) {
      const prevSection = extractSectionCode(lastAssistantMsg.text)
      if (prevSection) {
        previousTopicTokens.push(prevSection.toLowerCase())
      }
    }
  }

  const scoredSources: RetrievedSource[] = []

  for (const entry of allEntries) {
    const codeNorm = normalizeQuery(entry.code)
    const descNorm = normalizeQuery(entry.description)
    const remarksNorm = normalizeQuery(entry.remarks || '')
    const catNorm = normalizeQuery(entry.category || '')

    let score = 0
    const matchedTokens: string[] = []

    // 1. Direct section number matching
    if (detectedSection) {
      const cleanTarget = detectedSection.toLowerCase().replace(/[^0-9a-z]/g, '')
      const cleanCode = codeNorm.replace(/[^0-9a-z]/g, '')
      if (cleanCode.endsWith(cleanTarget) || cleanCode === cleanTarget || codeNorm.includes(detectedSection.toLowerCase())) {
        score += 250
        matchedTokens.push(`Section: ${entry.code}`)
      }
    }

    // 2. Exact / strong title match
    if (descNorm === normQuery) {
      score += 180
      matchedTokens.push('Exact Title')
    } else if (descNorm.startsWith(normQuery)) {
      score += 120
      matchedTokens.push('Title Prefix')
    } else if (descNorm.includes(normQuery) && normQuery.length > 3) {
      score += 80
      matchedTokens.push('Title Match')
    }

    // 3. Meaningful token matches
    for (const token of queryTokens) {
      let tokenMatched = false
      if (codeNorm.includes(token)) {
        score += 45
        tokenMatched = true
      }
      if (descNorm.includes(token)) {
        score += 35
        tokenMatched = true
      }
      if (catNorm.includes(token)) {
        score += 15
        tokenMatched = true
      }
      if (remarksNorm.includes(token)) {
        score += 12
        tokenMatched = true
      }
      if (tokenMatched) {
        matchedTokens.push(token)
      }
    }

    // 4. Intent & Domain boost
    if (intent === 'refusal_id') {
      if (entry.code.includes('PROC 1.5') || entry.code.includes('PROC 1.1')) score += 90
      if (entry.description.toLowerCase().includes('mask') || entry.description.toLowerCase().includes('identification') || entry.description.toLowerCase().includes('disobedience') || entry.description.toLowerCase().includes('resisting')) score += 70
      if (entry.remarks.toLowerCase().includes('mask') || entry.remarks.toLowerCase().includes('passport') || entry.remarks.toLowerCase().includes('identification')) score += 40
    } else if (intent === 'lawyer') {
      if (entry.code.includes('PROC 1.4') || entry.code.includes('PROC 1.3')) score += 100
    } else if (intent === 'dui_traffic' || normQuery.includes('traffic')) {
      if (entry.documentType === 'traffic' || entry.documentType === 'article7') score += 60
      if (normQuery.includes('dui') || normQuery.includes('drunk') || normQuery.includes('alcohol')) {
        if (entry.code.includes('3.5')) score += 150
      }
      if (normQuery.includes('speed') && entry.code.includes('3.1')) score += 120
    } else if (intent === 'weapons') {
      if (entry.category.toLowerCase().includes('weapon') || entry.category.toLowerCase().includes('prohibited')) score += 40
      if (normQuery.includes('open carry') && entry.code.includes('2.5.3')) score += 120
      if (normQuery.includes('brandish') && entry.code.includes('2.5.6')) score += 120
      if (normQuery.includes('license') && entry.code.includes('2.5.1')) score += 120
    }

    // 5. Previous follow-up context boost
    for (const prevTok of previousTopicTokens) {
      if (codeNorm.includes(prevTok)) {
        score += 80
        matchedTokens.push(`Follow-up context: ${prevTok}`)
      }
    }

    if (score > 30) {
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
        matchedTokens: Array.from(new Set(matchedTokens)),
      })
    }
  }

  scoredSources.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const topSources = scoredSources.slice(0, topK)

  if (topSources.length === 0) {
    return {
      query,
      cleanedQuery: queryTokens.join(' '),
      detectedSection,
      intent,
      sources: [],
      contextText: 'No matching legislation provision found in the active Traffic Code (2nd Rendition) or Penal Code.',
      hasMatch: false,
    }
  }

  // Construct structured context text
  const contextLines = topSources.map((s, idx) => {
    let line = `[Source ${idx + 1}] § ${s.code} — ${s.title} (${s.sourceDocument})\n`
    if (s.fine && s.fine !== '-') line += `  • Fine: ${s.fine}\n`
    if (s.sentence && s.sentence !== '-') line += `  • Sentence: ${s.sentence}\n`
    if (s.stars && s.stars !== '-') line += `  • Wanted Level: ${s.stars}\n`
    if (s.bail && s.bail !== '-') line += `  • Bail: ${s.bail}\n`
    if (s.remarks && s.remarks !== '-') line += `  • Official Legal Text / Requirements: ${s.remarks}\n`
    return line
  })

  return {
    query,
    cleanedQuery: queryTokens.join(' '),
    detectedSection,
    intent,
    sources: topSources,
    contextText: contextLines.join('\n'),
    hasMatch: true,
  }
}

/**
 * Generates a dynamic, question-aware legal response directly answering the user's specific inquiry
 */
export function generateQuestionAwareResponse(
  query: string,
  result: RetrievalResult,
  conversationHistory: ConversationTurn[] = []
): string {
  if (!result.hasMatch || result.sources.length === 0) {
    return `I couldn't find a provision in the active Traffic Code (2nd Rendition — 28.07.2025) or Penal Codes that directly answers: "${query}".\n\n💡 **Search Tips:**\n• Search by section code (e.g. \`§ 3.5\`, \`2.1.1\`, \`2.6.4\`, \`PROC 1.5\`)\n• Search by specific legal keyword (e.g. \`DUI\`, \`speed limit\`, \`refusal to identify\`, \`mask\`, \`brandishing\`)`
  }

  const primary = result.sources[0]
  const qLower = query.toLowerCase()
  let response = ''

  // 1. SPECIFIC INTENT: Penalties / Fines
  if (result.intent === 'penalty' || qLower.includes('how much') || qLower.includes('fine') || qLower.includes('sentence') || qLower.includes('bail')) {
    response += `Under **§ ${primary.code} (${primary.title})** [${primary.sourceDocument}], the penalties are defined as:\n\n`
    if (primary.fine && primary.fine !== '-') response += `• 💰 **Fine:** ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') response += `• ⏳ **Incarceration:** ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') response += `• ⭐ **Wanted Level:** ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') response += `• ⚖️ **Bail Status:** ${primary.bail}\n`
    if (primary.remarks && primary.remarks !== '-') response += `\n**Statutory Definition:**\n${primary.remarks}\n`
  }
  // 2. SPECIFIC INTENT: Can I arrest / Custodial Enforcement
  else if (result.intent === 'arrest' || qLower.includes('can i arrest') || qLower.includes('custody')) {
    const hasSentence = primary.sentence && primary.sentence !== '-'
    const hasStars = primary.stars && primary.stars !== '-'

    response += `**Custodial Authority for § ${primary.code} (${primary.title}):**\n\n`
    if (hasSentence || hasStars) {
      response += `✅ **Yes, custodial arrest is authorized.**\n`
      response += `• This provision carries a jail sentence of **${primary.sentence}** and a wanted level of **${primary.stars}**.\n`
      if (primary.bail && primary.bail.toLowerCase().includes('no bail')) {
        response += `• ⚠️ **Bail Status:** NO BAIL permitted for this offense.\n`
      }
    } else {
      response += `ℹ️ **Citation / Fine Only (Non-Custodial):**\n`
      response += `• § ${primary.code} is punishable by a **${primary.fine || 'fine'}** without a mandatory jail sentence, unless the suspect fails to comply or commits related offenses.\n`
    }

    if (primary.remarks && primary.remarks !== '-') {
      response += `\n**Legal Grounding:**\n${primary.remarks}\n`
    }
  }
  // 3. SPECIFIC INTENT: Refusal to identify / Mask removal / Compliance
  else if (result.intent === 'refusal_id' || qLower.includes('refus') || qLower.includes('mask') || qLower.includes('identify')) {
    response += `Under official arrest and identification protocols (**§ ${primary.code} — ${primary.title}**):\n\n`
    
    if (primary.code.includes('PROC')) {
      response += `• **Mask Protocol:** Give the suspect **10 seconds** to voluntarily remove any mask/facial covering.\n`
      response += `• **Refusal / Resistance:** If they refuse or attempt to flee, officers are authorized to taze, handcuff, forcefully remove, and destroy the mask.\n`
      response += `• **Identification Search:** Search suspect pockets via *Organisation > Find personal information* to retrieve passport/state identification.\n`
    } else {
      response += `• **Statutory Requirement:** ${primary.remarks || primary.title}\n`
      if (primary.fine && primary.fine !== '-') response += `• **Fine:** ${primary.fine}\n`
      if (primary.sentence && primary.sentence !== '-') response += `• **Sentence:** ${primary.sentence} (${primary.stars || 'Wanted'})\n`
    }
  }
  // 4. SPECIFIC INTENT: DUI / Traffic Violations
  else if (result.intent === 'dui_traffic' || qLower.includes('dui') || qLower.includes('drunk') || qLower.includes('speed')) {
    response += `According to **§ ${primary.code} (${primary.title})** in the *Traffic Code (2nd Rendition)*:\n\n`
    if (primary.remarks && primary.remarks !== '-') {
      response += `• **Prohibition:** ${primary.remarks}\n`
    }
    response += `• **Sanctions:** Fine: **${primary.fine || 'N/A'}** | Sentence: **${primary.sentence || 'None'}** ${primary.stars ? `| Stars: ${primary.stars}` : ''}\n`
  }
  // 5. GENERAL / EXPLANATION INTENT
  else {
    response += `Under **§ ${primary.code} (${primary.title})** [${primary.sourceDocument}]:\n\n`
    if (primary.remarks && primary.remarks !== '-') {
      response += `📋 **Legal Requirement & Scope:**\n${primary.remarks}\n\n`
    }
    response += `⚖️ **Consequences:**\n`
    if (primary.fine && primary.fine !== '-') response += `• **Fine:** ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') response += `• **Sentence:** ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') response += `• **Wanted Level:** ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') response += `• **Bail:** ${primary.bail}\n`
  }

  // Related provisions
  if (result.sources.length > 1) {
    response += `\n📚 **Supporting / Related Provisions:**\n`
    result.sources.slice(1, 3).forEach((sec) => {
      response += `• **§ ${sec.code}** — ${sec.title} (${sec.fine && sec.fine !== '-' ? `Fine: ${sec.fine}` : ''}${sec.sentence && sec.sentence !== '-' ? `, ${sec.sentence}` : ''})\n`
    })
  }

  response += `\n*Source: [§ ${primary.code}]*`
  return response
}
