/**
 * Server pack validation, shared by `npm run check-packs` and the in-app pack installer.
 * No imports (runs in Node and the browser). Checks content only; file-system checks
 * (source files exist, laws.json up to date) live in scripts/check-packs.mjs.
 */

export const PACK_BUNDLE_FORMAT = 'leo-server-pack'
export const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/
export const REPORT_TEMPLATE_NAMES = [
  'chargeSingle',
  'chargesList',
  'finesIssued',
  'arrestScript',
  'arrestRecord',
  'shiftSummary',
  'shiftReport',
  'evidenceReport',
] as const
const KNOWN_FEATURES = ['arrestTimer', 'lawyerPause', 'legalAssistant']
const DOC_TYPES = ['traffic', 'penal', 'article7', 'procedure']

export interface PackParts {
  server?: any
  departments?: any
  commands?: any
  presets?: any
  legislation?: any
  reports?: any
  /** Inline laws (bundles only): array of law entries */
  laws?: any
}

export interface ValidationResult {
  errors: string[]
  warnings: string[]
}

export function validatePackParts(p: PackParts, opts: { expectedId?: string } = {}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const { server, departments, commands, presets, legislation, reports, laws } = p

  // server.json
  if (!server || typeof server !== 'object') errors.push('server.json: missing')
  else {
    if (!server.id || !PACK_ID_RE.test(server.id)) errors.push('server.json: "id" must be lowercase letters, numbers and dashes (e.g. "eclipse-rp")')
    if (opts.expectedId && server.id !== opts.expectedId) errors.push(`server.json: "id" is "${server.id}" but should be "${opts.expectedId}"`)
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
    Object.keys(server.features || {}).forEach((k) => {
      if (!KNOWN_FEATURES.includes(k)) warnings.push(`server.json: unknown feature "${k}" (known: ${KNOWN_FEATURES.join(', ')})`)
    })
  }

  // departments.json
  const deptIds = new Set<string>()
  if (!Array.isArray(departments) || departments.length === 0) errors.push('departments.json: needs at least one department')
  else {
    departments.forEach((d: any, i: number) => {
      if (!d?.id || !d?.name) errors.push(`departments.json[${i}]: "id" and "name" are required`)
      if (deptIds.has(d?.id)) errors.push(`departments.json: duplicate id "${d.id}"`)
      deptIds.add(d?.id)
    })
    if (server && !deptIds.has(server.defaultDepartment)) {
      errors.push(`server.json: defaultDepartment "${server.defaultDepartment}" is not in departments.json`)
    }
  }

  // commands.json
  if (!commands || typeof commands !== 'object') errors.push('commands.json: missing')
  else {
    const ids = new Set<string>()
    const check = (c: any, where: string) => {
      if (!c?.id || !c?.text) errors.push(`commands.json ${where}: every command needs "id" and "text"`)
      if (ids.has(c?.id)) errors.push(`commands.json: duplicate command id "${c.id}"`)
      ids.add(c?.id)
      const text = `${c?.text || ''} ${c?.label || ''} ${c?.palette?.title || ''}`
      const unknown = Array.from(text.matchAll(/\{(\w+)\}/g)).map((m) => m[1]).filter((k) => k !== 'dept')
      if (unknown.length) warnings.push(`commands.json ${c.id}: unknown placeholder(s) ${unknown.map((u) => `{${u}}`).join(', ')} (only {dept} is filled in)`)
    }
    if (!Array.isArray(commands.categories)) errors.push('commands.json: "categories" must be an array')
    if (!Array.isArray(commands.radio)) errors.push('commands.json: "radio" must be an array')
    ;(commands.categories || []).forEach((cat: any) => (cat.commands || []).forEach((c: any) => check(c, `category "${cat.id}"`)))
    ;(commands.radio || []).forEach((ch: any) => {
      if (ch.hideForDepartment && !deptIds.has(ch.hideForDepartment)) {
        warnings.push(`commands.json radio "${ch.id}": hideForDepartment "${ch.hideForDepartment}" is not a department`)
      }
      ;(ch.messages || []).forEach((m: any) => check(m, `radio "${ch.id}"`))
    })
  }

  // presets.json
  if (!presets || typeof presets !== 'object') errors.push('presets.json: missing')
  else for (const k of ['loadouts', 'chargeTemplates', 'events']) if (!Array.isArray(presets[k])) errors.push(`presets.json: "${k}" must be an array`)

  // legislation.json
  if (!legislation || typeof legislation !== 'object') errors.push('legislation.json: missing')
  else {
    if (!legislation.corpusHash) errors.push('legislation.json: "corpusHash" is required')
    if (!Array.isArray(legislation.sources)) errors.push('legislation.json: "sources" must be an array')
    ;(legislation.sources || []).forEach((s: any) => {
      if (!['gsheet-html', 'table', 'json'].includes(s?.format)) errors.push(`legislation.json: source "${s?.file}" has unknown format "${s?.format}"`)
    })
  }

  // reports.json
  if (!reports || typeof reports !== 'object') errors.push('reports.json: missing')
  else {
    for (const k of REPORT_TEMPLATE_NAMES) {
      const tpl = reports.templates?.[k]
      if (tpl === undefined) errors.push(`reports.json: missing template "${k}"`)
      else {
        const text = Array.isArray(tpl) ? tpl.join('\n') : String(tpl)
        const opens = Array.from(text.matchAll(/\{[#?^]([\w.]+)\}/g)).length
        const closes = Array.from(text.matchAll(/\{\/([\w.]+)\}/g)).length
        if (opens !== closes) errors.push(`reports.json: template "${k}" has ${opens} opening block tag(s) but ${closes} closing`)
      }
    }
    for (const k of ['docStatement', 'rightsScript']) if (!reports.defaults?.[k]) errors.push(`reports.json: missing defaults.${k}`)
  }

  // inline laws (bundles)
  if (laws !== undefined) {
    if (!Array.isArray(laws)) errors.push('"laws" must be an array of law entries')
    else
      laws.slice(0, 5000).forEach((e: any, i: number) => {
        if (!e?.code || typeof e?.description !== 'string' || !DOC_TYPES.includes(e?.documentType)) {
          if (errors.length < 30) errors.push(`laws[${i}]${e?.code ? ` (${e.code})` : ''}: needs "code", "description" and a valid "documentType"`)
        }
      })
  }

  return { errors, warnings }
}

/** Validate a single-file pack (as exported by the app or `npm run bundle-pack`). */
export function validatePackBundle(bundle: any): ValidationResult {
  if (!bundle || typeof bundle !== 'object') return { errors: ['Not a pack file.'], warnings: [] }
  if (bundle.format !== PACK_BUNDLE_FORMAT) return { errors: [`Not a server pack file (expected "format": "${PACK_BUNDLE_FORMAT}").`], warnings: [] }
  return validatePackParts(bundle)
}
