import { parse } from 'csv-parse/sync'
import { parseXlsx } from './xlsx-parser.js'
import { normalizePurchaseColumns, applyColumnMapping } from './schema-normalizer.js'

export interface PurchaseRow {
  customerId: string
  productIdentifier: string  // id or name — matched against catalog later
  orderDate: string
  quantity: number
}

// customer_id → { productIdentifier → purchase count }
export type PurchaseMatrix = Record<string, Record<string, number>>

export async function parsePurchaseHistory(
  buffer: Buffer,
  mimeType: string,
): Promise<PurchaseMatrix> {
  let rawRows: Record<string, string>[]

  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || mimeType === 'application/vnd.ms-excel') {
    const { rows } = parseXlsx(buffer)
    rawRows = rows
  } else {
    // CSV (including Shopify export)
    rawRows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]
  }

  if (rawRows.length === 0) return {}

  const headers = Object.keys(rawRows[0]!)
  const mapping = await normalizePurchaseColumns(headers, rawRows.slice(0, 5))
  const normalized = applyColumnMapping(rawRows, mapping)

  const matrix: PurchaseMatrix = {}

  for (const row of normalized) {
    const customerId = row.customer_id?.trim()
    const productId = (row.product_id || row.product_name)?.trim()
    const qty = parseInt(row.quantity ?? '1') || 1

    if (!customerId || !productId) continue

    if (!matrix[customerId]) matrix[customerId] = {}
    matrix[customerId][productId] = (matrix[customerId][productId] ?? 0) + qty
  }

  return matrix
}

// Returns a frequency map of productIdentifier → total units sold across all customers
export function buildProductFrequency(matrix: PurchaseMatrix): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const purchases of Object.values(matrix)) {
    for (const [pid, qty] of Object.entries(purchases)) {
      freq[pid] = (freq[pid] ?? 0) + qty
    }
  }
  return freq
}
