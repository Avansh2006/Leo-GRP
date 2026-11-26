#!/usr/bin/env node
/**
 * Turn a pack folder into a single installable file (laws included).
 *
 *   npm run bundle-pack -- <server-id>                 → public/community/<id>.pack.json
 *   npm run bundle-pack -- <server-id> --out file.json → somewhere else
 *
 * Officers can install the file in the app (Profile → RP Server → Add a server), and files in
 * public/community/ listed in directory.json appear in the in-app community list.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePackBundle, PACK_BUNDLE_FORMAT } from '../utils/packValidation.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [id, flag, outArg] = process.argv.slice(2)
if (!id) {
  console.error('Usage: npm run bundle-pack -- <server-id> [--out <file>]')
  process.exit(1)
}
const dir = path.join(root, 'servers', id)
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
const lawsPath = path.join(root, 'public', 'servers', id, 'laws.json')

const bundle = {
  format: PACK_BUNDLE_FORMAT,
  version: 1,
  exportedAt: new Date().toISOString(),
  server: read('server.json'),
  departments: read('departments.json'),
  commands: read('commands.json'),
  presets: read('presets.json'),
  legislation: read('legislation.json'),
  reports: read('reports.json'),
  laws: fs.existsSync(lawsPath) ? JSON.parse(fs.readFileSync(lawsPath, 'utf8')).entries : [],
}

const { errors, warnings } = validatePackBundle(bundle)
warnings.forEach((w) => console.log(`warning: ${w}`))
if (errors.length) {
  errors.forEach((e) => console.error(`error: ${e}`))
  process.exit(1)
}

const out = flag === '--out' && outArg ? path.resolve(outArg) : path.join(root, 'public', 'community', `${id}.pack.json`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(bundle) + '\n')
console.log(`${id}: ${bundle.laws.length} laws → ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
if (!flag) console.log('Add it to public/community/directory.json so it shows up in the app.')
