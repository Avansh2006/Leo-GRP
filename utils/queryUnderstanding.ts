/**
 * Query Understanding & Multi-Turn Case Context Engine for LEO-GRP
 * Classifies legal intent, extracts entities, actions, negations, and maintains structured active case state.
 */

export type QueryIntent =
  | 'CHARGE_LOOKUP'
  | 'PROCEDURE_INQUIRY'
  | 'PENALTY_INQUIRY'
  | 'EXPLANATION'
  | 'SCENARIO_YES_NO'
  | 'GENERAL'

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

export interface ParsedEntities {
  actions: string[]
  negatedActions: string[]
  objects: string[]
  locations: string[]
  actor: 'CITIZEN' | 'PUBLIC_SERVANT' | 'LAWYER' | 'UNKNOWN'
  detectedSection?: string
}

export interface ActiveCaseContext {
  subject: string
  situation: string
  primaryTopic: LegalDomainTopic
  secondaryTopics: LegalDomainTopic[]
  knownFacts: string[]
  uncertainFacts: string[]
  clarificationQuestions: string[]
  activeSectionCodes: string[]
  lastUserCorrection?: string
}

export interface ConversationTurn {
  sender: 'user' | 'assistant'
  text: string
}

export interface QueryUnderstandingResult {
  rawQuery: string
  normalizedQuery: string
  intent: QueryIntent
  primaryTopic: LegalDomainTopic
  secondaryTopics: LegalDomainTopic[]
  entities: ParsedEntities
  caseContext: ActiveCaseContext
  isFollowUp: boolean
}

export const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'this', 'that', 'these', 'those', 'can', 'i', 'you', 'they', 'we', 'do',
  'does', 'how', 'when', 'where', 'why', 'should', 'would', 'could', 'about', 'under',
  'are', 'if', 'someone', 'person', 'say', 'tell', 'mean', 'meaning', 'apply', 'applies',
  'happens', 'mention', 'mentioned', 'situation', 'based', 'provision', 'rule', 'rules',
  'law', 'laws', 'act', 'code', 'codes', 'give', 'gives', 'get', 'gets', 'add', 'put',
  'charge', 'charges', 'he', 'she', 'his', 'her', 'their', 'them', 'him', 'has', 'have', 'had', 'been'
])

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?,!;:"'(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract explicit section code from query (e.g. "§ 6.2.f", "6.2.f", "tc 6.2.n", "p.c. 2.10.5", "proc 1.4")
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
 * Detect high-level legal query intent
 */
export function detectQueryIntent(query: string, detectedSection?: string): QueryIntent {
  const norm = normalizeQuery(query)

  if (norm.match(/\b(how\s+much\s+(?:is\s+the\s+)?fine|what\s+is\s+the\s+fine|what\s+is\s+the\s+penalty|what\s+is\s+the\s+sentence|how\s+long\s+in\s+jail|bail\s+amount)\b/)) {
    return 'PENALTY_INQUIRY'
  }

  if (norm.match(/\b(can\s+i\s+charge|can\s+i\s+arrest|can\s+i\s+fine|can\s+i\s+give\s+a\s+ticket|is\s+it\s+illegal|is\s+it\s+allowed|is\s+it\s+a\s+crime|can\s+i\s+add\s+abandonment)\b/)) {
    return 'SCENARIO_YES_NO'
  }

  if (norm.match(/\b(how\s+do\s+i\s+handle|what\s+should\s+i\s+do|procedure|steps|protocol|handle\s+a\s+suspect|requesting\s+a\s+lawyer|miranda|reading\s+rights|doc\s+procedure|timer|mask\s+removal)\b/)) {
    return 'PROCEDURE_INQUIRY'
  }

  if (norm.match(/\b(what\s+does\s+.*mean|explain|meaning\s+of|definition\s+of)\b/) || (detectedSection && norm.split(' ').length <= 4)) {
    return 'EXPLANATION'
  }

  if (
    norm.match(/\b(what\s+(?:can\s+be\s+the\s+)?charges?|what\s+can\s+i\s+charge|what\s+can\s+i\s+give|what\s+charges?\s+apply|what\s+ticket|what\s+fine|which\s+charges?|charges?\s+for|charge\s+someone\s+with|add\s+charges?|what\s+to\s+charge|charges?\s+apply)\b/) ||
    norm.match(/\b(parked|driving\s+lane|road\s+markings?|speeding|abandon|abandoned|stole|stealing|gta|theft|order)\b/)
  ) {
    return 'CHARGE_LOOKUP'
  }

  return 'GENERAL'
}

/**
 * Understand user query with full multi-turn conversation case refinement
 */
export function understandLegalQuery(
  query: string,
  history: ConversationTurn[] = []
): QueryUnderstandingResult {
  const norm = normalizeQuery(query)
  const detectedSection = extractSectionCode(query)
  const intent = detectQueryIntent(query, detectedSection)

  let combinedText = query
  const isFollowUp = history.length > 0
  let previousUserTurn = ''

  if (isFollowUp) {
    const prevTurns = [...history].reverse().filter((t) => t.sender === 'user')
    if (prevTurns.length > 0) {
      previousUserTurn = prevTurns[0].text
      combinedText = `${previousUserTurn} ${query}`
    }
  }

  const normCombined = normalizeQuery(combinedText)

  const actions: string[] = []
  const negatedActions: string[] = []
  const objects: string[] = []
  const locations: string[] = []
  let actor: 'CITIZEN' | 'PUBLIC_SERVANT' | 'LAWYER' | 'UNKNOWN' = 'UNKNOWN'

  // 1. Explicit Negations (e.g. "not stopped", "has not parked")
  if (norm.match(/\b(not|hasn't|didn't|never|without|instead\s+of)\s+stop(?:ped|ping)?\b/)) {
    negatedActions.push('STOPPING')
  }
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+park(?:ed|ing)?\b/)) {
    negatedActions.push('PARKING')
  }
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+steal(?:ing)?|stolen\b/)) {
    negatedActions.push('THEFT')
  }

  // 2. Actor Type
  if (norm.match(/\b(public servant|civil servant|officer|cop|police|deputy|trooper|agent)\b/)) {
    actor = 'PUBLIC_SERVANT'
  } else if (norm.match(/\b(lawyer|attorney|counsel)\b/)) {
    actor = 'LAWYER'
  } else {
    actor = 'CITIZEN'
  }

  // 3. Positive Actions
  if (
    (norm.match(/\bpark(?:ed|ing|s)?\b/) ||
      (normCombined.includes('park') && (norm.includes('lane') || norm.includes('marking') || norm.includes('curb') || norm.includes('road')))) &&
    !negatedActions.includes('PARKING')
  ) {
    actions.push('PARKING')
  }
  if (norm.match(/\bstop(?:ped|ping|s)?\b/) && !negatedActions.includes('STOPPING')) {
    actions.push('STOPPING')
  }
  if (norm.match(/\b(abandon|abandoned|abandonment|leaving\s+vehicle|unattended)\b/)) {
    actions.push('ABANDONMENT')
  }
  if (
    norm.match(/\b(stole|steal|stealing|stolen|theft|thief|rob|robbed|robbing|robbery|gta|carjack)\b/) ||
    norm.match(/\b(took|take|taking)\b.*\b(vehicle|car|automobile|property|money|goods|item|keys)\b/)
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
  if (norm.match(/\b(dui|drunk|alcohol|breathalyzer|intoxicated|narcotics?|drugs?)\b/)) {
    actions.push('DUI')
  }
  if (norm.match(/\b(refus(?:e|ed|ing|al)|disobey(?:ed|ing)?|ignore(?:d|ing)?|non[\s-]compliant)\b/)) {
    actions.push('DISOBEDIENCE')
  }
  if (norm.match(/\b(mask|passport|show\s+id|identify|identity|balaclava)\b/)) {
    actions.push('IDENTIFICATION')
  }
  if (norm.match(/\b(open\s+carry|weapon|gun|firearm|brandish|ammo|shooting|discharge)\b/)) {
    actions.push('WEAPON_POSSESSION')
  }

  // 4. Objects
  if (normCombined.match(/\b(car|vehicle|automobile|truck|bike|motorcycle|transport)\b/)) {
    objects.push('VEHICLE')
  }
  if (norm.match(/\b(gun|weapon|firearm|pistol|rifle|ammo|bullets)\b/)) {
    objects.push('WEAPON')
  }
  if (norm.match(/\b(mask|balaclava)\b/)) {
    objects.push('MASK')
  }
  if (norm.match(/\b(passport|id|identification|badge)\b/)) {
    objects.push('ID_CARD')
  }
  if (norm.match(/\b(cocaine|cannabis|weed|crack|powder|drugs)\b/)) {
    objects.push('DRUGS')
  }

  // 5. Locations
  if (norm.match(/\b(driving\s+lane|active\s+lane|travel\s+lane)\b/)) {
    locations.push('DRIVING_LANE')
  } else if (norm.match(/\b(highway|freeway)\b/)) {
    locations.push('HIGHWAY')
  } else if (norm.match(/\b(sidewalk|footpath|bike\s+path)\b/)) {
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

  // 6. Determine Primary & Secondary Legal Domain Topics
  let primaryTopic: LegalDomainTopic = 'GENERAL'
  const secondaryTopics: LegalDomainTopic[] = []

  if (actions.includes('ABANDONMENT')) {
    primaryTopic = 'ABANDONMENT'
    secondaryTopics.push('PARKING')
  } else if (actor === 'LAWYER' || norm.includes('lawyer') || norm.includes('counsel') || norm.includes('miranda') || norm.includes('rights') || norm.includes('doc')) {
    primaryTopic = 'ARREST_PROCEDURE'
  } else if (actions.includes('THEFT')) {
    primaryTopic = 'THEFT_GTA'
  } else if (actor === 'PUBLIC_SERVANT' && (actions.includes('DISOBEDIENCE') || norm.includes('order') || norm.includes('duty') || norm.includes('neglect'))) {
    primaryTopic = 'PUBLIC_SERVANT_DUTY'
  } else if (actions.includes('PARKING') || (objects.includes('VEHICLE') && locations.length > 0 && !actions.includes('SPEEDING') && !actions.includes('THEFT') && !actions.includes('DUI'))) {
    primaryTopic = 'PARKING'
  } else if (actions.includes('DISOBEDIENCE') || actions.includes('IDENTIFICATION')) {
    primaryTopic = 'DISOBEDIENCE_EVADING'
    secondaryTopics.push('ARREST_PROCEDURE')
  } else if (actions.includes('DUI') || actions.includes('SPEEDING') || actions.includes('FOLLOWING_DISTANCE') || actions.includes('STOPPING')) {
    primaryTopic = 'MOVING_TRAFFIC'
  } else if (actions.includes('WEAPON_POSSESSION')) {
    primaryTopic = 'WEAPONS'
  } else if (objects.includes('DRUGS')) {
    primaryTopic = 'DRUGS'
  }

  // 7. Construct Structured Active Case Context
  const knownFacts: string[] = []
  const uncertainFacts: string[] = []
  const clarificationQuestions: string[] = []

  if (objects.includes('VEHICLE')) knownFacts.push('Involves a motor vehicle')
  if (actions.includes('PARKING')) knownFacts.push('Vehicle is in a parked state')
  if (negatedActions.includes('STOPPING')) knownFacts.push('User clarified vehicle is not merely stopped (stationary/parked)')
  if (locations.includes('DRIVING_LANE')) knownFacts.push('Positioned within an active driving lane')
  if (locations.includes('ROAD_MARKINGS')) knownFacts.push('Positioned in violation of road surface markings')

  if (primaryTopic === 'PARKING' && !locations.includes('DRIVING_LANE') && !locations.includes('ROAD_MARKINGS') && !locations.includes('RED_CURB')) {
    uncertainFacts.push('Exact vehicle position (driving lane vs. road markings vs. curb)')
    clarificationQuestions.push('Was the vehicle parked inside an active driving lane?')
    clarificationQuestions.push('Did the vehicle violate road surface markings or yellow lines?')
  }

  const caseContext: ActiveCaseContext = {
    subject: objects.length > 0 ? objects.join(', ') : 'Citizen / Suspect',
    situation: primaryTopic,
    primaryTopic,
    secondaryTopics,
    knownFacts,
    uncertainFacts,
    clarificationQuestions,
    activeSectionCodes: detectedSection ? [detectedSection] : [],
    lastUserCorrection: negatedActions.length > 0 ? `Excluded: ${negatedActions.join(', ')}` : undefined,
  }

  return {
    rawQuery: query,
    normalizedQuery: norm,
    intent,
    primaryTopic,
    secondaryTopics,
    entities: {
      actions,
      negatedActions,
      objects,
      locations,
      actor,
      detectedSection,
    },
    caseContext,
    isFollowUp,
  }
}
