#!/usr/bin/env node
/**
 * Report templates: checks the Grand RP pack templates (rendered with the real engine in
 * utils/templates.ts) produce exactly the text the app produced before templates existed.
 * The "legacy*" functions below are frozen copies of the old hardcoded builders.
 *
 *   node scripts/test_report_templates.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { renderTemplate, formatMoney } from '../utils/templates.ts'

const reports = JSON.parse(fs.readFileSync(new URL('../servers/grandrp-en3/reports.json', import.meta.url), 'utf8'))
const T = reports.templates
const UTC = { timeZone: 'UTC', locale: 'en-GB' }
const fmtGB = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
const fmtGBShort = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
const fmtUS = (iso) => new Date(iso).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
const money = (n) => `$${n.toLocaleString('en-US')}`

const charges = [
  { code: 'P.C. 2.1.1', title: 'Possession of cocaine', fine: '$10,000 + Confiscation', sentence: '-', fineAmount: 10000, sentenceMonths: 0, fineStatus: 'ISSUED' },
  { code: 'P.C. 5.1', title: 'Armed robbery', fine: '$25,000', sentence: '30 months', fineAmount: 25000, sentenceMonths: 30, fineStatus: 'PENDING' },
  { code: 'T.C. 3-1', title: 'Speeding', fine: '', sentence: '', fineAmount: 0, sentenceMonths: 0, fineStatus: 'ISSUED' },
]
let failures = 0
function check(name, actual, expected) {
  try {
    assert.equal(actual, expected)
    console.log(`  ✓ ${name}`)
  } catch {
    failures++
    console.log(`  ✗ ${name}\n--- expected ---\n${JSON.stringify(expected)}\n--- actual ---\n${JSON.stringify(actual)}`)
  }
}

// ---- legacy builders (frozen copies) ----
function legacySingle(c) {
  let t = `§ ${c.code} — ${c.title}\n`
  if (c.fine && c.fine !== '-') t += `Fine: ${c.fine}\n`
  if (c.sentence && c.sentence !== '-') t += `Sentence: ${c.sentence}\n`
  return t.trim()
}
function legacyList(list) {
  if (list.length === 0) return 'No charges selected.'
  let t = `Current Charges:\n\n`
  list.forEach((c, i) => {
    t += `${i + 1}. § ${c.code} — ${c.title}\n`
    if (c.fine && c.fine !== '-') t += `   Fine: ${c.fine}\n`
    if (c.sentence && c.sentence !== '-') t += `   Sentence: ${c.sentence}\n`
  })
  return t.trim()
}
function legacyFines(list) {
  if (list.length === 0) return 'No fines issued.'
  const issued = list.filter((c) => c.fineStatus === 'ISSUED')
  if (issued.length === 0) return 'No fines have been issued yet.'
  let total = 0
  let t = `Fines Issued:\n\n`
  issued.forEach((c, i) => {
    t += `${i + 1}. § ${c.code} — ${c.title} — ${c.fine || money(c.fineAmount)}\n`
    total += c.fineAmount
  })
  t += `\nTotal Fines: ${money(total)}`
  return t.trim()
}
function legacyScript(d) {
  let block = ''
  if (d.charges.length === 0) block = 'No charges currently added.'
  else d.charges.forEach((c, i) => {
    block += `${i + 1}. § ${c.code} — ${c.title}\n`
    if (c.fine && c.fine !== '-') block += `   Fine: ${c.fine}\n`
    if (c.sentence && c.sentence !== '-') block += `   Sentence: ${c.sentence}\n`
  })
  let s = `I am ${d.officerTitle} with the ${d.org}.\n\n`
  s += `${d.suspectReference}, you are being placed under arrest for the following current charges:\n\n`
  s += `${block.trim()}\n\n`
  s += `You are being informed of your required rights:\n\n`
  s += `${d.rights}\n\n`
  s += `${d.docStatement}`
  return s
}
function legacyRecord(r) {
  let t = `ARREST\n\nOfficer: ${r.officerTitle}\nOrganization: ${r.org}\n\n`
  if (r.suspectName) t += `Suspect: ${r.suspectName}\n`
  t += `Passport: ${r.passport}\n\nCurrent Charges:\n\n`
  r.charges.forEach((c, i) => {
    t += `${i + 1}. § ${c.code} — ${c.title}\n`
    if (c.fine && c.fine !== '-') t += `   Fine: ${c.fine}\n`
    if (c.sentence && c.sentence !== '-') t += `   Sentence: ${c.sentence}\n`
  })
  t += `\nTotal Fine: ${money(r.totalFineAmount)}\nTotal Sentence: ${r.totalSentenceMonths} months\n\n`
  if (r.lawyerRequested) {
    t += `Lawyer Requested: Yes\n`
    if (r.timerPaused) t += `Timer Paused: ${r.timerPaused}\n`
    t += `\n`
  }
  t += `${r.docStatement}\n\nArrest completed:\n${fmtGB(r.completedAt)}`
  return t
}
function legacyShiftSummary(s) {
  let t = `END OF SHIFT REPORT\n────────────────────────\nOrganization: ${s.org}\n`
  t += `Shift: ${fmtGBShort(s.start)} → ${s.end ? fmtGBShort(s.end) : 'Ongoing'}\n\n`
  t += `FINES ISSUED (${s.fines.length})\n────────────────────────\n`
  if (s.fines.length === 0) t += `No fines issued during this shift.\n`
  else s.fines.forEach((f, i) => {
    t += `#${i + 1}\nFine: ${f.fine}\n`
    if (f.passport) t += `Passport No: ${f.passport}\n`
    if (f.suspectName) t += `Name: ${f.suspectName}\n`
    t += `Charge: § ${f.code} — ${f.title}\n\n`
  })
  t += `Total Fines: ${s.finesTotal}\n\n`
  t += `ARRESTS (${s.arrests.length})\n────────────────────────\n`
  if (s.arrests.length === 0) t += `No arrests made during this shift.\n`
  else s.arrests.forEach((a, i) => {
    t += `#${i + 1}\n`
    if (a.passport) t += `Passport No: ${a.passport}\n`
    if (a.suspectName) t += `Name: ${a.suspectName}\n`
    t += `Status: ${a.status}\nCharges: (${a.charges.length})\n`
    a.charges.forEach((c) => (t += `- § ${c.code} — ${c.title}\n`))
    if (a.sentenceMonths > 0) t += `Sentence: ${a.sentenceMonths} months\n`
    t += `Fine: ${a.fine}\n`
    if (a.stars) t += `Wanted: ${a.stars}\n`
    if (a.bail) t += `Bail: ${a.bail}\n`
    t += `\n`
  })
  t += `Total Arrests: ${s.arrests.length}\n`
  return t
}
function legacyShiftReport(d) {
  let returned = d.returned.join('\n')
  if (d.lost.length) returned += '\n\n🔴 LOST:\n' + d.lost.join('\n')
  if (d.broken.length) returned += '\n\n💔 BROKEN:\n' + d.broken.join('\n')
  if (d.used.length) returned += '\n\n⚡ USED:\n' + d.used.join('\n')
  const line = '----------------------------------------------------------------'
  return `${line}
Name: ${d.name}
ID: ${d.id}
${line}
Rank: ${d.rank}
Badge Number: ${d.badgeNumber}
${line}
ON DUTY: ${fmtUS(d.onDuty)}
${line}
Weapons Taken: ( with Ammunation )
${d.weaponsTaken.join('\n')}
${line}
Events Attended: ${d.eventsAttended}
${line}
Total Arrests: ${d.arrestsCount}
${line}
Total Fines: ${d.finesCount}
${line}
OFF DUTY: ${fmtUS(d.offDuty)}
${line}
Weapons Returned: ( with Ammunation )
${returned}
${line}`
}
function legacyEvidence(d) {
  const list = d.charges.map((c) => `- ${c.code} ${c.description}`).join('\n')
  return `Date: ${d.date}
Time: ${d.time}
Description:
${d.description}

Charges: (Below are most common ones for you to copy from here simply)
${list || '- No charges added'}

- Bodycam Footage: [${d.bodycamFootage}]
- Bodycam Proof: [${d.bodycamProof}]
- License Plates: [${d.licensePlates}]
- Makeup: ${d.makeup || 'Take screenshot from makeup log of your log and attach here. (Can also post on imgur and attach link)'}
`
}

const names = (l) => l.map((name) => ({ name }))
const r = (tpl, data) => renderTemplate(tpl, data, UTC)

console.log('Report templates (Grand RP) vs legacy output')
for (const c of charges) check(`chargeSingle ${c.code}`, r(T.chargeSingle, c).trim(), legacySingle(c))
check('chargesList', r(T.chargesList, { charges }).trim(), legacyList(charges))
check('chargesList empty', r(T.chargesList, { charges: [] }).trim(), legacyList([]))

for (const [label, list] of [['some issued', charges], ['none issued', charges.map((c) => ({ ...c, fineStatus: 'PENDING' }))], ['no charges', []]]) {
  const issued = list.filter((c) => c.fineStatus === 'ISSUED')
  check(`finesIssued ${label}`, r(T.finesIssued, {
    hasCharges: list.length > 0,
    fines: issued.map((c) => ({ ...c, fine: c.fine || formatMoney(c.fineAmount) })),
    total: formatMoney(issued.reduce((s, c) => s + c.fineAmount, 0)),
  }).trim(), legacyFines(list))
}

const scriptData = { officerTitle: 'Officer Jane Doe', org: 'LSPD', suspectReference: 'John Smith, Passport 12345', rights: 'You have the right to remain silent.\n\nDo you understand the rights I just read to you?', docStatement: 'DOC statement.' }
check('arrestScript', r(T.arrestScript, { ...scriptData, charges }), legacyScript({ ...scriptData, charges }))
check('arrestScript no charges', r(T.arrestScript, { ...scriptData, charges: [] }), legacyScript({ ...scriptData, charges: [] }))

const rec = { officerTitle: 'Jane Doe', org: 'FIB', passport: '12345', charges, totalFineAmount: 35000, totalSentenceMonths: 30, docStatement: 'DOC statement.', completedAt: '2026-11-25T21:05:00.000Z' }
for (const [label, extra] of [['plain', {}], ['with name + lawyer', { suspectName: 'John Smith', lawyerRequested: true, timerPaused: '12:34' }], ['lawyer no timer', { lawyerRequested: true }]]) {
  const d = { ...rec, ...extra }
  check(`arrestRecord ${label}`, r(T.arrestRecord, { ...d, totalFine: formatMoney(d.totalFineAmount) }), legacyRecord(d))
}

const shift = {
  org: 'LSPD', start: '2026-11-25T18:00:00.000Z', end: '2026-11-25T21:30:00.000Z',
  fines: [{ fine: '$10,000', passport: '111', suspectName: 'A B', code: 'P.C. 1', title: 'X' }, { fine: '$500', passport: '', code: 'T.C. 2', title: 'Y' }],
  finesTotal: '$10,500',
  arrests: [{ passport: '222', status: 'COMPLETED', charges: charges.slice(0, 2), sentenceMonths: 30, fine: '$35,000', stars: '⭐⭐', bail: 'Denied' }, { passport: '', status: 'COMPLETED', charges: [], sentenceMonths: 0, fine: '$0', stars: '', bail: '' }],
}
const shiftData = (s) => ({ ...s, finesCount: s.fines.length, arrestsCount: s.arrests.length, arrests: s.arrests.map((a) => ({ ...a, chargeCount: a.charges.length })) })
check('shiftSummary', r(T.shiftSummary, shiftData(shift)), legacyShiftSummary(shift))
const emptyShift = { ...shift, end: '', fines: [], arrests: [], finesTotal: '$0' }
check('shiftSummary empty/ongoing', r(T.shiftSummary, shiftData(emptyShift)), legacyShiftSummary(emptyShift))

const duty = { name: 'Jane', id: '12345', rank: 'Sergeant', badgeNumber: '77', onDuty: '2026-11-25T18:00:00.000Z', offDuty: '2026-11-25T21:30:00.000Z', weaponsTaken: ['Vest Level 3', 'Stun gun (1)'], eventsAttended: '2 robberies', arrestsCount: 3, finesCount: 5, returned: ['Vest Level 3'], lost: ['Stun gun (1)'], broken: [], used: [] }
check('shiftReport', r(T.shiftReport, { ...duty, weaponsTaken: names(duty.weaponsTaken), returned: names(duty.returned), lost: names(duty.lost), broken: [], used: [] }), legacyShiftReport(duty))

const ev = { date: '2026-11-25', time: '21:00', description: 'Stopped a vehicle.\nFound drugs.', charges: [{ code: 'P.C. 2.1.1', description: 'Possession' }], bodycamFootage: 'link1', bodycamProof: 'link2', licensePlates: 'ABC123', makeup: '' }
check('evidenceReport', r(T.evidenceReport, ev), legacyEvidence(ev))
check('evidenceReport no charges + makeup', r(T.evidenceReport, { ...ev, charges: [], makeup: 'imgur.com/x' }), legacyEvidence({ ...ev, charges: [], makeup: 'imgur.com/x' }))

console.log(failures ? `\n${failures} failure(s)` : '\nAll report templates match the legacy output.')
process.exit(failures ? 1 : 0)
