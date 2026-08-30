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
 * Parse HTML table to extract law entries (Penal & Traffic Codes)
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
 * Parse Arresting Procedure table into structured procedure entries
 */
export const parseProcedureHTML = (htmlContent: string): ParsedLawData => {
  const sourceName = 'Procedures of Detention and Arrest (3rd Rendition)'
  const categories = ['ARREST & DETENTION PROCEDURES']
  
  // Standardized structured procedure rules parsed from official doc
  const entries: LawEntry[] = [
    {
      id: 'proc-1-1-handcuffing',
      code: 'PROC 1.1',
      description: 'Handcuffing and Initial Detention',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'Always holster your weapon before performing any action. Begin 25-minute arrest timer. Command: "Sir/Mam I am going to be putting you in handcuffs now, please stand still." Flex "Z" muscle. If suspect refuses to stand still or runs, warn them; if refusal continues, taze and handcuff.',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Holster weapon before performing actions',
        'Start 25-minute arrest timer',
        'Instruct suspect to stand still',
        'If suspect runs or refuses, warn then taze and handcuff',
      ],
    },
    {
      id: 'proc-1-2-transport',
      code: 'PROC 1.2',
      description: 'Suspect Escort and Vehicle Transport',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'Inform suspect: "Sir/Mam I am going to be grabbing you by the arm now." Flex "X" muscle to move. ALWAYS tell suspect "WATCH YOUR HEAD" when placing or removing from vehicle. Place via G-muscle > Organization > Place in vehicle. Drive carefully to DOC, avoid highways unless being chased.',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Grab suspect by arm using X muscle',
        'Tell suspect "Watch your head" before placing in/out of vehicle',
        'Radio 10-17 convoy to DOC',
        'Avoid highways and adhere to speed limit unless in active pursuit',
      ],
    },
    {
      id: 'proc-1-3-miranda',
      code: 'PROC 1.3',
      description: 'Miranda Rights Reading Protocol',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'Read Miranda Rights: "You have the right to remain silent. Anything you say can and will be used against you in a court of law. You have the right to an attorney. If you cannot afford an attorney, one will be appointed to you by the state if available. Do you understand the rights I just read to you?" If suspect ignores or says they do not understand, wait 5 seconds and repeat up to 3 total attempts.',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Read 4-part Miranda rights warning',
        'If ignored/denied, wait 5 seconds and repeat (3 attempts maximum)',
        'After 3rd ignored attempt, inform them rights were read 3 times and proceed',
      ],
    },
    {
      id: 'proc-1-4-lawyer',
      code: 'PROC 1.4',
      description: 'Legal Counsel & Lawyer Request Protocol',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'If suspect requests private or state lawyer, PAUSE the 25-minute timer. For private lawyer: detainee must provide phone number without delay; wait 15 minutes or 3 valid contact attempts. For state lawyer: radio dispatch; wait 2 minutes for response; if attorney enroute, wait up to 15 minutes. Always inspect lawyer ID/license. Provide bodycam proof within 10 minutes upon request.',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Pause 25-minute timer upon lawyer request',
        'Private lawyer: detainee must give cell number, wait 15 mins or 3 calls',
        'State lawyer: call dispatch, wait 2 mins, if confirmed wait 15 mins',
        'Verify lawyer state license/ID',
        '10 minutes to show bodycam footage upon lawful request',
      ],
    },
    {
      id: 'proc-1-5-identification-search',
      code: 'PROC 1.5',
      description: 'Mask Removal, Identification Search & Seizure Protocol',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'If suspect is wearing a mask or refuses to identify: give them 10 seconds to remove the mask. If they refuse, forcefully remove the mask and destroy it if they resist. Search pockets for passport/identification via G-muscle > Organisation > Find personal information. Search for illegal items. Seize illegal weapons with serial "XXX" or state agency weapons. Valid gun license allows keeping items tagged as "AMMO". Log all confiscations with photo in #confiscation-logs.',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Give 10 seconds for voluntary mask removal',
        'Forcefully remove mask and search for ID if non-compliant',
        'Search pockets for passport/identification (Organisation > Find Personal Info)',
        'Seize XXX serial / government weapons; retain ammo only with valid license',
        'Log photo in discord #confiscation-logs',
      ],
    },
    {
      id: 'proc-1-6-incarceration',
      code: 'PROC 1.6',
      description: 'DOC Processing, Wanted Level PDA Issuance & Incarceration',
      fine: '-',
      sentence: '-',
      stars: '-',
      bail: '-',
      remarks: 'At DOC counter: provide medical attention if needed, ask for jumpsuit size, issue jumpsuit. Pull out PDA (J-muscle) and issue wanted levels separately for every crime charged (e.g. "P.C. 3.10 Attempted murder"). Ask final questions, escort to cell, lock cell behind you (G-muscle > Organization > Arrest or Isolation). Radio dispatch: "(Badge) to dispatch, show my last 10-15 is now 10-99 and I am 10-19".',
      category: 'ARREST & DETENTION PROCEDURES',
      documentType: 'procedure',
      sourceDocument: sourceName,
      subsections: [
        'Provide medical attention upon arrival',
        'Issue jumpsuit from front counter',
        'Issue PDA wanted stars separately for each crime (J-muscle)',
        'Lock cell door (Organization > Arrest or Isolation)',
        'Radio 10-99 completed processing',
      ],
    },
  ]

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
    if (docType === 'procedure') {
      return parseProcedureHTML(html)
    }
    return parseHTMLTable(html, docType, sourceName)
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
    if (docType === 'procedure') {
      return parseProcedureHTML('')
    }
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
  procedures: ParsedLawData
  allEntries: LawEntry[]
}> => {
  const [penalCodes, trafficCodes, article7, procedures] = await Promise.all([
    loadHTMLData('Penal Code.html', 'penal', 'Penal Codes of San Andreas'),
    loadHTMLData('Traffic Codes.html', 'traffic', 'Traffic Code (2nd Rendition — 28.07.2025)'),
    loadHTMLData('Article 7.html', 'article7', 'Article 7 (Parking Regulations — 28.07.2025)').catch(() => ({
      entries: [],
      categories: [],
      sourceDocument: 'Article 7',
    })),
    loadHTMLData('Arresting Procedure.html', 'procedure', 'Procedures of Detention and Arrest (3rd Rendition)').catch(() =>
      parseProcedureHTML('')
    ),
  ])

  const allEntries = [
    ...penalCodes.entries,
    ...trafficCodes.entries,
    ...article7.entries,
    ...procedures.entries,
  ]

  return {
    penalCodes,
    trafficCodes,
    article7,
    procedures,
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
      score += 150
    } else if (codeLower.includes(term)) {
      score += 100
    } else if (descLower === term) {
      score += 90
    } else if (descLower.startsWith(term)) {
      score += 75
    } else if (descLower.includes(term)) {
      score += 50
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
