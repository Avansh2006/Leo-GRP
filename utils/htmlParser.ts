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
  documentType: 'traffic' | 'penal' | 'article7' | 'procedure'
  sourceDocument: string
  chapter?: string
  subsections?: string[]
}

export interface ParsedLawData {
  entries: LawEntry[]
  categories: string[]
  sourceDocument: string
}

/**
 * Generate clean stable ID for a law entry
 */
export function generateLawId(code: string, category?: string): string {
  const cleanCode = code.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (cleanCode) return `law-${cleanCode}`
  const cleanCat = (category || 'item').toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `law-${cleanCat}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Parse HTML table to extract law entries
 * Works with Google Sheets exported HTML format
 */
export const parseHTMLTable = (
  htmlContent: string,
  docType: 'traffic' | 'penal' | 'article7' | 'procedure' = 'penal',
  sourceName = 'State Legislation'
): ParsedLawData => {
  if (typeof window === 'undefined') {
    return { entries: [], categories: [], sourceDocument: sourceName }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const entries: LawEntry[] = []
  let currentCategory = docType === 'traffic' ? 'TRAFFIC CODE' : 'GENERAL'
  const categories: string[] = []

  // Find all table rows
  const rows = doc.querySelectorAll('tr')

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length === 0) return

    // Check if this is a category header
    const firstCell = cells[0]
    const hasColspan = firstCell.getAttribute('colspan')
    const text = firstCell.textContent?.trim() || ''

    // Category detection (large colored headers like "CRIMES AGAINST SOCIETY")
    if (
      hasColspan &&
      text.length > 0 &&
      text === text.toUpperCase() &&
      !text.includes('PENAL CODE') &&
      !text.includes('LAW DESCRIPTION')
    ) {
      currentCategory = text
      if (!categories.includes(currentCategory)) {
        categories.push(currentCategory)
      }
      return
    }

    // Skip header rows
    if (text.includes('PENAL CODE') || text.includes('LAW DESCRIPTION') || text.includes('TRAFFIC CODE')) {
      return
    }

    let code = ''
    let description = ''
    let fine = ''
    let sentence = ''
    let stars = ''
    let bail = ''
    let remarks = ''

    // Find code cell (contains P.C. or T.C. or § or TC)
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent?.trim() || ''
      if (cellText.match(/^(P\.C\.|T\.C\.|TC|§)\s*[\d.a-z]+/i)) {
        code = cellText

        if (cells[i + 1]) description = cells[i + 1].textContent?.trim() || ''
        if (cells[i + 2]) fine = cells[i + 2].textContent?.trim() || ''
        if (cells[i + 3]) sentence = cells[i + 3].textContent?.trim() || ''
        if (cells[i + 4]) stars = cells[i + 4].textContent?.trim() || ''
        if (cells[i + 5]) bail = cells[i + 5].textContent?.trim() || ''
        if (cells[i + 6]) remarks = cells[i + 6].textContent?.trim() || ''

        break
      }
    }

    // Fallback for special Article 7 or section rows without standard P.C. prefix
    if (!code && docType === 'article7') {
      const headingCell = cells.find((c) => c.textContent?.trim().startsWith('TC 7.'))
      if (headingCell) {
        code = headingCell.textContent?.trim() || ''
        description = 'Article 7 Parking Zone'
        remarks = 'Parking regulation as defined in Article 7'
      }
    }

    // Add valid entry
    if (code) {
      const subsections = remarks
        ? remarks
            .split(/<br\s*\/?>|\n|-(?=\s)/gi)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : []

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
        subsections: subsections.length > 1 ? subsections : undefined,
      })
    }
  })

  if (!categories.includes(currentCategory) && currentCategory) {
    categories.push(currentCategory)
  }

  return { entries, categories, sourceDocument: sourceName }
}

/**
 * Load and parse HTML file from public directory
 */
export const loadHTMLData = async (
  filename: string,
  docType: 'traffic' | 'penal' | 'article7' | 'procedure' = 'penal',
  sourceName = 'State Legislation'
): Promise<ParsedLawData> => {
  try {
    const response = await fetch(`/data/${encodeURIComponent(filename)}`)
    const html = await response.text()
    return parseHTMLTable(html, docType, sourceName)
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
    return { entries: [], categories: [], sourceDocument: sourceName }
  }
}

/**
 * Load all law data from multiple HTML files with active source tagging
 */
export const loadAllLawData = async (): Promise<{
  penalCodes: ParsedLawData
  trafficCodes: ParsedLawData
  article7: ParsedLawData
  allEntries: LawEntry[]
}> => {
  const [penalCodes, trafficCodes, article7] = await Promise.all([
    loadHTMLData('Penal Code.html', 'penal', 'Penal Codes of San Andreas'),
    loadHTMLData('Traffic Codes.html', 'traffic', 'Traffic Code (2nd Rendition — 28.07.2025)'),
    loadHTMLData('Article 7.html', 'article7', 'Article 7 (Parking Regulations — 28.07.2025)').catch(() => ({
      entries: [],
      categories: [],
      sourceDocument: 'Article 7',
    })),
  ])

  const allEntries = [...penalCodes.entries, ...trafficCodes.entries, ...article7.entries]

  return {
    penalCodes,
    trafficCodes,
    article7,
    allEntries,
  }
}

/**
 * Scored in-memory filter and rank for legislation entries
 */
export const filterLawEntries = (entries: LawEntry[], searchTerm: string): LawEntry[] => {
  if (!searchTerm.trim()) return entries

  const term = searchTerm.toLowerCase().trim()
  const scored: { entry: LawEntry; score: number }[] = []

  for (const entry of entries) {
    const codeLower = entry.code.toLowerCase()
    const descLower = entry.description.toLowerCase()
    const remarksLower = (entry.remarks || '').toLowerCase()
    const catLower = (entry.category || '').toLowerCase()

    let score = 0

    // Exact code match (e.g. "p.c. 2.1.1" or "2.1.1" or "t.c. 3.5")
    if (codeLower === term || codeLower.replace(/\s+/g, '') === term.replace(/\s+/g, '')) {
      score += 120
    } else if (codeLower.includes(term)) {
      score += 90
    } else if (descLower === term) {
      score += 80
    } else if (descLower.startsWith(term)) {
      score += 65
    } else if (descLower.includes(term)) {
      score += 45
    } else if (remarksLower.includes(term)) {
      score += 25
    } else if (catLower.includes(term)) {
      score += 15
    }

    if (score > 0) {
      scored.push({ entry, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.entry)
}
