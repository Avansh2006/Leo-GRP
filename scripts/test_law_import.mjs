#!/usr/bin/env node
// Law importers and pack validation, using the real modules.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { csvToRows, parseTable, parseGsheetHtml, htmlToRows, validateLawsFile, buildLawsFile } from '../utils/lawImport.ts'
import { validatePackParts, validatePackBundle, PACK_BUNDLE_FORMAT } from '../utils/packValidation.ts'

const cases = []
const test = (name, fn) => cases.push([name, fn])

test('CSV: quotes, commas and newlines inside cells', () => {
  const rows = csvToRows('code,description,fine\r\n"P.C. 1","Robbery, armed","$1,000"\n"P.C. 2","Line one\nline two",-\n')
  assert.deepEqual(rows, [['code', 'description', 'fine'], ['P.C. 1', 'Robbery, armed', '$1,000'], ['P.C. 2', 'Line one\nline two', '-']])
})

test('table: header aliases, defaults, duplicate codes reported', () => {
  const res = parseTable([['Section', 'Title', 'Jail'], ['PC 1', 'Theft', '5 months'], ['PC 1', 'Dupe', '1 month'], ['', 'no code', '']], { docType: 'penal', sourceName: 'Test' })
  assert.equal(res.entries.length, 1)
  assert.equal(res.entries[0].sentence, '5 months')
  assert.equal(res.entries[0].fine, '-')
  assert.equal(res.entries[0].category, 'GENERAL')
  assert.match(res.errors[0], /duplicate code "PC 1"/)
})

test('table: missing required columns', () => {
  const res = parseTable([['fine'], ['$5']], { docType: 'penal', sourceName: 'Test' })
  assert.equal(res.entries.length, 0)
  assert.equal(res.errors.length, 2)
})

test('HTML: entities and tags become text, <th> ignored', () => {
  const rows = htmlToRows('<table><tr><th>1</th><td colspan="3"><b>A&amp;B</b> &lt;x&gt;&nbsp;</td></tr></table>')
  // &nbsp; becomes U+00A0, exactly like the browser's textContent
  assert.deepEqual(rows, [[{ colspan: true, text: 'A&B <x>' + String.fromCharCode(160) }]])
})

test('Google Sheets HTML: categories and codes (Grand RP penal code)', () => {
  const html = fs.readFileSync(new URL('../servers/grandrp-en3/sources/Penal Code.html', import.meta.url), 'utf8')
  const entries = parseGsheetHtml(html, { docType: 'penal', sourceName: 'Penal' })
  assert.equal(entries.length, 135)
  const first = entries.find((e) => e.code === 'P.C. 2.1.1')
  assert.equal(first.description, 'Possession of cocaine in small quantities')
  assert.equal(first.fine, '$10,000 + Confiscation')
  // Known limitation: this sheet's section headers use Google's soft-merge (not colspan), so they
  // aren't detected and everything lands in GENERAL, same as the original browser parser.
  assert.deepEqual([...new Set(entries.map((e) => e.category))], ['GENERAL'])
})

test('laws.json validation', () => {
  assert.deepEqual(validateLawsFile(buildLawsFile('x', [])), [])
  assert.ok(validateLawsFile({ format: 1, entries: [{ code: 'A' }] }).length > 0)
  assert.ok(validateLawsFile(null).length > 0)
})

const read = (id, f) => JSON.parse(fs.readFileSync(new URL(`../servers/${id}/${f}.json`, import.meta.url), 'utf8'))
const parts = (id) => Object.fromEntries(['server', 'departments', 'commands', 'presets', 'legislation', 'reports'].map((p) => [p, read(id, p)]))

test('pack validation: built-in packs are valid', () => {
  for (const id of ['grandrp-en3', 'generic']) assert.deepEqual(validatePackParts(parts(id), { expectedId: id }).errors, [])
})

test('pack validation: catches common mistakes', () => {
  const p = structuredClone(parts('generic'))
  p.server.defaultDepartment = 'NOPE'
  p.server.rules.timeZone = 'Mars/Base'
  p.commands.categories[0].commands.push({ ...p.commands.categories[0].commands[0] })
  p.reports.templates.arrestRecord = ['{#charges}', 'no close']
  const { errors } = validatePackParts(p)
  assert.ok(errors.some((e) => e.includes('defaultDepartment "NOPE"')))
  assert.ok(errors.some((e) => e.includes('Mars/Base')))
  assert.ok(errors.some((e) => e.includes('duplicate command id')))
  assert.ok(errors.some((e) => e.includes('"arrestRecord" has 1 opening')))
})

test('pack bundle: format marker and inline laws checked', () => {
  assert.match(validatePackBundle({ server: {} }).errors[0], /Not a server pack file/)
  const bundle = { format: PACK_BUNDLE_FORMAT, version: 1, ...parts('generic'), laws: [{ code: 'X' }] }
  bundle.server = { ...bundle.server, id: 'my-server' }
  assert.ok(validatePackBundle(bundle).errors.some((e) => e.startsWith('laws[0]')))
  bundle.laws = []
  assert.deepEqual(validatePackBundle(bundle).errors, [])
})

let failed = 0
console.log('Law import & pack validation')
for (const [name, fn] of cases) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}: ${e.message}`)
  }
}
process.exit(failed ? 1 : 0)
