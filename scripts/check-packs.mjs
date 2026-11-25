#!/usr/bin/env node
/**
 * Sanity-check every server pack before it ships.
 *
 *   npm run check-packs
 *
 * Catches the mistakes that break the app at runtime: a default department that doesn't exist,
 * duplicate command ids, radio channels hidden for a department that isn't defined, missing
 * law sources, an out-of-date or invalid laws.json, or a pack not registered in registry.ts.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLawsFile } from '../utils/lawImport.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serversDir = path.join(root, 'servers')
const registrySrc = fs.readFileSync(path.join(serversDir, 'registry.ts'), 'utf8')
const PACK_FILES = ['server.json', 'departments.json', 'commands.json', 'presets.json', 'legislation.json', 'reports.json']
const REPORT_TEMPLATES = ['chargeSingle', 'chargesList', 'finesIssued', 'arrestScript', 'arrestRecord', 'shiftSummary', 'shiftReport', 'evidenceReport']

const packs = fs.readdirSync(serversDir).filter((d) => fs.statSync(path.join(serversDir, d)).isDirectory())
let errorCount = 0

for (const id of packs) {
  const dir = path.join(serversDir, id)
  const errors = []
  const warnings = []
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    } catch (e) {
      errors.push(`${f}: ${fs.existsSync(path.join(dir, f)) ? 'invalid JSON (' + e.message + ')' : 'missing'}`)
      return null
    }
  }

  const [server, departments, commands, presets, legislation, reports] = PACK_FILES.map(read)

  if (reports) {
    for (const k of REPORT_TEMPLATES) {
      const tpl = reports.templates?.[k]
      if (tpl === undefined) errors.push(`reports.json: missing template "${k}"`)
      else {
        const text = Array.isArray(tpl) ? tpl.join('\n') : String(tpl)
        const opens = [...text.matchAll(/\{[#?^]([\w.]+)\}/g)].length
        const closes = [...text.matchAll(/\{\/([\w.]+)\}/g)].length
        if (opens !== closes) errors.push(`reports.json: template "${k}" has ${opens} opening block tag(s) but ${closes} closing`)
      }
    }
    for (const k of ['docStatement', 'rightsScript']) if (!reports.defaults?.[k]) errors.push(`reports.json: missing defaults.${k}`)
  }

  if (server) {
    if (server.id !== id) errors.push(`server.json: "id" is "${server.id}" but the folder is "${id}"`)
    if (!server.name) errors.push('server.json: "name" is required')
    if (!(server.rules?.arrestTimerMinutes > 0)) errors.push('server.json: rules.arrestTimerMinutes must be a positive number')
    if (server.rules?.timeZone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: server.rules.timeZone })
      } catch {
        errors.push(`server.json: rules.timeZone "${server.rules.timeZone}" is not a valid IANA time zone (e.g. "UTC", "Europe/Berlin")`)
      }
    }
    if (server.rules?.sentenceStacking && !['sum', 'max'].includes(server.rules.sentenceStacking)) {
      errors.push('server.json: rules.sentenceStacking must be "sum" or "max"')
    }
    const known = ['arrestTimer', 'lawyerPause', 'legalAssistant']
    Object.keys(server.features || {}).forEach((k) => {
      if (!known.includes(k)) warnings.push(`server.json: unknown feature "${k}" (known: ${known.join(', ')})`)
    })
  }

  const deptIds = new Set()
  if (departments) {
    if (!Array.isArray(departments) || departments.length === 0) errors.push('departments.json: needs at least one department')
    else
      departments.forEach((d, i) => {
        if (!d.id || !d.name) errors.push(`departments.json[${i}]: "id" and "name" are required`)
        if (deptIds.has(d.id)) errors.push(`departments.json: duplicate id "${d.id}"`)
        deptIds.add(d.id)
      })
    if (server && !deptIds.has(server.defaultDepartment)) errors.push(`server.json: defaultDepartment "${server.defaultDepartment}" is not in departments.json`)
  }

  if (commands) {
    const ids = new Set()
    const check = (c, where) => {
      if (!c.id || !c.text) errors.push(`commands.json ${where}: every command needs "id" and "text"`)
      if (ids.has(c.id)) errors.push(`commands.json: duplicate command id "${c.id}"`)
      ids.add(c.id)
      const unknown = [...`${c.text} ${c.label || ''} ${c.palette?.title || ''}`.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => k !== 'dept')
      if (unknown.length) warnings.push(`commands.json ${c.id}: unknown placeholder(s) ${unknown.map((u) => `{${u}}`).join(', ')} (only {dept} is filled in)`)
    }
    ;(commands.categories || []).forEach((cat) => (cat.commands || []).forEach((c) => check(c, `category "${cat.id}"`)))
    ;(commands.radio || []).forEach((ch) => {
      if (ch.hideForDepartment && !deptIds.has(ch.hideForDepartment)) warnings.push(`commands.json radio "${ch.id}": hideForDepartment "${ch.hideForDepartment}" is not a department`)
      ;(ch.messages || []).forEach((m) => check(m, `radio "${ch.id}"`))
    })
  }

  if (presets) {
    for (const k of ['loadouts', 'chargeTemplates', 'events']) if (!Array.isArray(presets[k])) errors.push(`presets.json: "${k}" must be an array`)
  }

  if (legislation) {
    if (!legislation.corpusHash) errors.push('legislation.json: "corpusHash" is required')
    const sources = legislation.sources || []
    let newestSource = 0
    sources.forEach((s) => {
      const f = path.join(dir, s.file || '')
      if (!s.file || !fs.existsSync(f)) errors.push(`legislation.json: source file "${s.file}" not found in servers/${id}/`)
      else newestSource = Math.max(newestSource, fs.statSync(f).mtimeMs)
      if (!['gsheet-html', 'table', 'json'].includes(s.format)) errors.push(`legislation.json: source "${s.file}" has unknown format "${s.format}"`)
    })
    const lawsPath = path.join(root, 'public', 'servers', id, 'laws.json')
    if (!fs.existsSync(lawsPath)) {
      if (sources.length) errors.push(`public/servers/${id}/laws.json is missing. Run: npm run import-laws -- ${id}`)
    } else {
      try {
        const laws = JSON.parse(fs.readFileSync(lawsPath, 'utf8'))
        validateLawsFile(laws).slice(0, 10).forEach((p) => errors.push(`laws.json: ${p}`))
        if (laws.serverId && laws.serverId !== id) errors.push(`laws.json: serverId is "${laws.serverId}" but should be "${id}"`)
        if (newestSource > fs.statSync(lawsPath).mtimeMs + 1000) warnings.push(`laws.json is older than its sources. Run: npm run import-laws -- ${id}`)
      } catch (e) {
        errors.push(`laws.json: invalid JSON (${e.message})`)
      }
    }
  }

  if (!registrySrc.includes(`./${id}/server.json`)) errors.push(`not registered: import its files in servers/registry.ts and add it to SERVER_PACKS`)

  const status = errors.length ? '✗' : '✓'
  console.log(`${status} ${id}${server?.name ? ` (${server.name})` : ''}`)
  errors.forEach((e) => console.log(`    error: ${e}`))
  warnings.forEach((w) => console.log(`    warning: ${w}`))
  errorCount += errors.length
}

if (errorCount) {
  console.log(`\n${errorCount} error(s). Fix them before publishing.`)
  process.exit(1)
}
console.log(`\nAll ${packs.length} server pack(s) OK.`)
