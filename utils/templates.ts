/**
 * Tiny text template engine for server-pack report templates. No imports (also runs in Node tests).
 *
 * Syntax:
 *   {name}                 value (missing → empty)
 *   {when:dd/MM/yyyy HH:mm} date/time value formatted in the server's time zone
 *                          tokens: dd d MM M MMM yyyy yy HH H mm ss
 *   {#list} … {/list}      repeat for each item; item fields are in scope, plus {n} (1-based index)
 *   {?name} … {/name}      only if name has a value (not empty, not "-", not 0, not an empty list)
 *   {^name} … {/name}      only if name has NO value
 *
 * A block tag alone on its line removes that whole line, so templates can be laid out readably.
 * Templates in JSON may be a string or an array of lines (joined with "\n").
 */

export type TemplateSource = string | string[]
export type TemplateValue = string | number | boolean | null | undefined | TemplateData[] | Date
export interface TemplateData {
  [key: string]: TemplateValue
}

export interface RenderOptions {
  /** IANA time zone for date formatting, e.g. "UTC" or "Europe/Berlin" */
  timeZone?: string
  /** Locale used for month names, e.g. "en-GB" */
  locale?: string
}

type Node =
  | { type: 'text'; value: string }
  | { type: 'var'; name: string; format?: string }
  | { type: 'section'; kind: '#' | '?' | '^'; name: string; children: Node[] }

const TAG_RE = /\{([#?^/])?([\w.]+)(?::([^{}]+))?\}/g

function joinSource(src: TemplateSource): string {
  return Array.isArray(src) ? src.join('\n') : src
}

function parse(template: string): Node[] {
  // Standalone block tags: drop the line they sit on
  const src = template.replace(/^[ \t]*(\{[#?^/][\w.]+\})[ \t]*\r?\n/gm, '$1')
  const root: Node[] = []
  const stack: { name: string; children: Node[] }[] = [{ name: '', children: root }]
  let last = 0
  let m: RegExpExecArray | null
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(src))) {
    const top = stack[stack.length - 1]
    if (m.index > last) top.children.push({ type: 'text', value: src.slice(last, m.index) })
    last = TAG_RE.lastIndex
    const [, sigil, name, format] = m
    if (!sigil) {
      top.children.push({ type: 'var', name, format })
    } else if (sigil === '/') {
      if (stack.length > 1 && top.name === name) stack.pop()
      else top.children.push({ type: 'text', value: m[0] }) // unmatched close: keep literally
    } else {
      const section: Node = { type: 'section', kind: sigil as '#' | '?' | '^', name, children: [] }
      top.children.push(section)
      stack.push({ name, children: section.children })
    }
  }
  if (last < src.length) stack[stack.length - 1].children.push({ type: 'text', value: src.slice(last) })
  return root
}

function lookup(scopes: TemplateData[], name: string): TemplateValue {
  for (let i = scopes.length - 1; i >= 0; i--) {
    let v: any = scopes[i]
    for (const part of name.split('.')) v = v == null ? undefined : v[part]
    if (v !== undefined) return v
  }
  return undefined
}

export function hasValue(v: TemplateValue): boolean {
  if (v == null || v === false) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return v !== 0
  if (v instanceof Date) return !isNaN(v.getTime())
  const s = String(v).trim()
  return s !== '' && s !== '-'
}

/** Format a date with simple tokens in the given time zone. */
export function formatDate(value: Date | string, format: string, opts: RenderOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const parts: Record<string, string> = {}
  new Intl.DateTimeFormat('en-GB', {
    timeZone: opts.timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .forEach((p) => (parts[p.type] = p.value))
  const monthShort = new Intl.DateTimeFormat(opts.locale || 'en-GB', { timeZone: opts.timeZone || 'UTC', month: 'short' }).format(date)
  const tokens: Record<string, string> = {
    yyyy: parts.year,
    yy: parts.year.slice(-2),
    MMM: monthShort,
    MM: parts.month,
    M: String(Number(parts.month)),
    dd: parts.day,
    d: String(Number(parts.day)),
    HH: parts.hour,
    H: String(Number(parts.hour)),
    mm: parts.minute,
    ss: parts.second,
  }
  return format.replace(/yyyy|yy|MMM|MM|M|dd|d|HH|H|mm|ss/g, (t) => tokens[t])
}

function renderNodes(nodes: Node[], scopes: TemplateData[], opts: RenderOptions): string {
  let out = ''
  for (const node of nodes) {
    if (node.type === 'text') out += node.value
    else if (node.type === 'var') {
      const v = lookup(scopes, node.name)
      if (v == null || Array.isArray(v)) continue
      out += node.format && (v instanceof Date || typeof v === 'string') ? formatDate(v, node.format, opts) : String(v)
    } else {
      const v = lookup(scopes, node.name)
      if (node.kind === '#') {
        const list = Array.isArray(v) ? v : hasValue(v) ? [{}] : []
        list.forEach((item, i) => {
          out += renderNodes(node.children, [...scopes, { n: i + 1 }, item], opts)
        })
      } else if ((node.kind === '?') === hasValue(v)) {
        out += renderNodes(node.children, scopes, opts)
      }
    }
  }
  return out
}

export function renderTemplate(template: TemplateSource, data: TemplateData, opts: RenderOptions = {}): string {
  return renderNodes(parse(joinSource(template)), [data], opts)
}

/** Format an amount like "$1,234" using the server's currency symbol. */
export function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${Math.round(amount || 0).toLocaleString('en-US')}`
}
