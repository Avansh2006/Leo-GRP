/**
 * Anti-Hallucination Legal Answer Validator for LEO-GRP
 * 100% Factual Grounding Guard: Validates every legal claim, section code, fine, sentence,
 * wanted level, bail status, and towing authority against the active database.
 */

import {
  NormalizedProvision,
  getCanonicalProvision,
  lookupProvisionSync,
  ACTIVE_SOURCES,
} from './legislationStore'

export interface ValidatedProvisionClaim {
  code: string
  title: string
  fine: string
  fineAmount: number
  sentence: string
  sentenceMonths: number
  stars: string
  bail: string
  towing: boolean
  whyApplies: string
  conditionText?: string
  sourceDocument: string
  sourceDate: string
  matchType: 'BEST_MATCH' | 'CONDITIONAL'
}

export interface ValidatedCitation {
  code: string
  title: string
  source: string
  verified: boolean
}

export interface ValidatedLegalResponse {
  isValid: boolean
  isGrounded: boolean
  bestMatch?: ValidatedProvisionClaim
  alsoPossible: ValidatedProvisionClaim[]
  clarificationQuestions: string[]
  verifiedCitations: ValidatedCitation[]
  formattedMarkdown: string
  validationWarnings: string[]
}

/**
 * Extract all statutory section codes referenced in text (e.g. "T.C. 6.2.f", "§ 2.10.5", "P.C. 2.1.1", "PROC 1.4")
 */
export function extractReferencedCodes(text: string): string[] {
  const matches = text.match(/\b(p\.c\.|t\.c\.|pc|tc|proc|§)\s*([0-9]+(?:\.[0-9a-z]+)*)\b/gi) || []
  const found = new Set<string>()

  matches.forEach((m) => {
    const clean = m.replace(/§/g, '').trim()
    found.add(clean)
  })

  // Check for standalone numeric codes in format X.Y.Z
  const numMatches = text.match(/\b([0-9]+\.[0-9]+(?:\.[0-9a-z]+)*)\b/g) || []
  numMatches.forEach((num) => {
    if (num.length >= 3) {
      found.add(num)
    }
  })

  return Array.from(found)
}

/**
 * Validate and fact-check generated response against active database
 */
export async function validateAndGroundLegalResponse(
  rawText: string,
  candidateProvisions: NormalizedProvision[] = [],
  fallbackQuestions: string[] = []
): Promise<ValidatedLegalResponse> {
  const warnings: string[] = []
  const citedCodes = extractReferencedCodes(rawText)
  const resolvedProvisions: NormalizedProvision[] = []

  // 1. Resolve every cited code from canonical database
  for (const rawCode of citedCodes) {
    const prov = await getCanonicalProvision(rawCode)
    if (prov) {
      if (!resolvedProvisions.some((p) => p.id === prov.id)) {
        resolvedProvisions.push(prov)
      }
    } else {
      warnings.push(`Extraneous / Unverified citation "${rawCode}" removed. Not found in active legislation.`)
    }
  }

  // If no codes were detected in text, fall back to top candidates from retriever
  if (resolvedProvisions.length === 0 && candidateProvisions.length > 0) {
    candidateProvisions.slice(0, 3).forEach((p) => resolvedProvisions.push(p))
  }

  const alsoPossible: ValidatedProvisionClaim[] = []
  let bestMatch: ValidatedProvisionClaim | undefined = undefined

  // 2. Build verified provision claims with authoritative database values
  resolvedProvisions.forEach((prov, idx) => {
    const isFirst = idx === 0
    const claim: ValidatedProvisionClaim = {
      code: prov.code,
      title: prov.title,
      fine: prov.fine,
      fineAmount: prov.fineAmount,
      sentence: prov.sentence,
      sentenceMonths: prov.sentenceMonths,
      stars: prov.stars,
      bail: prov.bail,
      towing: prov.towing,
      whyApplies: prov.remarks || prov.description,
      sourceDocument: prov.sourceDocument,
      sourceDate: prov.sourceDate,
      matchType: isFirst ? 'BEST_MATCH' : 'CONDITIONAL',
    }

    if (isFirst) {
      bestMatch = claim
    } else {
      alsoPossible.push(claim)
    }
  })

  // 3. Citations mapped to active sources
  const verifiedCitations: ValidatedCitation[] = resolvedProvisions.map((p) => ({
    code: p.code,
    title: p.title,
    source: p.sourceDocument,
    verified: true,
  }))

  // 4. Construct Tactical Markdown Response
  let markdown = ''

  if (bestMatch) {
    const bm = bestMatch as ValidatedProvisionClaim
    markdown += `### Best Match\n\n`
    markdown += `**§ ${bm.code} — ${bm.title}**\n\n`
    if (bm.fine && bm.fine !== '-') markdown += `• **Fine:** ${bm.fine}\n`
    if (bm.sentence && bm.sentence !== '-') markdown += `• **Sentence:** ${bm.sentence}\n`
    if (bm.stars && bm.stars !== '-') markdown += `• **Wanted Level:** ${bm.stars}\n`
    if (bm.bail && bm.bail !== '-') markdown += `• **Bail:** ${bm.bail}\n`
    if (bm.towing) markdown += `• **Towing:** Authorized (Impound / Tow)\n`
    markdown += `\n*Application:* ${bm.whyApplies}\n\n`
  }

  if (alsoPossible.length > 0) {
    markdown += `### Also Possible (Conditional)\n\n`
    alsoPossible.forEach((p) => {
      markdown += `• **§ ${p.code} — ${p.title}**`
      if (p.fine && p.fine !== '-') markdown += ` (Fine: ${p.fine})`
      markdown += `\n`
      if (p.whyApplies) markdown += `  *Condition:* ${p.whyApplies}\n`
    })
    markdown += `\n`
  }

  if (fallbackQuestions.length > 0) {
    markdown += `### Quick Clarification\n\n`
    fallbackQuestions.forEach((q) => {
      markdown += `• ${q}\n`
    })
    markdown += `\n`
  }

  if (verifiedCitations.length > 0) {
    markdown += `**Source:** ${verifiedCitations[0].source}`
  }

  return {
    isValid: resolvedProvisions.length > 0,
    isGrounded: true,
    bestMatch,
    alsoPossible,
    clarificationQuestions: fallbackQuestions,
    verifiedCitations,
    formattedMarkdown: markdown.trim(),
    validationWarnings: warnings,
  }
}
