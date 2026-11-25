'use client'

/**
 * Law Importer: lets a server admin turn their law sheets into the standard laws.json
 * without touching code. Everything runs in the browser; nothing is uploaded anywhere.
 */

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useServerPack } from '@/servers'
import { useToast } from '@/components/ToastProvider'
import {
  LawDocType,
  LawEntry,
  TABLE_COLUMNS,
  buildLawsFile,
  csvToRows,
  parseGsheetHtml,
  parseTable,
  validateLawsFile,
} from '@/utils/lawImport'

type SourceFormat = 'gsheet-html' | 'table' | 'json'

interface ImportedFile {
  key: string
  fileName: string
  format: SourceFormat
  docType: LawDocType
  sourceName: string
  entries: LawEntry[]
  messages: string[]
  /** Raw content kept so the file can be re-parsed when the type or name changes */
  raw: string | string[][]
}

const DOC_TYPES: { id: LawDocType; label: string }[] = [
  { id: 'penal', label: 'Penal / criminal code' },
  { id: 'traffic', label: 'Traffic code' },
  { id: 'article7', label: 'Parking / zones' },
  { id: 'procedure', label: 'Procedures' },
]

const TEMPLATE_CSV =
  'code,description,fine,sentence,stars,bail,remarks,category\n' +
  'P.C. 1.1,Example offence,"$5,000",10 months,⭐,$10000,Optional notes,CRIMES AGAINST PERSONS\n'

function guessDocType(name: string): LawDocType {
  const n = name.toLowerCase()
  if (n.includes('traffic')) return 'traffic'
  if (n.includes('parking') || n.includes('article 7')) return 'article7'
  if (n.includes('procedure') || n.includes('arrest')) return 'procedure'
  return 'penal'
}

function parse(format: SourceFormat, raw: string | string[][], docType: LawDocType, sourceName: string) {
  const opts = { docType, sourceName }
  if (format === 'gsheet-html') {
    const entries = parseGsheetHtml(raw as string, opts)
    return {
      entries,
      messages: entries.length
        ? []
        : ['No laws found. Codes must start with "P.C.", "T.C.", "TC" or "§" (e.g. "P.C. 2.1.1"). Try the CSV template instead.'],
    }
  }
  if (format === 'table') {
    const res = parseTable(raw as string[][], opts)
    return { entries: res.entries, messages: res.errors }
  }
  // json: either a full laws.json or a plain array of entries
  try {
    const data = JSON.parse(raw as string)
    const list: LawEntry[] = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : []
    const entries = list.map((e) => ({ ...e, documentType: docType, sourceDocument: sourceName }))
    const problems = validateLawsFile(buildLawsFile('check', entries))
    return { entries: problems.length ? [] : entries, messages: problems.slice(0, 10) }
  } catch {
    return { entries: [], messages: ['This file is not valid JSON.'] }
  }
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function LawImporterPage() {
  const pack = useServerPack()
  const { showToast } = useToast()
  const [serverId, setServerId] = useState(pack.server.id)
  const [files, setFiles] = useState<ImportedFile[]>([])
  const [busy, setBusy] = useState(false)

  const allEntries = useMemo(() => files.flatMap((f) => f.entries), [files])
  const duplicateCodes = useMemo(() => {
    const seen = new Map<string, number>()
    allEntries.forEach((e) => seen.set(e.code, (seen.get(e.code) || 0) + 1))
    return Array.from(seen.entries()).filter(([, n]) => n > 1).map(([c]) => c)
  }, [allEntries])

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setBusy(true)
    const added: ImportedFile[] = []
    for (const file of Array.from(list)) {
      const lower = file.name.toLowerCase()
      const docType = guessDocType(file.name)
      const sourceName = file.name.replace(/\.[^.]+$/, '')
      let format: SourceFormat
      let raw: string | string[][]
      try {
        if (lower.endsWith('.html') || lower.endsWith('.htm')) {
          format = 'gsheet-html'
          raw = await file.text()
        } else if (lower.endsWith('.csv')) {
          format = 'table'
          raw = csvToRows(await file.text())
        } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
          format = 'table'
          const XLSX = await import('xlsx')
          const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
          raw = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' })
        } else if (lower.endsWith('.json')) {
          format = 'json'
          raw = await file.text()
        } else {
          showToast(`${file.name}: use .html, .csv, .xlsx or .json`, 'error')
          continue
        }
      } catch {
        showToast(`Could not read ${file.name}`, 'error')
        continue
      }
      const res = parse(format, raw, docType, sourceName)
      added.push({ key: `${file.name}-${Date.now()}-${Math.random()}`, fileName: file.name, format, docType, sourceName, raw, ...res })
    }
    setFiles((prev) => [...prev, ...added])
    setBusy(false)
  }

  const updateFile = (key: string, changes: Partial<Pick<ImportedFile, 'docType' | 'sourceName'>>) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f
        const next = { ...f, ...changes }
        return { ...next, ...parse(next.format, next.raw, next.docType, next.sourceName) }
      })
    )
  }

  const handleDownload = () => {
    const out = buildLawsFile(serverId.trim() || pack.server.id, allEntries)
    const problems = validateLawsFile(out)
    if (problems.length) {
      showToast(`Can't export: ${problems[0]}`, 'error')
      return
    }
    download('laws.json', JSON.stringify(out, null, 1) + '\n', 'application/json')
    showToast(`Downloaded laws.json with ${allEntries.length} entries`, 'success')
  }

  const sourcesSnippet = JSON.stringify(
    files.map((f) => ({
      docType: f.docType,
      file: `sources/${f.fileName}`,
      format: f.format,
      name: f.sourceName,
      version: f.sourceName,
    })),
    null,
    2
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-outline-variant pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Law Importer</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Turn your server&apos;s law sheets into a <code className="font-mono">laws.json</code> file this toolkit can use.
          Files stay on your computer; nothing is uploaded.
        </p>
      </div>

      {/* Step 1: files */}
      <div className="card border border-outline-variant rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold font-mono text-on-surface">1. Add your law files</h2>
        <ul className="text-xs text-on-surface-variant space-y-1 list-disc pl-5">
          <li>
            <strong>Google Sheets:</strong> File → Download → Web page (.html). Codes must look like <code>P.C. 2.1.1</code>,{' '}
            <code>T.C. 3-1</code> or <code>§ 4</code>.
          </li>
          <li>
            <strong>Any spreadsheet:</strong> CSV or XLSX with a header row. Columns: <code>{Object.keys(TABLE_COLUMNS).join(', ')}</code>{' '}
            (only <code>code</code> and <code>description</code> are required).{' '}
            <button
              onClick={() => download('laws-template.csv', TEMPLATE_CSV, 'text/csv')}
              className="text-primary underline font-semibold"
            >
              Download CSV template
            </button>
          </li>
          <li>
            <strong>JSON:</strong> an existing <code>laws.json</code> (to combine or re-label it).
          </li>
        </ul>
        <label className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-on-primary rounded text-xs font-mono font-bold cursor-pointer hover:bg-primary-container">
          <span>📂</span> {busy ? 'Reading…' : 'Choose files'}
          <input
            type="file"
            multiple
            accept=".html,.htm,.csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* Step 2: review */}
      {files.length > 0 && (
        <div className="card border border-outline-variant rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold font-mono text-on-surface">2. Check each file</h2>
          {files.map((f) => (
            <div key={f.key} className="border border-outline-variant/60 rounded p-3 space-y-2 bg-surface-container-lowest">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="font-bold text-on-surface">{f.fileName}</span>
                <span className={f.entries.length ? 'text-secondary' : 'text-error'}>{f.entries.length} laws</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}
                  className="ml-auto text-on-surface-variant hover:text-error"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-mono text-on-surface-variant">
                  Type
                  <select
                    value={f.docType}
                    onChange={(e) => updateFile(f.key, { docType: e.target.value as LawDocType })}
                    className="mt-1 w-full px-2 py-1.5 bg-surface-container border border-outline-variant rounded text-xs text-on-surface"
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-mono text-on-surface-variant">
                  Source name (shown to officers)
                  <input
                    value={f.sourceName}
                    onChange={(e) => updateFile(f.key, { sourceName: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 bg-surface-container border border-outline-variant rounded text-xs text-on-surface"
                  />
                </label>
              </div>
              {f.messages.map((m, i) => (
                <p key={i} className="text-[11px] font-mono text-amber-400">⚠️ {m}</p>
              ))}
              {f.entries.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="text-left text-on-surface-variant">
                        <th className="pr-3 py-1">Code</th>
                        <th className="pr-3 py-1">Description</th>
                        <th className="pr-3 py-1">Fine</th>
                        <th className="pr-3 py-1">Sentence</th>
                        <th className="pr-3 py-1">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.entries.slice(0, 5).map((e) => (
                        <tr key={e.id} className="border-t border-outline-variant/40 text-on-surface">
                          <td className="pr-3 py-1 whitespace-nowrap">{e.code}</td>
                          <td className="pr-3 py-1">{e.description}</td>
                          <td className="pr-3 py-1">{e.fine}</td>
                          <td className="pr-3 py-1">{e.sentence}</td>
                          <td className="pr-3 py-1">{e.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {f.entries.length > 5 && (
                    <p className="text-[10px] text-on-surface-variant mt-1">…and {f.entries.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {duplicateCodes.length > 0 && (
            <p className="text-[11px] font-mono text-amber-400">
              ⚠️ These codes appear more than once across files: {duplicateCodes.slice(0, 10).join(', ')}
              {duplicateCodes.length > 10 ? '…' : ''}
            </p>
          )}
        </div>
      )}

      {/* Step 3: export */}
      {allEntries.length > 0 && (
        <div className="card border border-outline-variant rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-bold font-mono text-on-surface">3. Export</h2>
          <label className="block text-[11px] font-mono text-on-surface-variant max-w-xs">
            Server id (folder name)
            <input
              value={serverId}
              onChange={(e) => setServerId(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
              className="mt-1 w-full px-2 py-1.5 bg-surface-container border border-outline-variant rounded text-xs text-on-surface"
            />
          </label>
          <button
            onClick={handleDownload}
            className="px-3 py-2 bg-primary text-on-primary rounded text-xs font-mono font-bold hover:bg-primary-container"
          >
            ⬇ Download laws.json ({allEntries.length} laws)
          </button>
          <div className="text-xs text-on-surface-variant space-y-1">
            <p>To add it to the toolkit:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Put <code>laws.json</code> in <code>public/servers/{serverId || 'your-server'}/</code>.
              </li>
              <li>
                Copy your original files into <code>servers/{serverId || 'your-server'}/sources/</code> and list them in that
                pack&apos;s <code>legislation.json</code> → <code>sources</code> (below), so <code>npm run import-laws</code> can rebuild it later.
              </li>
            </ol>
            <pre className="mt-2 p-2 bg-surface-dim border border-outline-variant/60 rounded text-[10px] overflow-x-auto">{sourcesSnippet}</pre>
          </div>
        </div>
      )}

      <p className="text-[11px] font-mono text-on-surface-variant">
        Full guide: <code>CONTRIBUTING.md</code> in the project.{' '}
        <Link href="/profile" className="text-primary underline">Back to profile</Link>
      </p>
    </div>
  )
}
