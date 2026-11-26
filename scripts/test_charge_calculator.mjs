#!/usr/bin/env node
// Charge calculator: parsing and server stacking rules (utils/chargeCalculator.ts).
import assert from 'node:assert/strict'
import { parseFineAmount, parseSentenceMonths, starCount, calculateTotals } from '../utils/chargeCalculator.ts'

const cases = [
  ['fine with text', () => assert.equal(parseFineAmount('$10,000 + Confiscation'), 10000)],
  ['fine range takes first', () => assert.equal(parseFineAmount('$5,000-$10,000'), 5000)],
  ['fine with cents', () => assert.equal(parseFineAmount('$1,250.50'), 1250)],
  ['fine dash/empty', () => { assert.equal(parseFineAmount('-'), 0); assert.equal(parseFineAmount(''), 0) }],
  ['sentence class', () => assert.equal(parseSentenceMonths('30 months (Class D)'), 30)],
  ['sentence range takes first (was 1530)', () => assert.equal(parseSentenceMonths('15-30 months'), 15)],
  ['sentence years', () => assert.equal(parseSentenceMonths('2 years'), 24)],
  ['stars icons and numbers', () => { assert.equal(starCount('⭐⭐⭐'), 3); assert.equal(starCount('2 stars'), 2); assert.equal(starCount('-'), 0) }],
  ['sum stacking (default)', () => {
    const t = calculateTotals([{ fineAmount: 100, sentenceMonths: 10, stars: '⭐' }, { fineAmount: 50, sentenceMonths: 20, stars: '⭐⭐⭐', bail: 'No bail' }])
    assert.deepEqual(t, { fineTotal: 150, sentenceMonths: 30, uncappedSentenceMonths: 30, sentenceCapped: false, maxStars: '⭐⭐⭐', bailStatus: 'NO BAIL' })
  }],
  ['max stacking', () => assert.equal(calculateTotals([{ sentenceMonths: 10 }, { sentenceMonths: 25 }], { sentenceStacking: 'max' }).sentenceMonths, 25)],
  ['cap', () => {
    const t = calculateTotals([{ sentenceMonths: 40 }, { sentenceMonths: 40 }], { maxSentenceMonths: 60 })
    assert.equal(t.sentenceMonths, 60)
    assert.equal(t.uncappedSentenceMonths, 80)
    assert.equal(t.sentenceCapped, true)
  }],
  ['bail eligible', () => assert.equal(calculateTotals([{ bail: '$10,000' }]).bailStatus, 'Bail Eligible')],
]

let failed = 0
console.log('Charge calculator')
for (const [name, fn] of cases) {
  try { fn(); console.log(`  ✓ ${name}`) } catch (e) { failed++; console.log(`  ✗ ${name}: ${e.message}`) }
}
process.exit(failed ? 1 : 0)
