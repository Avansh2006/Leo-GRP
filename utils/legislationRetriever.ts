/**
 * Legislation Retriever & Context Engine for LEO-GRP Legislation Assistant
 * 100% Client-side, offline-first, scenario-aware retrieval, topic filtering, and structured legal reasoning.
 */

import { loadAllLawData, LawEntry } from './htmlParser'

export type LegalDomainTopic =
  | 'PARKING'
  | 'MOVING_TRAFFIC'
  | 'THEFT_GTA'
  | 'PUBLIC_SERVANT_DUTY'
  | 'DISOBEDIENCE_EVADING'
  | 'WEAPONS'
  | 'DRUGS'
  | 'VIOLENT_CRIMES'
  | 'ARREST_PROCEDURE'
  | 'GENERAL'

export interface ScenarioConcepts {
  actions: string[]
  negatedActions: string[]
  objects: string[]
  locations: string[]
  actor: 'CITIZEN' | 'PUBLIC_SERVANT' | 'LAWYER' | 'UNKNOWN'
  primaryTopic: LegalDomainTopic
  secondaryTopics: LegalDomainTopic[]
}

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
  topicScore: number
  matchedTokens?: string[]
  applicabilityStatus?: 'APPLICABLE' | 'POTENTIALLY_APPLICABLE' | 'UNCERTAIN'
  missingFacts?: string
}

export interface RejectedSource {
  code: string
  title: string
  topic: LegalDomainTopic
  score: number
  reason: string
}

export interface RetrievalResult {
  query: string
  normalizedQuery: string
  concepts: ScenarioConcepts
  detectedSection?: string
  intent: 'charge_inquiry' | 'penalty' | 'arrest' | 'procedure' | 'general'
  sources: RetrievedSource[]
  rejectedSources: RejectedSource[]
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
  'law', 'laws', 'act', 'code', 'codes', 'give', 'gives', 'get', 'gets', 'add', 'put',
  'charge', 'charges', 'he', 'she', 'his', 'her', 'their', 'them', 'him', 'has', 'have', 'had', 'been'
])

/**
 * Normalize query string
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?,!;:"'(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract exact section code from query (e.g. "§ 3.5", "3.5", "tc 6.2.f", "p.c. 2.1.1")
 */
export function extractSectionCode(query: string): string | undefined {
  const norm = query.toLowerCase().replace(/§/g, '').trim()
  
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
 * Extract semantic scenario concepts, negations, objects, and topics
 */
export function extractScenarioConcepts(query: string, history: ConversationTurn[] = []): ScenarioConcepts {
  const norm = normalizeQuery(query)
  const actions: string[] = []
  const negatedActions: string[] = []
  const objects: string[] = []
  const locations: string[] = []
  let actor: 'CITIZEN' | 'PUBLIC_SERVANT' | 'LAWYER' | 'UNKNOWN' = 'UNKNOWN'

  // 1. Check for explicit negations / contrasts
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+stop(?:ped|ping)?\b/)) {
    negatedActions.push('STOPPING')
  }
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+park(?:ed|ing)?\b/)) {
    negatedActions.push('PARKING')
  }
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+steal(?:ing)?|stolen\b/)) {
    negatedActions.push('THEFT')
  }

  // 2. Actor identification
  if (norm.match(/\b(public servant|civil servant|officer|cop|police|deputy|trooper)\b/)) {
    actor = 'PUBLIC_SERVANT'
  } else if (norm.match(/\b(lawyer|attorney|counsel)\b/)) {
    actor = 'LAWYER'
  } else {
    actor = 'CITIZEN'
  }

  // 3. Identify Positive Actions
  if (norm.match(/\bpark(?:ed|ing|s)?\b/) && !negatedActions.includes('PARKING')) {
    actions.push('PARKING')
  }
  if (norm.match(/\bstop(?:ped|ping|s)?\b/) && !negatedActions.includes('STOPPING')) {
    actions.push('STOPPING')
  }
  if (
    norm.match(/\b(stole|steal|stolen|theft|rob|robbed|gta)\b/) ||
    norm.match(/\b(took|take|taking)\b.*\b(vehicle|car|automobile|property|money|goods|item|keys)\b/) ||
    norm.match(/\b(took|take|taking)\s+another\s+(?:person's|someone's)\s+(?:vehicle|car|property)\b/)
  ) {
    if (!negatedActions.includes('THEFT')) {
      actions.push('THEFT')
    }
  }
  if (norm.match(/\b(speed|speeding|fast|km\/h|mph|limit)\b/)) {
    actions.push('SPEEDING')
  }
  if (norm.match(/\b(follow(?:ing)?|distance|tailgat(?:e|ing)|closely)\b/)) {
    actions.push('FOLLOWING_DISTANCE')
  }
  if (norm.match(/\b(dui|drunk|alcohol|breathalyzer|intoxicated|drugs?)\b/)) {
    actions.push('DUI')
  }
  if (norm.match(/\b(refus(?:e|ed|ing|al)|disobey(?:ed|ing)?|ignore(?:d|ing)?)\b/)) {
    actions.push('DISOBEDIENCE')
  }
  if (norm.match(/\b(mask|passport|show\s+id|identify|identity)\b/)) {
    actions.push('IDENTIFICATION')
  }
  if (norm.match(/\b(open\s+carry|weapon|gun|firearm|brandish|ammo)\b/)) {
    actions.push('WEAPON_POSSESSION')
  }

  // 4. Identify Objects
  if (norm.match(/\b(car|vehicle|automobile|truck|bike|motorcycle|transport)\b/)) {
    objects.push('VEHICLE')
  }
  if (norm.match(/\b(gun|weapon|firearm|pistol|rifle|ammo)\b/)) {
    objects.push('WEAPON')
  }
  if (norm.match(/\b(mask|balaclava)\b/)) {
    objects.push('MASK')
  }
  if (norm.match(/\b(passport|id|identification|badge)\b/)) {
    objects.push('ID_CARD')
  }
  if (norm.match(/\b(marking|markings|lines?|yellow|curb|red\s+curb)\b/)) {
    objects.push('ROAD_MARKINGS')
  }

  // 5. Identify Locations
  if (norm.match(/\b(road|street|freeway|highway|lane|driving\s+lane|sidewalk|crosswalk|lawn|bus\s+stop|bridge|tunnel)\b/)) {
    if (norm.includes('driving lane') || norm.includes('lane')) locations.push('DRIVING_LANE')
    else if (norm.includes('highway') || norm.includes('freeway')) locations.push('HIGHWAY')
    else if (norm.includes('sidewalk')) locations.push('SIDEWALK')
    else if (norm.includes('crosswalk')) locations.push('CROSSWALK')
    else if (norm.includes('red curb') || norm.includes('curb')) locations.push('RED_CURB')
    else if (norm.includes('road marking') || norm.includes('marking')) locations.push('ROAD_MARKINGS')
    else locations.push('ROAD')
  }

  // 6. Determine Primary Topic
  let primaryTopic: LegalDomainTopic = 'GENERAL'
  const secondaryTopics: LegalDomainTopic[] = []

  if (actions.includes('THEFT')) {
    primaryTopic = 'THEFT_GTA'
  } else if (actor === 'PUBLIC_SERVANT' && (actions.includes('DISOBEDIENCE') || norm.includes('order') || norm.includes('duty') || norm.includes('act'))) {
    primaryTopic = 'PUBLIC_SERVANT_DUTY'
  } else if (actions.includes('PARKING') || (objects.includes('VEHICLE') && locations.length > 0 && !actions.includes('SPEEDING') && !actions.includes('THEFT') && !actions.includes('DUI') && !actions.includes('FOLLOWING_DISTANCE'))) {
    primaryTopic = 'PARKING'
  } else if (actions.includes('DISOBEDIENCE') || actions.includes('IDENTIFICATION')) {
    primaryTopic = 'DISOBEDIENCE_EVADING'
    secondaryTopics.push('ARREST_PROCEDURE')
  } else if (actions.includes('DUI') || actions.includes('SPEEDING') || actions.includes('FOLLOWING_DISTANCE') || actions.includes('STOPPING')) {
    primaryTopic = 'MOVING_TRAFFIC'
  } else if (actions.includes('WEAPON_POSSESSION')) {
    primaryTopic = 'WEAPONS'
  }

  return {
    actions,
    negatedActions,
    objects,
    locations,
    actor,
    primaryTopic,
    secondaryTopics,
  }
}

/**
 * Classify a LawEntry into its native domain topic
 */
export function classifyEntryTopic(entry: LawEntry): LegalDomainTopic {
  const code = entry.code.toUpperCase()
  const desc = entry.description.toLowerCase()
  const cat = entry.category.toUpperCase()

  if (code.startsWith('PROC')) return 'ARREST_PROCEDURE'
  if (code.startsWith('TC 7.') || code.startsWith('T.C. 6.2') || desc.includes('parking') || cat.includes('PARKING')) {
    return 'PARKING'
  }
  if (code.startsWith('T.C. 3.') || code.startsWith('T.C. 5.') || code.startsWith('§3.1') || desc.includes('speed limit') || desc.includes('distance') || desc.includes('influence') || desc.includes('stopping')) {
    return 'MOVING_TRAFFIC'
  }
  if (desc.includes('theft') || desc.includes('robbery') || desc.includes('grand theft auto') || desc.includes('stolen')) {
    return 'THEFT_GTA'
  }
  if (cat.includes('CIVIL SERVANT') || desc.includes('public servant') || desc.includes('civil servant') || code.startsWith('P.C. 2.7.') || code.startsWith('P.C. 4.3.')) {
    return 'PUBLIC_SERVANT_DUTY'
  }
  if (desc.includes('disobedience') || desc.includes('resisting') || desc.includes('evading') || desc.includes('lawful order') || code.startsWith('P.C. 2.3.') || code.startsWith('P.C. 3.18.')) {
    return 'DISOBEDIENCE_EVADING'
  }
  if (desc.includes('weapon') || desc.includes('open carry') || desc.includes('brandishing') || cat.includes('WEAPON') || code.startsWith('P.C. 2.5.') || code.startsWith('§2.4')) {
    return 'WEAPONS'
  }
  if (cat.includes('DRUGS') || desc.includes('cocaine') || desc.includes('cannabis') || code.startsWith('P.C. 2.1.') || code.startsWith('P.C. 2.2.')) {
    return 'DRUGS'
  }
  if (desc.includes('murder') || desc.includes('manslaughter') || desc.includes('battery') || desc.includes('assault') || code.startsWith('P.C. 2.6.') || code.startsWith('P.C. 2.8.')) {
    return 'VIOLENT_CRIMES'
  }

  return 'GENERAL'
}

/**
 * Retrieve top relevant legislation provisions with strict scenario & topic filtering
 */
export async function retrieveLegislationContext(
  query: string,
  topK = 3,
  conversationHistory: ConversationTurn[] = []
): Promise<RetrievalResult> {
  const normQuery = normalizeQuery(query)
  if (!normQuery) {
    return {
      query,
      normalizedQuery: '',
      concepts: {
        actions: [],
        negatedActions: [],
        objects: [],
        locations: [],
        actor: 'UNKNOWN',
        primaryTopic: 'GENERAL',
        secondaryTopics: [],
      },
      intent: 'general',
      sources: [],
      rejectedSources: [],
      contextText: '',
      hasMatch: false,
    }
  }

  const { allEntries } = await loadAllLawData()
  const detectedSection = extractSectionCode(query)
  const concepts = extractScenarioConcepts(query, conversationHistory)
  const isChargeQuery = normQuery.includes('charge') || normQuery.includes('what can i add') || normQuery.includes('violation') || normQuery.includes('what applies')
  const intent = isChargeQuery ? 'charge_inquiry' : 'general'

  const queryTokens = normQuery
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  const scoredSources: RetrievedSource[] = []
  const rejectedSources: RejectedSource[] = []

  for (const entry of allEntries) {
    const entryTopic = classifyEntryTopic(entry)
    const codeNorm = normalizeQuery(entry.code)
    const descNorm = normalizeQuery(entry.description)
    const remarksNorm = normalizeQuery(entry.remarks || '')

    let score = 0
    let topicScore = 0
    const matchedTokens: string[] = []

    // 1. Direct section number query (highest priority)
    if (detectedSection) {
      const cleanTarget = detectedSection.toLowerCase().replace(/[^0-9a-z]/g, '')
      const cleanCode = codeNorm.replace(/[^0-9a-z]/g, '')
      if (cleanCode.endsWith(cleanTarget) || cleanCode === cleanTarget || codeNorm.includes(detectedSection.toLowerCase())) {
        score += 300
        matchedTokens.push(`Section: ${entry.code}`)
      }
    }

    // 2. Exact or high-match Title
    if (descNorm === normQuery) {
      score += 200
      matchedTokens.push('Exact Title Match')
    } else if (descNorm.startsWith(normQuery)) {
      score += 130
      matchedTokens.push('Title Prefix Match')
    } else if (descNorm.includes(normQuery) && normQuery.length > 3) {
      score += 80
      matchedTokens.push('Title Substring Match')
    }

    // 3. Meaningful content token overlap
    for (const token of queryTokens) {
      if (codeNorm.includes(token)) {
        score += 30
        matchedTokens.push(token)
      }
      if (descNorm.includes(token)) {
        score += 25
        matchedTokens.push(token)
      }
      if (remarksNorm.includes(token)) {
        score += 10
        matchedTokens.push(token)
      }
    }

    // 4. Scenario & Topic Weighting / Cross-Topic Negative Penalties
    if (concepts.primaryTopic !== 'GENERAL') {
      if (entryTopic === concepts.primaryTopic) {
        topicScore += 140
        score += 140
      } else if (concepts.secondaryTopics.includes(entryTopic)) {
        topicScore += 70
        score += 70
      } else {
        // HEAVY NEGATIVE PENALTIES FOR TOPIC MISMATCHES
        if (concepts.primaryTopic === 'PARKING') {
          if (entryTopic === 'THEFT_GTA' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'DRUGS' || entryTopic === 'VIOLENT_CRIMES') {
            score -= 500
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about PARKING, but provision is ${entryTopic}`,
            })
            continue
          }
          if (entryTopic === 'MOVING_TRAFFIC') {
            score -= 300
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about PARKING, but provision is MOVING_TRAFFIC (${entry.description})`,
            })
            continue
          }
        } else if (concepts.primaryTopic === 'THEFT_GTA') {
          if (entryTopic === 'PARKING' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'MOVING_TRAFFIC') {
            score -= 500
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about THEFT, but provision is ${entryTopic}`,
            })
            continue
          }
        } else if (concepts.primaryTopic === 'PUBLIC_SERVANT_DUTY') {
          if (entryTopic === 'PARKING' || entryTopic === 'THEFT_GTA' || entryTopic === 'MOVING_TRAFFIC') {
            score -= 500
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about PUBLIC_SERVANT, but provision is ${entryTopic}`,
            })
            continue
          }
        } else if (concepts.primaryTopic === 'MOVING_TRAFFIC') {
          if (entryTopic === 'PARKING' || entryTopic === 'THEFT_GTA' || entryTopic === 'PUBLIC_SERVANT_DUTY') {
            score -= 500
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about MOVING_TRAFFIC, but provision is ${entryTopic}`,
            })
            continue
          }
          if (entry.documentType === 'penal' && !normQuery.includes('p.c.') && !normQuery.includes('pc')) {
            score -= 400
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Document Mismatch: Query is about MOVING_TRAFFIC, penal code suppressed without explicit P.C. reference`,
            })
            continue
          }
        }
      }
    }

    // 5. Explicit Negation / Contrast Suppression
    if (concepts.negatedActions.includes('STOPPING')) {
      if (entry.code.includes('3.2.3') || entry.code.includes('3.2.4') || descNorm.includes('stopping')) {
        score -= 800
        rejectedSources.push({
          code: entry.code,
          title: entry.description,
          topic: entryTopic,
          score,
          reason: 'Explicitly Excluded: User negated stopping ("not stopped")',
        })
        continue
      }
    }

    // 6. Domain-Specific Nuance Boosts
    if (concepts.primaryTopic === 'PARKING') {
      if (concepts.locations.includes('DRIVING_LANE') && entry.code.includes('6.2.f')) score += 140
      if (concepts.locations.includes('ROAD_MARKINGS') && entry.code.includes('6.2.n')) score += 160
      if (concepts.locations.includes('CROSSWALK') && entry.code.includes('6.2.d')) score += 160
      if (concepts.locations.includes('RED_CURB') && entry.code.includes('6.2.a')) score += 160
      if (concepts.locations.includes('SIDEWALK') && entry.code.includes('6.2.e')) score += 160
      if (concepts.locations.includes('HIGHWAY') && entry.code.includes('6.2.i')) score += 160
      
      // General road parking query -> prioritize lane obstruction and surface markings
      if (concepts.locations.includes('ROAD')) {
        if (entry.code.includes('6.2.f') || entry.code.includes('6.2.n') || entry.code.includes('6.2.b')) {
          score += 90
        }
      }
    } else if (concepts.primaryTopic === 'THEFT_GTA') {
      if (concepts.objects.includes('VEHICLE') || normQuery.includes('car') || normQuery.includes('vehicle')) {
        if (entry.code.includes('2.10.5')) score += 180 // Grand Theft Auto
        if (entry.code.includes('2.10.3')) score += 130 // Theft of Property
      }
    } else if (concepts.primaryTopic === 'PUBLIC_SERVANT_DUTY') {
      // Disobedience / Failure to act vs violent crimes
      if (normQuery.includes('order') || normQuery.includes('ignore') || normQuery.includes('disobey') || normQuery.includes('duty')) {
        if (entry.code.includes('2.7.2')) score += 180 // Refusal of duty to act
        if (entry.code.includes('2.7.3')) score += 160 // Failure to act by civil servant
        if (entry.code.includes('2.7.4')) score += 150 // Negligence
        if (entry.code.includes('2.3.1')) score += 150 // Disobedience to lawful order
        // Suppress assault/battery against public servant when user query is about duty/order
        if (entry.code.includes('3.9') || entry.code.includes('3.10')) score -= 200
      }
    } else if (concepts.primaryTopic === 'MOVING_TRAFFIC') {
      if (concepts.actions.includes('FOLLOWING_DISTANCE')) {
        if (entry.code.includes('3.4.3')) score += 250 // Failure to keep distance
      } else if (concepts.actions.includes('DUI')) {
        if (entry.code.includes('3.5')) score += 250 // DUI
      } else if (concepts.actions.includes('SPEEDING')) {
        if (entry.code.includes('3.1') || entry.code.includes('5.5')) score += 200
      }
    }

    // 7. Strict Confidence Minimum Threshold
    if (score >= 60) {
      let applicabilityStatus: 'APPLICABLE' | 'POTENTIALLY_APPLICABLE' | 'UNCERTAIN' = 'POTENTIALLY_APPLICABLE'
      let missingFacts = ''

      if (entry.code.includes('6.2.n')) {
        missingFacts = 'Requires confirmation that parking violated painted road lines or surface markings.'
      } else if (entry.code.includes('6.2.f')) {
        missingFacts = 'Requires confirmation that the vehicle was parked inside an active travel lane.'
      } else if (entry.code.includes('6.2.b')) {
        missingFacts = 'Requires confirmation that the vehicle interfered with regular lane traffic.'
      } else if (entry.code.includes('2.10.5')) {
        missingFacts = 'Requires evidence that the vehicle was unlawfully seized/driven without owner consent.'
      }

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
        topicScore,
        matchedTokens: Array.from(new Set(matchedTokens)),
        applicabilityStatus,
        missingFacts,
      })
    }
  }

  scoredSources.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Dynamic Top-K: Only return top provisions that are within 50% of the top match
  let finalSources: RetrievedSource[] = []
  if (scoredSources.length > 0) {
    const topScore = scoredSources[0].relevanceScore
    finalSources = scoredSources
      .filter((s) => s.relevanceScore >= topScore * 0.5)
      .slice(0, topK)
  }

  if (finalSources.length === 0) {
    return {
      query,
      normalizedQuery: normQuery,
      concepts,
      detectedSection,
      intent,
      sources: [],
      rejectedSources: rejectedSources.slice(0, 5),
      contextText: 'I couldn\'t find a provision in the active legislation that directly matches the situation described.',
      hasMatch: false,
    }
  }

  const contextLines = finalSources.map((s, idx) => {
    let line = `[Source ${idx + 1}] § ${s.code} — ${s.title} (${s.sourceDocument})\n`
    if (s.fine && s.fine !== '-') line += `  • Fine: ${s.fine}\n`
    if (s.sentence && s.sentence !== '-') line += `  • Sentence: ${s.sentence}\n`
    if (s.stars && s.stars !== '-') line += `  • Wanted Level: ${s.stars}\n`
    if (s.remarks && s.remarks !== '-') line += `  • Statutory Requirement: ${s.remarks}\n`
    if (s.missingFacts) line += `  • Evidentiary Fact Needed: ${s.missingFacts}\n`
    return line
  })

  return {
    query,
    normalizedQuery: normQuery,
    concepts,
    detectedSection,
    intent,
    sources: finalSources,
    rejectedSources: rejectedSources.slice(0, 5),
    contextText: contextLines.join('\n'),
    hasMatch: true,
  }
}

/**
 * Generate a structured, question-aware legal response distinguishing applicability from relevance
 */
export function generateQuestionAwareResponse(
  query: string,
  result: RetrievalResult,
  conversationHistory: ConversationTurn[] = []
): string {
  if (!result.hasMatch || result.sources.length === 0) {
    return `I couldn't find a provision in the active Traffic Code (2nd Rendition — 28.07.2025) or Penal Codes that directly matches the situation described in: "${query}".\n\n💡 **Clarification Needed:**\n• Provide specific facts (e.g. was the vehicle obstructing a driving lane, parked on painted lines, or parked on a red curb?)\n• Or search by section code (e.g. \`§ 6.2.f\`, \`2.10.5\`, \`3.5\`)`
  }

  const primary = result.sources[0]
  const qLower = query.toLowerCase()

  // 1. CHARGE INQUIRY & SCENARIO ANALYSIS
  if (result.intent === 'charge_inquiry' || result.concepts.primaryTopic === 'PARKING' || result.concepts.primaryTopic === 'THEFT_GTA') {
    let response = `### Potentially Applicable Provisions\n\n`

    result.sources.forEach((s) => {
      response += `**§ ${s.code} — ${s.title}**\n`
      if (s.remarks && s.remarks !== '-') {
        response += `• **Why it may apply:** ${s.remarks}\n`
      }
      if (s.fine && s.fine !== '-') {
        response += `• **Penalties:** Fine: ${s.fine}${s.sentence && s.sentence !== '-' ? ` | Sentence: ${s.sentence}` : ''}\n`
      }
      if (s.missingFacts) {
        response += `• ⚠️ **What is missing:** ${s.missingFacts}\n`
      }
      response += `\n`
    })

    response += `### Officer Guidance & Legal Assessment\n`
    if (result.concepts.primaryTopic === 'PARKING') {
      response += `Do not charge automatically. A parking violation requires specific factual evidence that the vehicle was either in an active driving lane (§ 6.2.f) or in direct breach of road markings (§ 6.2.n). If the vehicle constitutes an active traffic obstruction, towing is authorized under officer discretion (§ 6.2).\n`
    } else if (result.concepts.primaryTopic === 'THEFT_GTA') {
      response += `Verify vehicle ownership and whether the suspect unlawfully entered or drove the vehicle without authorization before applying grand theft auto (§ 2.10.5).\n`
    } else {
      response += `Only apply charges when observed facts satisfy all statutory elements of the cited provision.\n`
    }

    response += `\n### Authoritative Sources\n`
    result.sources.forEach((s) => {
      response += `[§ ${s.code}] `
    })

    return response.trim()
  }

  // 2. PENALTIES & FINES
  if (qLower.includes('how much') || qLower.includes('fine') || qLower.includes('penalty') || qLower.includes('sentence')) {
    let response = `Under **§ ${primary.code} (${primary.title})** [${primary.sourceDocument}]:\n\n`
    if (primary.fine && primary.fine !== '-') response += `• 💰 **Fine:** ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') response += `• ⏳ **Incarceration:** ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') response += `• ⭐ **Wanted Level:** ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') response += `• ⚖️ **Bail Status:** ${primary.bail}\n`
    if (primary.remarks && primary.remarks !== '-') response += `\n**Statutory Definition:**\n${primary.remarks}\n`
    response += `\n*Source: [§ ${primary.code}]*`
    return response
  }

  // 3. ARREST AUTHORITY
  if (qLower.includes('can i arrest') || qLower.includes('custody')) {
    const hasSentence = primary.sentence && primary.sentence !== '-'
    const hasStars = primary.stars && primary.stars !== '-'

    let response = `**Custodial Enforcement for § ${primary.code} (${primary.title}):**\n\n`
    if (hasSentence || hasStars) {
      response += `✅ **Yes, custodial arrest is authorized.**\n`
      response += `• This offense carries a sentence of **${primary.sentence}** and a wanted level of **${primary.stars}**.\n`
      if (primary.bail && primary.bail.toLowerCase().includes('no bail')) {
        response += `• ⚠️ **Bail Status:** NO BAIL permitted for this offense.\n`
      }
    } else {
      response += `ℹ️ **Non-Custodial (Citation / Fine Only):**\n`
      response += `• § ${primary.code} is punishable by **${primary.fine || 'a fine'}** without an automatic custodial jail sentence, unless the suspect refuses compliance or commits additional offenses.\n`
    }
    if (primary.remarks && primary.remarks !== '-') response += `\n**Statutory Elements:**\n${primary.remarks}\n`
    response += `\n*Source: [§ ${primary.code}]*`
    return response
  }

  // 4. DEFAULT EXPLANATION
  let response = `Under **§ ${primary.code} (${primary.title})** [${primary.sourceDocument}]:\n\n`
  if (primary.remarks && primary.remarks !== '-') {
    response += `📋 **Statutory Scope & Elements:**\n${primary.remarks}\n\n`
  }
  response += `⚖️ **Statutory Consequences:**\n`
  if (primary.fine && primary.fine !== '-') response += `• **Fine:** ${primary.fine}\n`
  if (primary.sentence && primary.sentence !== '-') response += `• **Sentence:** ${primary.sentence}\n`
  if (primary.stars && primary.stars !== '-') response += `• **Wanted Level:** ${primary.stars}\n`

  if (result.sources.length > 1) {
    response += `\n📚 **Related Provisions:**\n`
    result.sources.slice(1, 3).forEach((sec) => {
      response += `• **§ ${sec.code}** — ${sec.title} (${sec.fine ? `Fine: ${sec.fine}` : ''})\n`
    })
  }

  response += `\n*Source: [§ ${primary.code}]*`
  return response
}
