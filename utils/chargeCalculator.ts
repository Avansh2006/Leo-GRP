/**
 * Charge calculator: totals for a set of charges using the active server's rules
 * (servers/<id>/server.json → rules.sentenceStacking / maxSentenceMonths).
 * Pure functions; the rules are passed in so this is easy to test.
 */

export interface CalcRules {
  sentenceStacking?: 'sum' | 'max'
  maxSentenceMonths?: number
}

export interface CalcCharge {
  fineAmount?: number
  sentenceMonths?: number
  stars?: string
  bail?: string
}

export interface ChargeTotals {
  fineTotal: number
  /** Combined sentence after stacking rules and the cap */
  sentenceMonths: number
  /** Sentence before the cap was applied */
  uncappedSentenceMonths: number
  sentenceCapped: boolean
  /** Highest wanted level among the charges (e.g. "⭐⭐⭐"), or "" */
  maxStars: string
  /** "NO BAIL" if any charge forbids bail, "Bail Eligible" if any allows it, otherwise "-" */
  bailStatus: string
}

/** "$10,000 + Confiscation" → 10000. Takes the first amount, so "$5,000–$10,000" → 5000. */
export function parseFineAmount(fine?: string): number {
  if (!fine || fine.trim() === '-') return 0
  const m = fine.match(/\d[\d,.]*/)
  if (!m) return 0
  const n = parseInt(m[0].replace(/[,.](?=\d{3}\b)/g, '').replace(/[,.].*$/, ''), 10)
  return isNaN(n) ? 0 : n
}

/** "30 months (Class D)" → 30, "2 years" → 24, "15-30 months" → 15. Takes the first number. */
export function parseSentenceMonths(sentence?: string): number {
  if (!sentence || sentence.trim() === '-') return 0
  const m = sentence.match(/\d+/)
  if (!m) return 0
  const n = parseInt(m[0], 10)
  if (isNaN(n)) return 0
  return /year|yr/i.test(sentence) ? n * 12 : n
}

/** Wanted level as a number: counts ⭐/★ characters, otherwise the first number. */
export function starCount(stars?: string): number {
  if (!stars || stars.trim() === '-') return 0
  const icons = (stars.match(/[⭐★]/gu) || []).length
  if (icons) return icons
  const m = stars.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

export function calculateTotals(charges: CalcCharge[], rules: CalcRules = {}): ChargeTotals {
  let fineTotal = 0
  let sum = 0
  let max = 0
  let maxStars = ''
  let hasNoBail = false
  let hasBail = false

  for (const c of charges) {
    fineTotal += c.fineAmount || 0
    const months = c.sentenceMonths || 0
    sum += months
    max = Math.max(max, months)
    if (starCount(c.stars) > starCount(maxStars)) maxStars = c.stars || ''
    const bail = (c.bail || '').toLowerCase()
    if (bail.includes('no bail')) hasNoBail = true
    else if (bail && bail !== '-') hasBail = true
  }

  const uncapped = rules.sentenceStacking === 'max' ? max : sum
  const cap = rules.maxSentenceMonths && rules.maxSentenceMonths > 0 ? rules.maxSentenceMonths : Infinity
  const sentenceMonths = Math.min(uncapped, cap)

  return {
    fineTotal,
    sentenceMonths,
    uncappedSentenceMonths: uncapped,
    sentenceCapped: sentenceMonths < uncapped,
    maxStars,
    bailStatus: hasNoBail ? 'NO BAIL' : hasBail ? 'Bail Eligible' : '-',
  }
}
