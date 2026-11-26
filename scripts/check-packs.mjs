#!/usr/bin/env node
/**
 * Sanity-check every server pack before it ships.
 *
 *   npm run check-packs
 *
 * Checks built-in packs (servers/<id>/) and community pack files (public/community/*.pack.json):
 * a default department that doesn't exist, duplicate command ids, broken report templates,
 * missing law sources, an out-of-date or invalid laws.json, an unregistered pack, or a
 * community pack missing from the directory.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLawsFile } from '../utils/lawImport.ts'
import { validatePackParts, validatePackBundle } from '../utils/packValidation.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serversDir = path.join(root, 'servers')
const registrySrc = fs.readFileSync(path.join(serversDir, 'registry.ts'), 'utf8')
const PARTS = ['server', 'departments', 'commands', 'presets', 'legislation', 'reports']

let errorCount = 0
let packCount = 0

function report(label, errors, warnings) {
  packCount++
  console.log(`${errors.length ? '✗' : '✓'} ${label}`)
  errors.forEach((e) => console.log(`    error: ${e}`))
  warnings.forEach((w) => console.log(`    warning: ${w}`))
  errorCount += errors.length
}

// ---- built-in packs -------------------------------------------------------
for (const id of fs.readdirSync(serversDir).filter((d) => fs.statSync(path.join(serversDir, d)).isDirectory())) {
  const dir = path.join(serversDir, id)
  const fileErrors = []
  const warnings = []
  const parts = {}
  for (const p of PARTS) {
    const f = path.join(dir, `${p}.json`)
    try {
      parts[p] = JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      fileErrors.push(`${p}.json: ${fs.existsSync(f) ? 'invalid JSON (' + e.message + ')' : 'missing'}`)
    }
  }
  const res = validatePackParts(parts, { expectedId: id })
  const errors = [...fileErrors, ...res.errors.filter((e) => !fileErrors.some((fe) => e.startsWith(fe.split(':')[0])))]
  warnings.push(...res.warnings)

  const legislation = parts.legislation
  if (legislation) {
    const sources = legislation.sources || []
    let newestSource = 0
    sources.forEach((s) => {
      const f = path.join(dir, s.file || '')
      if (!s.file || !fs.existsSync(f)) errors.push(`legislation.json: source file "${s.file}" not found in servers/${id}/`)
      else newestSource = Math.max(newestSource, fs.statSync(f).mtimeMs)
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

  if (!registrySrc.includes(`./${id}/server.json`)) errors.push('not registered: import its files in servers/registry.ts and add it to SERVER_PACKS')
  report(`${id}${parts.server?.name ? ` (${parts.server.name})` : ''}`, errors, warnings)
}

// ---- community pack files -------------------------------------------------
const communityDir = path.join(root, 'public', 'community')
const directoryPath = path.join(communityDir, 'directory.json')
let directory = { servers: [] }
if (fs.existsSync(directoryPath)) {
  try {
    directory = JSON.parse(fs.readFileSync(directoryPath, 'utf8'))
  } catch (e) {
    report('public/community/directory.json', [`invalid JSON (${e.message})`], [])
  }
}
const listed = new Map((directory.servers || []).map((s) => [s.file, s]))
const files = fs.existsSync(communityDir) ? fs.readdirSync(communityDir).filter((f) => f.endsWith('.pack.json')) : []
for (const file of files) {
  let bundle
  try {
    bundle = JSON.parse(fs.readFileSync(path.join(communityDir, file), 'utf8'))
  } catch (e) {
    report(`community/${file}`, [`invalid JSON (${e.message})`], [])
    continue
  }
  const { errors, warnings } = validatePackBundle(bundle)
  const id = bundle.server?.id
  if (id && file !== `${id}.pack.json`) errors.push(`file should be named "${id}.pack.json"`)
  if (id && registrySrc.includes(`./${id}/server.json`)) errors.push(`id "${id}" is already used by a built-in server`)
  const entry = listed.get(file)
  if (!entry) errors.push('not listed in public/community/directory.json')
  else if (entry.id !== id) errors.push(`directory.json lists id "${entry.id}" but the pack's id is "${id}"`)
  report(`community/${file}${bundle.server?.name ? ` (${bundle.server.name})` : ''}`, errors, warnings)
}
for (const [file] of listed) {
  if (!files.includes(file)) report(`community/${file}`, ['listed in directory.json but the file does not exist'], [])
}

if (errorCount) {
  console.log(`\n${errorCount} error(s). Fix them before publishing.`)
  process.exit(1)
}
console.log(`\nAll ${packCount} server pack(s) OK.`)
