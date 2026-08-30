/**
 * Legislation Retriever & Context Engine for LEO-GRP Legislation Assistant
 * 100% Client-side, offline-first, scenario-aware retrieval, topic filtering, and Crisp Charge Identification.
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
  | 'ABANDONMENT'
  | 'GENERAL'

export type QueryIntent =
  | 'CHARGE_INQUIRY'
  | 'EXPLANATION'
  | 'SCENARIO_YES_NO'
  | 'PROCEDURE'
  | 'PENALTY_INQUIRY'
  | 'GENERAL'

export interface ScenarioConcepts {
  actions: string[]
  negatedActions: string[]
  objects: string[]
  locations: string[]
  actor: 'CITIZEN' | 'PUBLIC_SERVANT' | 'LAWYER' | 'UNKNOWN'
  primaryTopic: LegalDomainTopic
  secondaryTopics: LegalDomainTopic[]
  hasMultipleViolations: boolean
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
  matchType?: 'DIRECT_MATCH' | 'CONDITIONAL_MATCH'
  conditionText?: string
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
  intent: QueryIntent
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
 * Detect query intent for appropriate response template
 */
export function detectQueryIntent(query: string, detectedSection?: string): QueryIntent {
  const norm = normalizeQuery(query)

  if (norm.match(/\b(how\s+much\s+(?:is\s+the\s+)?fine|what\s+is\s+the\s+fine|what\s+is\s+the\s+penalty|what\s+is\s+the\s+sentence|how\s+long\s+in\s+jail|bail\s+amount)\b/)) {
    return 'PENALTY_INQUIRY'
  }

  if (norm.match(/\b(can\s+i\s+charge|can\s+i\s+arrest|can\s+i\s+fine|can\s+i\s+give\s+a\s+ticket|is\s+it\s+illegal|is\s+it\s+allowed|is\s+it\s+a\s+crime|can\s+i\s+add\s+abandonment)\b/)) {
    return 'SCENARIO_YES_NO'
  }

  if (norm.match(/\b(how\s+do\s+i\s+handle|what\s+should\s+i\s+do|procedure|steps|protocol|handle\s+a\s+suspect|requesting\s+a\s+lawyer|miranda|reading\s+rights|doc\s+procedure|timer)\b/)) {
    return 'PROCEDURE'
  }

  if (norm.match(/\b(what\s+does\s+.*mean|explain|meaning\s+of|definition\s+of)\b/) || (detectedSection && norm.split(' ').length <= 4)) {
    return 'EXPLANATION'
  }

  if (
    norm.match(/\b(what\s+(?:can\s+be\s+the\s+)?charges?|what\s+can\s+i\s+charge|what\s+can\s+i\s+give|what\s+charges?\s+apply|what\s+ticket|what\s+fine|which\s+charges?|charges?\s+for|charge\s+someone\s+with|add\s+charges?|what\s+to\s+charge|charges?\s+apply)\b/) ||
    norm.match(/\b(parked|driving\s+lane|road\s+markings?|speeding|abandon|abandoned|stole|stealing|gta|theft|order)\b/)
  ) {
    return 'CHARGE_INQUIRY'
  }

  return 'GENERAL'
}

/**
 * Extract semantic scenario concepts, negations, objects, and topics with follow-up awareness
 */
export function extractScenarioConcepts(query: string, history: ConversationTurn[] = []): ScenarioConcepts {
  let combinedText = query
  if (history.length > 0) {
    const lastUserTurn = [...history].reverse().find((t) => t.sender === 'user')
    if (lastUserTurn) {
      combinedText = `${lastUserTurn.text} ${query}`
    }
  }

  const norm = normalizeQuery(query)
  const normCombined = normalizeQuery(combinedText)

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
  if ((norm.match(/\bpark(?:ed|ing|s)?\b/) || (normCombined.includes('park') && (norm.includes('lane') || norm.includes('marking') || norm.includes('curb') || norm.includes('road')))) && !negatedActions.includes('PARKING')) {
    actions.push('PARKING')
  }
  if (norm.match(/\bstop(?:ped|ping|s)?\b/) && !negatedActions.includes('STOPPING')) {
    actions.push('STOPPING')
  }
  if (norm.match(/\b(abandon|abandoned|abandonment|leaving\s+vehicle|unattended)\b/)) {
    actions.push('ABANDONMENT')
  }
  if (
    norm.match(/\b(stole|steal|stealing|stolen|theft|thief|rob|robbed|robbing|robbery|gta)\b/) ||
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
  if (normCombined.match(/\b(car|vehicle|automobile|truck|bike|motorcycle|transport)\b/)) {
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
  if (norm.match(/\b(marking|markings|lines?|surface\s+markings?)\b/)) {
    objects.push('ROAD_MARKINGS')
  }

  // 5. Identify Locations
  if (norm.match(/\b(driving\s+lane|active\s+lane|travel\s+lane)\b/)) {
    locations.push('DRIVING_LANE')
  } else if (norm.match(/\b(highway|freeway)\b/)) {
    locations.push('HIGHWAY')
  } else if (norm.match(/\b(sidewalk)\b/)) {
    locations.push('SIDEWALK')
  } else if (norm.match(/\b(crosswalk)\b/)) {
    locations.push('CROSSWALK')
  } else if (norm.match(/\b(red\s+curb|curb)\b/)) {
    locations.push('RED_CURB')
  } else if (norm.match(/\b(road\s+marking|road\s+markings|marking|markings|painted\s+lines?)\b/)) {
    locations.push('ROAD_MARKINGS')
  } else if (norm.match(/\b(road|street)\b/)) {
    locations.push('ROAD')
  }

  // Check if multiple independent violations are combined in scenario (e.g. "and also", "both", "in driving lane and violates markings")
  const hasMultipleViolations = norm.includes(' and ') && (locations.length > 1 || (locations.includes('DRIVING_LANE') && norm.includes('marking')))

  // 6. Determine Primary Topic
  let primaryTopic: LegalDomainTopic = 'GENERAL'
  const secondaryTopics: LegalDomainTopic[] = []

  if (actions.includes('ABANDONMENT')) {
    primaryTopic = 'ABANDONMENT'
    secondaryTopics.push('PARKING')
  } else if (actor === 'LAWYER' || norm.includes('lawyer') || norm.includes('counsel') || norm.includes('miranda') || norm.includes('rights')) {
    primaryTopic = 'ARREST_PROCEDURE'
  } else if (actions.includes('THEFT')) {
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
    hasMultipleViolations,
  }
}

/**
 * Classify a LawEntry into its native domain topic
 */
export function classifyEntryTopic(entry: LawEntry): LegalDomainTopic {
  const code = entry.code.toUpperCase()
  const desc = entry.description.toLowerCase()
  const cat = entry.category.toUpperCase()

  if (code.startsWith('PROC') || code.includes('LAWYER') || cat.includes('PROCEDURE')) return 'ARREST_PROCEDURE'
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
 * Get short factual condition text for a provision
 */
function getConditionText(code: string, desc: string): string {
  const c = code.toLowerCase()
  if (c.includes('6.2.f')) return 'The vehicle is parked on an active driving lane.'
  if (c.includes('6.2.n')) return 'The vehicle is parked in violation of road surface markings.'
  if (c.includes('6.2.a')) return 'The vehicle is parked next to a red curb.'
  if (c.includes('6.2.b')) return 'The vehicle interferes with moving traffic.'
  if (c.includes('6.2.d')) return 'The vehicle is parked on a pedestrian crosswalk.'
  if (c.includes('6.2.e')) return 'The vehicle is parked on a sidewalk.'
  if (c.includes('6.2.i')) return 'The vehicle is parked on a highway or freeway.'
  if (c.includes('2.10.5')) return 'The suspect unlawfully seizes, drives, or operates a motor vehicle without owner consent.'
  if (c.includes('2.10.3')) return 'The suspect unlawfully takes property belonging to another.'
  if (c.includes('2.7.2')) return 'A public servant refuses to perform their sworn lawful duty.'
  if (c.includes('2.7.3')) return 'A civil servant fails or neglects to perform their official responsibilities.'
  if (c.includes('4.3.1') || c.includes('4.3.2') || c.includes('4.3.3')) return 'A public servant fails to comply with official directives or orders.'
  if (c.includes('2.3.1')) return 'The suspect fails to comply with a lawful order given by an officer.'
  if (c.includes('3.4.3')) return 'The driver fails to maintain a safe following distance.'
  if (c.includes('3.5')) return 'The driver operates a vehicle under the influence of alcohol or narcotics.'
  if (c.includes('3.1') || c.includes('5.5')) return 'The driver exceeds the designated speed limit.'
  return desc
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
        hasMultipleViolations: false,
      },
      intent: 'GENERAL',
      sources: [],
      rejectedSources: [],
      contextText: '',
      hasMatch: false,
    }
  }

  const { allEntries } = await loadAllLawData()
  const detectedSection = extractSectionCode(query)
  const concepts = extractScenarioConcepts(query, conversationHistory)
  const intent = detectQueryIntent(query, detectedSection)

  const queryTokens = normQuery
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  const scoredSources: RetrievedSource[] = []
  const rejectedSources: RejectedSource[] = []

  for (const entry of allEntries) {
    const entryTopic = classifyEntryTopic(entry)
    const codeNorm = normalizeQuery(entry.code)
    const descNorm = normalizeQuery(entry.description)

    let score = 0
    let topicScore = 0
    const matchedTokens: string[] = []

    // 1. Direct section number query (highest priority)
    if (detectedSection) {
      const cleanTarget = detectedSection.toLowerCase().replace(/[^0-9a-z]/g, '')
      const cleanCode = codeNorm.replace(/[^0-9a-z]/g, '')
      if (cleanCode.endsWith(cleanTarget) || cleanCode === cleanTarget || codeNorm.includes(detectedSection.toLowerCase())) {
        score += 350
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
      if (descNorm.includes(token)) {
        score += 25
        matchedTokens.push(token)
      }
    }

    // 4. Topic Congruence Filtering & Penalties
    if (concepts.primaryTopic !== 'GENERAL') {
      if (entryTopic === concepts.primaryTopic || concepts.secondaryTopics.includes(entryTopic)) {
        topicScore += 120
        score += 120
      } else {
        if (concepts.primaryTopic === 'PARKING' || concepts.primaryTopic === 'ABANDONMENT') {
          if (entryTopic === 'THEFT_GTA' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'MOVING_TRAFFIC' || entryTopic === 'VIOLENT_CRIMES') {
            score -= 600
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about PARKING, but provision is ${entryTopic}`,
            })
            continue
          }
        } else if (concepts.primaryTopic === 'THEFT_GTA') {
          if (entryTopic === 'PARKING' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'MOVING_TRAFFIC') {
            score -= 600
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
            score -= 600
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
            score -= 600
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about MOVING_TRAFFIC, but provision is ${entryTopic}`,
            })
            continue
          }
        } else if (concepts.primaryTopic === 'ARREST_PROCEDURE') {
          if (entryTopic !== 'ARREST_PROCEDURE') {
            score -= 500
            rejectedSources.push({
              code: entry.code,
              title: entry.description,
              topic: entryTopic,
              score,
              reason: `Topic Mismatch: Query is about PROCEDURE, but provision is ${entryTopic}`,
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

    // 6. Domain-Specific Nuance Boosts & Match Types
    let matchType: 'DIRECT_MATCH' | 'CONDITIONAL_MATCH' = 'CONDITIONAL_MATCH'

    if (concepts.primaryTopic === 'PARKING') {
      if (concepts.locations.includes('DRIVING_LANE') && entry.code.includes('6.2.f')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('ROAD_MARKINGS') && entry.code.includes('6.2.n')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('CROSSWALK') && entry.code.includes('6.2.d')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('RED_CURB') && entry.code.includes('6.2.a')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('SIDEWALK') && entry.code.includes('6.2.e')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('HIGHWAY') && entry.code.includes('6.2.i')) {
        score += 200
        matchType = 'DIRECT_MATCH'
      } else if (concepts.locations.includes('ROAD') || concepts.actions.includes('PARKING')) {
        // General road parking query -> prioritize lane obstruction and surface markings
        if (entry.code.includes('6.2.f') || entry.code.includes('6.2.n')) {
          score += 100
        }
      }
    } else if (concepts.primaryTopic === 'THEFT_GTA') {
      if (concepts.objects.includes('VEHICLE') || normQuery.includes('car') || normQuery.includes('vehicle')) {
        if (entry.code.includes('2.10.5')) {
          score += 250
          matchType = 'DIRECT_MATCH'
        }
      }
    } else if (concepts.primaryTopic === 'PUBLIC_SERVANT_DUTY') {
      if (normQuery.includes('order') || normQuery.includes('ignore') || normQuery.includes('disobey') || normQuery.includes('duty')) {
        if (entry.code.includes('4.3.1') || entry.code.includes('4.3.2') || entry.code.includes('4.3.3') || entry.code.includes('2.7.2') || entry.code.includes('2.7.3')) {
          score += 220
          matchType = 'DIRECT_MATCH'
        }
        if (entry.code.includes('3.9') || entry.code.includes('3.10')) score -= 300
      }
    } else if (concepts.primaryTopic === 'ARREST_PROCEDURE') {
      if (normQuery.includes('lawyer') || normQuery.includes('attorney') || normQuery.includes('counsel')) {
        if (entry.code.includes('LAWYER') || descNorm.includes('lawyer') || descNorm.includes('counsel')) {
          score += 300
          matchType = 'DIRECT_MATCH'
        }
      }
    }

    // 7. Strict Confidence Minimum Threshold
    if (score >= 70) {
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
        matchType,
        conditionText: getConditionText(entry.code, entry.description),
      })
    }
  }

  scoredSources.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Dynamic Top-K: Only return matches within 50% score of top match
  let finalSources: RetrievedSource[] = []
  if (scoredSources.length > 0) {
    const topScore = scoredSources[0].relevanceScore
    finalSources = scoredSources
      .filter((s) => s.relevanceScore >= topScore * 0.5)
      .slice(0, topK)
  }

  if (finalSources.length === 0 && concepts.primaryTopic !== 'ABANDONMENT') {
    return {
      query,
      normalizedQuery: normQuery,
      concepts,
      detectedSection,
      intent,
      sources: [],
      rejectedSources: rejectedSources.slice(0, 5),
      contextText: 'I couldn\'t find a provision in the active legislation that directly answers this.',
      hasMatch: false,
    }
  }

  const contextLines = finalSources.map((s, idx) => {
    let line = `§ ${s.code} — ${s.title}\n`
    if (s.fine && s.fine !== '-') line += `  • Fine: ${s.fine}\n`
    if (s.sentence && s.sentence !== '-') line += `  • Sentence: ${s.sentence}\n`
    if (s.stars && s.stars !== '-') line += `  • Wanted Level: ${s.stars}\n`
    if (s.bail && s.bail !== '-') line += `  • Bail: ${s.bail}\n`
    line += `  • Condition: ${s.conditionText || s.title}\n`
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
    hasMatch: finalSources.length > 0 || concepts.primaryTopic === 'ABANDONMENT',
  }
}

/**
 * Generate a crisp, fast, charge-first legal response formatted for LEO workflows
 */
export function generateQuestionAwareResponse(
  query: string,
  result: RetrievalResult,
  conversationHistory: ConversationTurn[] = []
): string {
  const normQuery = normalizeQuery(query)

  // 1. ABANDONED VEHICLE INQUIRY
  if (result.concepts.primaryTopic === 'ABANDONMENT' || normQuery.includes('abandon')) {
    let text = `I couldn't find a specific vehicle-abandonment charge in the active legislation.\n\n`
    text += `If the vehicle is unlawfully parked or obstructing traffic, you may apply:\n\n`
    text += `**§ T.C. 6.2.f — Parking on a driving lane**\n- Fine: $10,000\n- Towing: Officer discretion\n\n`
    text += `**§ T.C. 6.2.n — Parking in violation of road surface markings**\n- Fine: $10,000\n- Towing: Officer discretion\n\n`
    text += `**Towing/Impound:** Authorized under officer discretion for obstructing or illegally parked vehicles (§ T.C. 6.2).`
    return text
  }

  // 2. NO MATCHES FOUND
  if (!result.hasMatch || result.sources.length === 0) {
    if (normQuery.includes('lawyer') || normQuery.includes('attorney') || normQuery.includes('counsel')) {
      return `I couldn't find a penal charge for requesting a lawyer in the active legislation.\n\nUnder **Legal Counsel Protocol (§ Procedure 1.4)**:\n1. Pause the 25-minute arrest processing timer.\n2. For private lawyer: detainee provides cell number; wait 15 minutes or 3 calls.\n3. For state lawyer: radio dispatch; wait 2 minutes, and if confirmed en route, wait up to 15 minutes.\n4. Verify lawyer's State ID / Bar license upon arrival.`
    }
    return `I couldn't find a provision in the active legislation that directly answers this.`
  }

  const primary = result.sources[0]
  const isDirectSingleMatch = result.sources.length === 1 || primary.matchType === 'DIRECT_MATCH'

  // 3. PROCEDURE INQUIRIES (e.g. Lawyer Request, Arrest steps)
  if (result.intent === 'PROCEDURE' || normQuery.includes('lawyer') || normQuery.includes('counsel')) {
    if (primary.code.includes('LAWYER') || normQuery.includes('lawyer') || normQuery.includes('counsel')) {
      return `### Legal Counsel Protocol (§ Procedure 1.4)\n\n1. **Pause Timer**: Immediately pause the 25-minute arrest processing timer upon lawyer request.\n2. **Private Lawyer**: Detainee must provide attorney phone number; wait 15 minutes or 3 valid contact attempts.\n3. **State Lawyer**: Radio dispatch; wait 2 minutes for response. If confirmed en route, wait up to 15 minutes.\n4. **Verification**: Inspect lawyer's State ID / Bar license upon arrival.\n5. **Bodycam Evidence**: Provide bodycam proof of crime within 10 minutes upon counsel request.`
    }
    return `### ${primary.title} (§ ${primary.code})\n\n${primary.remarks || primary.title}\n\n*Source: § ${primary.code}*`
  }

  // 4. SCENARIO YES/NO INQUIRIES (e.g. "Can I charge him for parking on the driving lane?")
  if (result.intent === 'SCENARIO_YES_NO') {
    const isParking = primary.sourceDocument.includes('Traffic') && primary.code.includes('6.2')
    let text = `Yes — **§ ${primary.code} (${primary.title})** applies.\n`
    if (primary.fine && primary.fine !== '-') text += `- Fine: ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') text += `- Sentence: ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') text += `- Wanted Level: ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') text += `- Bail: ${primary.bail}\n`
    if (isParking) text += `- Towing: Officer discretion, if supported by the provision.\n`
    text += `- Applies when: ${primary.conditionText || primary.title}`
    return text.trim()
  }

  // 5. PENALTY INQUIRIES (e.g. "How much is the fine for 3.5?")
  if (result.intent === 'PENALTY_INQUIRY') {
    let text = `### Penalties for § ${primary.code} — ${primary.title}\n\n`
    if (primary.fine && primary.fine !== '-') text += `- **Fine:** ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') text += `- **Sentence:** ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') text += `- **Wanted Level:** ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') text += `- **Bail:** ${primary.bail}\n`
    return text.trim()
  }

  // 6. EXPLANATION INQUIRIES (e.g. "What does T.C. 6.2.f mean?")
  if (result.intent === 'EXPLANATION') {
    let text = `### § ${primary.code} — ${primary.title}\n\n`
    text += `- **Applies when:** ${primary.conditionText || primary.title}\n`
    if (primary.fine && primary.fine !== '-') text += `- **Fine:** ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') text += `- **Sentence:** ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') text += `- **Wanted Level:** ${primary.stars}\n`
    if (primary.remarks && primary.remarks !== '-') text += `- **Details:** ${primary.remarks}\n`
    return text.trim()
  }

  // 7. CHARGE IDENTIFICATION (PRIMARY LEO WORKFLOW)
  // 7a. Multiple independent violations combined in user scenario
  if (result.concepts.hasMultipleViolations && result.sources.length >= 2) {
    let totalFine = 0
    let text = `### Charges\n\n`
    result.sources.forEach((s, idx) => {
      text += `${idx + 1}. **§ ${s.code} — ${s.title}**\n`
      if (s.fine && s.fine !== '-') {
        text += `   - Fine: ${s.fine}\n`
        const num = parseInt(s.fine.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(num)) totalFine += num
      }
      if (s.sentence && s.sentence !== '-') text += `   - Sentence: ${s.sentence}\n`
      text += `\n`
    })
    if (totalFine > 0) {
      text += `### Total\n$${totalFine.toLocaleString()}`
    }
    return text.trim()
  }

  // 7b. Single Direct Match
  if (isDirectSingleMatch && primary.matchType === 'DIRECT_MATCH') {
    const isParking = primary.sourceDocument.includes('Traffic') && primary.code.includes('6.2')
    let text = `### Charge\n\n`
    text += `**§ ${primary.code} — ${primary.title}**\n`
    if (primary.fine && primary.fine !== '-') text += `- Fine: ${primary.fine}\n`
    if (primary.sentence && primary.sentence !== '-') text += `- Sentence: ${primary.sentence}\n`
    if (primary.stars && primary.stars !== '-') text += `- Wanted Level: ${primary.stars}\n`
    if (primary.bail && primary.bail !== '-') text += `- Bail: ${primary.bail}\n`
    if (isParking) text += `- Towing: Officer discretion, if supported by the provision.\n`
    return text.trim()
  }

  // 7c. Multiple Possible / Conditional Charges (e.g. "car is parked on the road")
  let text = `### Possible Charges\n\n`
  result.sources.forEach((s) => {
    const isParking = s.sourceDocument.includes('Traffic') && s.code.includes('6.2')
    text += `**§ ${s.code} — ${s.title}**\n`
    if (s.fine && s.fine !== '-') text += `- Fine: ${s.fine}\n`
    if (s.sentence && s.sentence !== '-') text += `- Sentence: ${s.sentence}\n`
    text += `- Applies if: ${s.conditionText || s.title}\n`
    if (isParking) text += `- Towing: Officer discretion, if supported by the provision.\n`
    text += `\n`
  })

  if (result.concepts.primaryTopic === 'PARKING') {
    text += `Need to know whether it was in a driving lane (§ 6.2.f) or violating road markings (§ 6.2.n) to select the exact charge.`
  }

  return text.trim()
}
