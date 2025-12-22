export interface LawEntry {
  code: string
  description: string
  fine: string
  sentence: string
  stars: string
  bail: string
  remarks: string
  category?: string
}

export interface ParsedLawData {
  entries: LawEntry[]
  categories: string[]
}

/**
 * Parse HTML table to extract law entries
 * Works with Google Sheets exported HTML format
 */
export const parseHTMLTable = (htmlContent: string): ParsedLawData => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const entries: LawEntry[] = []
  let currentCategory = ''
  const categories: string[] = []
  
  // Find all table rows
  const rows = doc.querySelectorAll('tr')
  
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'))
    
    if (cells.length === 0) return
    
    // Check if this is a category header (large colored text)
    const firstCell = cells[0]
    const hasColspan = firstCell.getAttribute('colspan')
    const text = firstCell.textContent?.trim() || ''
    
    // Category detection (colorful headers like "CRIMES AGAINST SOCIETY")
    if (hasColspan && text.length > 0 && text === text.toUpperCase() && !text.includes('PENAL CODE')) {
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
    
    // Try to extract data rows with at least code and description
    // Typical structure: [empty], [empty], [code], [description], [fine], [sentence], [stars], [bail], [remarks]
    let code = ''
    let description = ''
    let fine = ''
    let sentence = ''
    let stars = ''
    let bail = ''
    let remarks = ''
    
    // Find code cell (contains P.C. or T.C. or §)
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent?.trim() || ''
      if (cellText.match(/^(P\.C\.|T\.C\.|§)\s*[\d.]+/)) {
        code = cellText
        
        // Next cells should be description, fine, sentence, etc.
        if (cells[i + 1]) description = cells[i + 1].textContent?.trim() || ''
        if (cells[i + 2]) fine = cells[i + 2].textContent?.trim() || ''
        if (cells[i + 3]) sentence = cells[i + 3].textContent?.trim() || ''
        if (cells[i + 4]) stars = cells[i + 4].textContent?.trim() || ''
        if (cells[i + 5]) bail = cells[i + 5].textContent?.trim() || ''
        if (cells[i + 6]) remarks = cells[i + 6].textContent?.trim() || ''
        
        break
      }
    }
    
    // Only add if we have a valid code
    if (code) {
      entries.push({
        code,
        description,
        fine,
        sentence,
        stars,
        bail,
        remarks,
        category: currentCategory
      })
    }
  })
  
  return { entries, categories }
}

/**
 * Load and parse HTML file from public directory
 */
export const loadHTMLData = async (filename: string): Promise<ParsedLawData> => {
  try {
    const response = await fetch(`/data/${filename}`)
    const html = await response.text()
    return parseHTMLTable(html)
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
    return { entries: [], categories: [] }
  }
}

/**
 * Load all law data from multiple HTML files
 */
export const loadAllLawData = async (): Promise<{
  penalCodes: ParsedLawData
  trafficCodes: ParsedLawData
  article7: ParsedLawData
  allEntries: LawEntry[]
}> => {
  const [penalCodes, trafficCodes, article7] = await Promise.all([
    loadHTMLData('Penal Code.html'),
    loadHTMLData('Traffic Codes.html'),
    loadHTMLData('Article 7.html').catch(() => ({ entries: [], categories: [] }))
  ])
  
  const allEntries = [
    ...penalCodes.entries,
    ...trafficCodes.entries,
    ...article7.entries
  ]
  
  return {
    penalCodes,
    trafficCodes,
    article7,
    allEntries
  }
}

/**
 * Filter law entries by search term
 */
export const filterLawEntries = (
  entries: LawEntry[],
  searchTerm: string
): LawEntry[] => {
  if (!searchTerm.trim()) return entries
  
  const term = searchTerm.toLowerCase()
  return entries.filter(
    (entry) =>
      entry.code.toLowerCase().includes(term) ||
      entry.description.toLowerCase().includes(term) ||
      entry.remarks.toLowerCase().includes(term) ||
      entry.category?.toLowerCase().includes(term)
  )
}
