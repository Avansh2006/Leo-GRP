#!/usr/bin/env node
/**
 * Build public/servers/<id>/laws.json from the sources listed in servers/<id>/legislation.json.
 *
 *   npm run import-laws              # every server pack
 *   npm run import-laws -- generic   # one server
 *
 * Re-run it whenever a server's law sheet changes (drop the new export into the pack's
 * sources/ folder first). Remember to bump "corpusHash" in legislation.json so cached AI
 * search data is rebuilt.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { parseGsheetHtml, parseTable, csvToRows, validateLawsFile, buildLawsFile } from '../utils/lawImport.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serversDir = path.join(root, 'servers')

const requested = process.argv.slice(2)
const serverIds = requested.length
  ? requested
  : fs.readdirSync(serversDir).filter((d) => fs.existsSync(path.join(serversDir, d, 'legislation.json')))

let failed = false

for (const id of serverIds) {
  const packDir = path.join(serversDir, id)
  const legislation = JSON.parse(fs.readFileSync(path.join(packDir, 'legislation.json'), 'utf8'))
  const entries = []
  const notes = []

  for (const src of legislation.sources) {
    const file = path.join(packDir, src.file)
    if (!fs.existsSync(file)) {
      notes.push(`  ✗ ${src.file}: file not found`)
      failed = true
      continue
    }
    const opts = { docType: src.docType, sourceName: src.name }
    let got = []
    if (src.format === 'gsheet-html') {
      got = parseGsheetHtml(fs.readFileSync(file, 'utf8'), opts)
    } else if (src.format === 'json') {
      got = JSON.parse(fs.readFileSync(file, 'utf8')).map((e) => ({ ...e, documentType: src.docType, sourceDocument: src.name }))
    } else if (src.format === 'table') {
      let rows
      if (file.toLowerCase().endsWith('.csv')) {
        rows = csvToRows(fs.readFileSync(file, 'utf8'))
      } else {
        const wb = XLSX.readFile(file)
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' })
      }
      const res = parseTable(rows, opts)
      res.errors.forEach((e) => notes.push(`  ! ${src.file}: ${e}`))
      got = res.entries
    } else {
      notes.push(`  ✗ ${src.file}: unknown format "${src.format}"`)
      failed = true
      continue
    }
    notes.push(`  ✓ ${src.file}: ${got.length} entries (${src.docType})`)
    entries.push(...got)
  }

  const out = buildLawsFile(id, entries)
  const problems = validateLawsFile(out)
  if (problems.length) {
    failed = true
    console.error(`${id}: laws.json is invalid:\n${problems.slice(0, 20).map((p) => '  ' + p).join('\n')}`)
    continue
  }

  const outDir = path.join(root, 'public', 'servers', id)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'laws.json'), JSON.stringify(out, null, 1) + '\n')
  console.log(`${id}: ${entries.length} entries -> public/servers/${id}/laws.json`)
  notes.forEach((n) => console.log(n))
}

process.exit(failed ? 1 : 0)
