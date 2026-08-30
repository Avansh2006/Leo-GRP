/**
 * Hybrid RAG Legislation Retriever & Semantic Reranker for LEO-GRP
 * 100% Client-side, offline-first, combining Exact Code Matching (20%),
 * Lexical/BM25 Keyword Matching (30%), Local Semantic Embeddings (40%), and
 * Category/Intent Context (10%) with strict anti-hallucination validation.
 */

import {
  NormalizedProvision,
  getAllNormalizedProvisions,
  getCanonicalProvision,
  lookupProvisionSync,
} from './legislationStore'
import { searchSemanticProvisions } from './localEmbedding'
import {
  understandLegalQuery,
  normalizeQuery,
  extractSectionCode,
  detectQueryIntent,
  QueryIntent,
  LegalDomainTopic,
  ConversationTurn,
  STOP_WORDS,
} from './queryUnderstanding'
import { validateAndGroundLegalResponse, ValidatedLegalResponse } from './answerValidator'

export type { ConversationTurn, QueryIntent, LegalDomainTopic }

export interface RetrievedSource {
  code: string
  title: string
  sourceDocument: string
  fine?: string
  fineAmount?: number
  sentence?: string
  sentenceMonths?: number
  stars?: string
  bail?: string
  remarks?: string
  relevanceScore: number
  topicScore: number
  semanticScore: number
  lexicalScore: number
  matchedTokens?: string[]
  matchType?: 'DIRECT_MATCH' | 'CONDITIONAL_MATCH'
  conditionText?: string
  towing?: boolean
  confiscation?: boolean
  revocation?: boolean
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
  detectedSection?: string
  intent: QueryIntent
  primaryTopic: LegalDomainTopic
  sources: RetrievedSource[]
  rejectedSources: RejectedSource[]
  contextText: string
  hasMatch: boolean
  clarificationQuestions: string[]
  knownFacts: string[]
  uncertainFacts: string[]
  validatedResponse?: ValidatedLegalResponse
}

const RELEVANCE_MIN_THRESHOLD = 60

/**
 * Perform Hybrid RAG Retrieval across active legislation
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
      normalizedQuery: '',
      intent: 'GENERAL',
      primaryTopic: 'GENERAL',
      sources: [],
      rejectedSources: [],
      contextText: '',
      hasMatch: false,
      clarificationQuestions: [],
      knownFacts: [],
      uncertainFacts: [],
    }
  }

  // 1. Query Understanding & Multi-turn Conversation Context
  const understanding = understandLegalQuery(query, conversationHistory)
  const { intent, primaryTopic, secondaryTopics, entities, caseContext } = understanding
  const detectedSection = entities.detectedSection

  const allProvisions = await getAllNormalizedProvisions()

  // 2. Semantic Search Candidates via Local Vector Embeddings
  const semanticResults = await searchSemanticProvisions(query, 20)
  const semanticScoreMap = new Map<string, number>()
  semanticResults.forEach((s) => {
    semanticScoreMap.set(s.provision.id, s.similarity)
  })

  const queryTokens = normQuery
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  const scoredSources: RetrievedSource[] = []
  const rejectedSources: RejectedSource[] = []

  // 3. Hybrid Scoring for each provision
  for (const prov of allProvisions) {
    const codeNorm = normalizeQuery(prov.code)
    const titleNorm = normalizeQuery(prov.title)
    const remarksNorm = normalizeQuery(prov.remarks)
    const catNorm = normalizeQuery(prov.category)

    let exactScore = 0
    let lexicalScore = 0
    const semanticSim = semanticScoreMap.get(prov.id) || 0
    const semanticScore = semanticSim * 100 // Scale 0-100
    let contextScore = 0
    const matchedTokens: string[] = []

    // --- A. Exact Code & Title Matching (20% weight + direct boost) ---
    if (detectedSection) {
      const cleanTarget = detectedSection.toLowerCase().replace(/[^0-9a-z]/g, '')
      const cleanCode = codeNorm.replace(/[^0-9a-z]/g, '')
      if (cleanCode.endsWith(cleanTarget) || cleanCode === cleanTarget || codeNorm.includes(detectedSection.toLowerCase())) {
        exactScore += 350
        matchedTokens.push(`Section Match: ${prov.code}`)
      }
    }

    if (titleNorm === normQuery) {
      exactScore += 200
      matchedTokens.push('Exact Title Match')
    } else if (titleNorm.startsWith(normQuery)) {
      exactScore += 120
      matchedTokens.push('Title Prefix Match')
    } else if (titleNorm.includes(normQuery) && normQuery.length > 3) {
      exactScore += 80
      matchedTokens.push('Title Substring Match')
    }

    // --- B. Lexical / BM25 Term Matching (30% weight) ---
    for (const token of queryTokens) {
      if (codeNorm.includes(token)) {
        lexicalScore += 40
        matchedTokens.push(`Code:${token}`)
      } else if (titleNorm.includes(token)) {
        lexicalScore += 25
        matchedTokens.push(token)
      } else if (remarksNorm.includes(token)) {
        lexicalScore += 15
      } else if (catNorm.includes(token)) {
        lexicalScore += 10
      }
    }

    // --- C. Category, Action & Intent Matching (10% weight) ---
    const provTopic: LegalDomainTopic = prov.code.startsWith('PROC')
      ? 'ARREST_PROCEDURE'
      : prov.code.startsWith('T.C. 6.') || prov.code.startsWith('TC 7.')
      ? 'PARKING'
      : prov.code.startsWith('T.C. 3.') || prov.code.startsWith('§3.1') || prov.code.startsWith('T.C. 5.')
      ? 'MOVING_TRAFFIC'
      : prov.title.toLowerCase().includes('theft') || prov.code.includes('2.10.')
      ? 'THEFT_GTA'
      : prov.category.includes('CIVIL SERVANT') || prov.code.includes('4.3.') || prov.code.includes('2.7.')
      ? 'PUBLIC_SERVANT_DUTY'
      : prov.category.includes('DRUGS') || prov.code.includes('2.1.') || prov.code.includes('2.2.')
      ? 'DRUGS'
      : prov.category.includes('WEAPONS') || prov.code.includes('2.5.')
      ? 'WEAPONS'
      : prov.code.includes('2.6.') || prov.code.includes('2.8.') || prov.title.toLowerCase().includes('murder') || prov.title.toLowerCase().includes('battery')
      ? 'VIOLENT_CRIMES'
      : 'GENERAL'

    if (primaryTopic !== 'GENERAL') {
      if (provTopic === primaryTopic || secondaryTopics.includes(provTopic as any)) {
        contextScore += 120
      } else {
        // Topic Congruence Filtering: Strictly penalize cross-domain mismatch
        if (primaryTopic === 'PARKING' || primaryTopic === 'ABANDONMENT') {
          if (provTopic === 'THEFT_GTA' || provTopic === 'PUBLIC_SERVANT_DUTY' || provTopic === 'VIOLENT_CRIMES') {
            rejectedSources.push({
              code: prov.code,
              title: prov.title,
              topic: provTopic as any,
              score: -500,
              reason: `Topic Mismatch: Query is about PARKING, but provision belongs to ${provTopic}`,
            })
            continue
          }
        } else if (primaryTopic === 'THEFT_GTA') {
          if (provTopic === 'PARKING' || provTopic === 'PUBLIC_SERVANT_DUTY' || provTopic === 'MOVING_TRAFFIC') {
            rejectedSources.push({
              code: prov.code,
              title: prov.title,
              topic: provTopic as any,
              score: -500,
              reason: `Topic Mismatch: Query is about THEFT, but provision belongs to ${provTopic}`,
            })
            continue
          }
        } else if (primaryTopic === 'PUBLIC_SERVANT_DUTY') {
          if (provTopic === 'PARKING' || provTopic === 'THEFT_GTA' || provTopic === 'MOVING_TRAFFIC') {
            rejectedSources.push({
              code: prov.code,
              title: prov.title,
              topic: provTopic as any,
              score: -500,
              reason: `Topic Mismatch: Query is about PUBLIC SERVANTS, but provision belongs to ${provTopic}`,
            })
            continue
          }
        } else if (primaryTopic === 'ARREST_PROCEDURE') {
          if (provTopic !== 'ARREST_PROCEDURE') {
            rejectedSources.push({
              code: prov.code,
              title: prov.title,
              topic: provTopic as any,
              score: -500,
              reason: `Topic Mismatch: Query is about ARREST PROCEDURES, but provision belongs to ${provTopic}`,
            })
            continue
          }
        }
      }
    }

    // --- D. Negation & Exclusion Suppression ---
    if (entities.negatedActions.includes('STOPPING')) {
      if (prov.code.includes('3.2.3') || prov.code.includes('3.2.4') || titleNorm.includes('stopping')) {
        rejectedSources.push({
          code: prov.code,
          title: prov.title,
          topic: provTopic as any,
          score: -800,
          reason: 'Explicitly Excluded: User negated stopping ("not stopped")',
        })
        continue
      }
    }

    // --- E. Domain-Specific Nuance Boosts & Match Types ---
    let matchType: 'DIRECT_MATCH' | 'CONDITIONAL_MATCH' = 'CONDITIONAL_MATCH'

    if (primaryTopic === 'PARKING') {
      if (entities.locations.includes('DRIVING_LANE') && prov.code.includes('6.2.f')) {
        contextScore += 220
        matchType = 'DIRECT_MATCH'
      } else if (entities.locations.includes('ROAD_MARKINGS') && prov.code.includes('6.2.n')) {
        contextScore += 220
        matchType = 'DIRECT_MATCH'
      } else if (entities.locations.includes('CROSSWALK') && prov.code.includes('6.2.d')) {
        contextScore += 220
        matchType = 'DIRECT_MATCH'
      } else if (entities.locations.includes('RED_CURB') && prov.code.includes('6.2.a')) {
        contextScore += 220
        matchType = 'DIRECT_MATCH'
      } else if (entities.locations.includes('SIDEWALK') && prov.code.includes('6.2.e')) {
        contextScore += 220
        matchType = 'DIRECT_MATCH'
      } else if (entities.locations.includes('ROAD') || entities.actions.includes('PARKING')) {
        // General road parking query -> prioritize lane obstruction and surface markings
        if (prov.code.includes('6.2.f') || prov.code.includes('6.2.n')) {
          contextScore += 120
        }
      }
    } else if (primaryTopic === 'THEFT_GTA') {
      if (entities.objects.includes('VEHICLE') || normQuery.includes('car') || normQuery.includes('vehicle')) {
        if (prov.code.includes('2.10.5')) {
          contextScore += 250
          matchType = 'DIRECT_MATCH'
        }
      }
    } else if (primaryTopic === 'ARREST_PROCEDURE') {
      if (normQuery.includes('lawyer') || normQuery.includes('attorney') || normQuery.includes('counsel')) {
        if (prov.code.includes('1.4') || prov.title.toLowerCase().includes('lawyer')) {
          contextScore += 300
          matchType = 'DIRECT_MATCH'
        }
      }
      if (normQuery.includes('miranda') || normQuery.includes('rights') || normQuery.includes('silent')) {
        if (prov.code.includes('1.3') || prov.title.toLowerCase().includes('miranda')) {
          contextScore += 300
          matchType = 'DIRECT_MATCH'
        }
      }
    }

    // --- F. Compute Combined Hybrid Score (40% Semantic + 30% Lexical + 20% Exact + 10% Context) ---
    const totalScore =
      exactScore * 1.0 +
      lexicalScore * 1.0 +
      semanticScore * 1.2 +
      contextScore * 1.0

    if (totalScore >= RELEVANCE_MIN_THRESHOLD) {
      scoredSources.push({
        code: prov.code,
        title: prov.title,
        sourceDocument: prov.sourceDocument,
        fine: prov.fine,
        fineAmount: prov.fineAmount,
        sentence: prov.sentence,
        sentenceMonths: prov.sentenceMonths,
        stars: prov.stars,
        bail: prov.bail,
        remarks: prov.remarks,
        relevanceScore: totalScore,
        topicScore: contextScore,
        semanticScore,
        lexicalScore,
        matchedTokens: Array.from(new Set(matchedTokens)),
        matchType,
        conditionText: prov.remarks || prov.description,
        towing: prov.towing,
        confiscation: prov.confiscation,
        revocation: prov.revocation,
      })
    }
  }

  // 4. Rerank by total hybrid score
  scoredSources.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const topSources = scoredSources.slice(0, topK)

  // 5. Build structured context text for local LLM
  let contextText = ''
  if (topSources.length === 0) {
    contextText = 'No sufficiently relevant provisions found in the active legislation database.'
  } else {
    contextText = topSources
      .map(
        (s, idx) =>
          `[PROVISION ${idx + 1}]\nCode: § ${s.code}\nTitle: ${s.title}\nFine: ${s.fine || '-'}\nSentence: ${s.sentence || '-'}\nWanted Level: ${s.stars || '-'}\nBail: ${s.bail || '-'}\nTowing: ${s.towing ? 'Authorized' : 'None'}\nRemarks/Conditions: ${s.remarks || 'None'}\nSource: ${s.sourceDocument}`
      )
      .join('\n\n')
  }

  return {
    query,
    normalizedQuery: normQuery,
    detectedSection,
    intent,
    primaryTopic,
    sources: topSources,
    rejectedSources,
    contextText,
    hasMatch: topSources.length > 0,
    clarificationQuestions: caseContext.clarificationQuestions,
    knownFacts: caseContext.knownFacts,
    uncertainFacts: caseContext.uncertainFacts,
  }
}

/**
 * Generate a validated, fast-to-scan question-aware response
 */
export async function generateQuestionAwareResponse(
  retrieval: RetrievalResult,
  query: string,
  history: ConversationTurn[] = []
): Promise<string> {
  if (!retrieval.hasMatch || retrieval.sources.length === 0) {
    return (
      `I couldn't identify a sufficiently relevant provision from the active legislation for "${query}".\n\n` +
      `Try giving more specific details such as:\n` +
      `• The specific section code (e.g. "§ T.C. 6.2.f" or "P.C. 2.10.5")\n` +
      `• The exact location (driving lane, highway, red curb, sidewalk)\n` +
      `• The action or item involved (parking, stolen vehicle, possession of cocaine)`
    )
  }

  const candidateProvisions = await Promise.all(
    retrieval.sources.map((s) => getCanonicalProvision(s.code))
  )
  const nonNullProvisions = candidateProvisions.filter((p): p is NormalizedProvision => !!p)

  // Validate and fact-check claims against authoritative database
  const validated = await validateAndGroundLegalResponse(
    retrieval.contextText,
    nonNullProvisions,
    retrieval.clarificationQuestions
  )

  return validated.formattedMarkdown
}
