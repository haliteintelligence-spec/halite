import * as XLSX from 'xlsx'

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseXlsx(buffer: Buffer, sheetIndex = 0): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[sheetIndex]
  if (!sheetName) throw new Error('No sheets found in workbook')

  const sheet = workbook.Sheets[sheetName]!
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as unknown[][]

  if (raw.length < 2) return { headers: [], rows: [] }

  const headers = (raw[0] as unknown[]).map(h => String(h ?? '').trim()).filter(Boolean)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i] as unknown[]
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      const val = cells[idx]
      if (val instanceof Date) {
        row[h] = val.toISOString().split('T')[0]!
      } else {
        row[h] = String(val ?? '').trim()
      }
    })
    if (Object.values(row).some(v => v !== '')) rows.push(row)
  }

  return { headers, rows }
}

export function getSheetNames(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  return workbook.SheetNames
}
