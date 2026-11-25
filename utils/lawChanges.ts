/**
 * Detect changes in a server's laws between visits, so officers notice new fines/sentences
 * instead of using outdated amounts. No imports (testable in Node).
 */

export interface LawLike {
  code: string
  description: string
  fine: string
  sentence: string
  stars?: string
}

/** code → the fields officers rely on */
export type LawSnapshot = Record<string, { description: string; fine: string; sentence: string; stars: string }>

export interface LawFieldChange {
  code: string
  field: 'description' | 'fine' | 'sentence' | 'stars'
  from: string
  to: string
}

export interface LawDiff {
  added: string[]
  removed: string[]
  changed: LawFieldChange[]
}

export function takeSnapshot(entries: LawLike[]): LawSnapshot {
  const snap: LawSnapshot = {}
  for (const e of entries) {
    snap[e.code] = {
      description: (e.description || '').trim(),
      fine: (e.fine || '').trim(),
      sentence: (e.sentence || '').trim(),
      stars: (e.stars || '').trim(),
    }
  }
  return snap
}

export function diffSnapshots(before: LawSnapshot, after: LawSnapshot): LawDiff {
  const added = Object.keys(after).filter((c) => !(c in before))
  const removed = Object.keys(before).filter((c) => !(c in after))
  const changed: LawFieldChange[] = []
  for (const code of Object.keys(after)) {
    const a = before[code]
    const b = after[code]
    if (!a) continue
    for (const field of ['fine', 'sentence', 'stars', 'description'] as const) {
      if ((a[field] || '') !== (b[field] || '')) changed.push({ code, field, from: a[field] || '-', to: b[field] || '-' })
    }
  }
  return { added, removed, changed }
}

export function isEmptyDiff(d: LawDiff): boolean {
  return d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0
}
