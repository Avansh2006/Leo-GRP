/**
 * Law importers: turn a server's legislation source files into the standard laws.json format.
 *
 * This file has NO imports so it runs both in the app (in-browser importer) and in Node
 * (scripts/import-laws.mjs). Keep it that way.
 *
 * Supported inputs:
 *  - "gsheet-html": Google Sheets "Download → Web page (.html)" export. Rows whose code cell looks like
 *    "P.C. 2.1.1", "T.C. 3-1", "TC 7.1" or "§ 4" become entries; the next six cells are
 *    description, fine, sentence, stars, bail, remarks. Full-width UPPERCASE rows become categories.
 *  - "table": rows from CSV/XLSX with a header row (see TABLE_COLUMNS).
 *  - "json": entries already in the standard format.
 */

export type LawDocType = 'traffic' | 'penal' | 'article7' | 'procedure'

export interface LawEntry {
  id: string
  code: string
  description: string
  fine: string
  sentence: string
  stars: string
  bail: string
  remarks: string
  category: string
  documentType: LawDocType
  sourceDocument: string
  chapter?: string
  subsections?: string[]
}

export interface LawsFile {
  /** Format version of this file */
  format: 1
  serverId: string
  generatedAt: string
  entries: LawEntry[]
}

export interface ImportOptions {
  docType: LawDocType
  sourceName: string
}

/** Stable id for a law entry (same rule the app has always used). */
export function generateLawId(code: string, category?: string): string {
  const cleanCode = code.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (cleanCode) return `law-${cleanCode}`
  const cleanCat = (category || 'item').toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `law-${cleanCat}-${Math.random().toString(36).slice(2, 7)}`
}

function splitSubsections(remarks: string): string[] | undefined {
  if (!remarks) return undefined
  const parts = remarks
    .split(/<br\s*\/?>|\n|-(?=\s)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return parts.length > 1 ? parts : undefined
}

// ---------------------------------------------------------------------------
// HTML (Google Sheets export)
// ---------------------------------------------------------------------------

export interface HtmlCell {
  text: string
  colspan: boolean
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** Table rows of <td> cells (header <th> cells are ignored), text as the browser's textContent would give. */
export function htmlToRows(html: string): HtmlCell[][] {
  const rows: HtmlCell[][] = []
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi
  let tr: RegExpExecArray | null
  while ((tr = trRe.exec(html))) {
    const cells: HtmlCell[] = []
    let td: RegExpExecArray | null
    tdRe.lastIndex = 0
    while ((td = tdRe.exec(tr[1]))) {
      cells.push({
        colspan: /\bcolspan\s*=/i.test(td[1]),
        text: decodeEntities(td[2].replace(/<[^>]*>/g, '')),
      })
    }
    rows.push(cells)
  }
  return rows
}

const CODE_RE = /^(P\.C\.|T\.C\.|TC|§)\s*[\d.a-z]+/i

export function parseGsheetHtml(html: string, opts: ImportOptions): LawEntry[] {
  const { docType, sourceName } = opts
  const entries: LawEntry[] = []
  let currentCategory = docType === 'traffic' ? 'TRAFFIC CODE' : 'GENERAL'

  for (const cells of htmlToRows(html)) {
    if (cells.length === 0) continue
    const first = cells[0]
    const text = first.text.trim()

    // Category header (full-width uppercase row, e.g. "CRIMES AGAINST SOCIETY")
    if (first.colspan && text.length > 0 && text === text.toUpperCase() && !text.includes('PENAL CODE') && !text.includes('LAW DESCRIPTION')) {
      currentCategory = text
      continue
    }
    if (text.includes('PENAL CODE') || text.includes('LAW DESCRIPTION') || text.includes('TRAFFIC CODE')) continue

    let code = ''
    let description = ''
    let fine = ''
    let sentence = ''
    let stars = ''
    let bail = ''
    let remarks = ''
    const t = (i: number) => (cells[i] ? cells[i].text.trim() : '')

    for (let i = 0; i < cells.length; i++) {
      const cellText = t(i)
      if (CODE_RE.test(cellText)) {
        code = cellText
        description = t(i + 1)
        fine = t(i + 2)
        sentence = t(i + 3)
        stars = t(i + 4)
        bail = t(i + 5)
        remarks = t(i + 6)
        break
      }
    }

    if (!code && docType === 'article7') {
      const heading = cells.find((c) => c.text.trim().startsWith('TC 7.'))
      if (heading) {
        code = heading.text.trim()
        description = 'Article 7 Parking Zone'
        remarks = 'Parking regulation as defined in Article 7'
      }
    }

    if (code) {
      entries.push({
        id: generateLawId(code, currentCategory),
        code,
        description,
        fine,
        sentence,
        stars,
        bail,
        remarks,
        category: currentCategory,
        documentType: docType,
        sourceDocument: sourceName,
        subsections: splitSubsections(remarks),
      })
    }
  }
  return entries
}

// ---------------------------------------------------------------------------
// Tables (CSV / XLSX) with a header row
// ---------------------------------------------------------------------------

/** Accepted header names (case-insensitive) for each field. "code" and "description" are required. */
export const TABLE_COLUMNS: Record<keyof Omit<LawEntry, 'id' | 'documentType' | 'sourceDocument' | 'subsections'>, string[]> = {
  code: ['code', 'section', 'article', 'penal code', 'law code'],
  description: ['description', 'title', 'name', 'law description', 'offense', 'offence'],
  fine: ['fine', 'fines', 'penalty'],
  sentence: ['sentence', 'jail', 'jail time', 'prison'],
  stars: ['stars', 'wanted', 'wanted level'],
  bail: ['bail'],
  remarks: ['remarks', 'notes', 'details'],
  category: ['category', 'chapter', 'section name'],
  chapter: ['sub-chapter', 'subchapter'],
}

/** Simple RFC-4180 CSV reader (quotes, escaped quotes, commas and newlines inside quotes). */
export function csvToRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

export interface TableImportResult {
  entries: LawEntry[]
  /** Field → column index that was matched */
  mapping: Partial<Record<keyof typeof TABLE_COLUMNS, number>>
  errors: string[]
}

export function parseTable(rows: string[][], opts: ImportOptions): TableImportResult {
  const errors: string[] = []
  if (rows.length < 2) return { entries: [], mapping: {}, errors: ['The file needs a header row and at least one law.'] }

  const header = rows[0].map((h) => String(h ?? '').trim().toLowerCase())
  const mapping: TableImportResult['mapping'] = {}
  for (const [field, names] of Object.entries(TABLE_COLUMNS) as [keyof typeof TABLE_COLUMNS, string[]][]) {
    const idx = header.findIndex((h) => names.includes(h))
    if (idx >= 0) mapping[field] = idx
  }
  if (mapping.code === undefined) errors.push(`No "code" column found. Header must include one of: ${TABLE_COLUMNS.code.join(', ')}.`)
  if (mapping.description === undefined) errors.push(`No "description" column found. Header must include one of: ${TABLE_COLUMNS.description.join(', ')}.`)
  if (errors.length) return { entries: [], mapping, errors }

  const get = (r: string[], f: keyof typeof TABLE_COLUMNS) => (mapping[f] === undefined ? '' : String(r[mapping[f]!] ?? '').trim())
  const entries: LawEntry[] = []
  const seen = new Set<string>()
  rows.slice(1).forEach((r, i) => {
    const code = get(r, 'code')
    if (!code) return
    if (seen.has(code)) errors.push(`Row ${i + 2}: duplicate code "${code}" (kept the first one).`)
    if (seen.has(code)) return
    seen.add(code)
    const category = get(r, 'category') || (opts.docType === 'traffic' ? 'TRAFFIC CODE' : 'GENERAL')
    const remarks = get(r, 'remarks')
    entries.push({
      id: generateLawId(code, category),
      code,
      description: get(r, 'description'),
      fine: get(r, 'fine') || '-',
      sentence: get(r, 'sentence') || '-',
      stars: get(r, 'stars') || '-',
      bail: get(r, 'bail') || '-',
      remarks,
      category,
      chapter: get(r, 'chapter') || undefined,
      documentType: opts.docType,
      sourceDocument: opts.sourceName,
      subsections: splitSubsections(remarks),
    })
  })
  return { entries, mapping, errors }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DOC_TYPES: LawDocType[] = ['traffic', 'penal', 'article7', 'procedure']

/** Problems that would break the app; empty array means the file is usable. */
export function validateLawsFile(data: unknown): string[] {
  const problems: string[] = []
  const f = data as Partial<LawsFile>
  if (!f || typeof f !== 'object') return ['Not a JSON object.']
  if (f.format !== 1) problems.push('"format" must be 1.')
  if (!Array.isArray(f.entries)) return [...problems, '"entries" must be an array.']
  f.entries.forEach((e, i) => {
    const where = `entries[${i}]${e && (e as LawEntry).code ? ` (${(e as LawEntry).code})` : ''}`
    for (const k of ['id', 'code', 'category', 'sourceDocument'] as const) {
      if (!e || typeof (e as LawEntry)[k] !== 'string' || !(e as LawEntry)[k]) problems.push(`${where}: missing "${k}".`)
    }
    // description may be empty (e.g. parking zones named in the code cell) but must be text
    if (e && typeof (e as LawEntry).description !== 'string') problems.push(`${where}: "description" must be text.`)
    if (e && !DOC_TYPES.includes((e as LawEntry).documentType)) problems.push(`${where}: "documentType" must be one of ${DOC_TYPES.join(', ')}.`)
  })
  return problems
}

export function buildLawsFile(serverId: string, entries: LawEntry[]): LawsFile {
  return { format: 1, serverId, generatedAt: new Date().toISOString(), entries }
}
