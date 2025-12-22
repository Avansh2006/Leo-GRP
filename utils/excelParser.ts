import * as XLSX from 'xlsx'

export interface PenalCodeEntry {
  code: string
  description: string
  fine: string
  sentence: string
  stars: string
  bail: string
  remarks: string
}

export const parseExcelFile = async (file: File): Promise<PenalCodeEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as string[][]
        
        // Skip header row and parse data
        const entries: PenalCodeEntry[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row[0]) { // Only process rows with a penal code
            entries.push({
              code: row[0]?.toString() || '',
              description: row[1]?.toString() || '',
              fine: row[2]?.toString() || '',
              sentence: row[3]?.toString() || '',
              stars: row[4]?.toString() || '',
              bail: row[5]?.toString() || '',
              remarks: row[6]?.toString() || '',
            })
          }
        }
        
        resolve(entries)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}

export const loadDefaultExcelData = async (): Promise<PenalCodeEntry[]> => {
  try {
    const response = await fetch('/data/patrol.xlsx')
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
    }) as string[][]
    
    const entries: PenalCodeEntry[] = []
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (row[0]) {
        entries.push({
          code: row[0]?.toString() || '',
          description: row[1]?.toString() || '',
          fine: row[2]?.toString() || '',
          sentence: row[3]?.toString() || '',
          stars: row[4]?.toString() || '',
          bail: row[5]?.toString() || '',
          remarks: row[6]?.toString() || '',
        })
      }
    }
    
    return entries
  } catch (error) {
    console.error('Error loading default Excel data:', error)
    return []
  }
}

export const filterPenalCodes = (
  entries: PenalCodeEntry[],
  searchTerm: string
): PenalCodeEntry[] => {
  if (!searchTerm.trim()) return entries
  
  const term = searchTerm.toLowerCase()
  return entries.filter(
    (entry) =>
      entry.code.toLowerCase().includes(term) ||
      entry.description.toLowerCase().includes(term) ||
      entry.remarks.toLowerCase().includes(term)
  )
}
