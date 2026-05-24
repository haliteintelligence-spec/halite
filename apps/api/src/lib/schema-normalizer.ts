import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Canonical column names the catalog-processor expects
const CATALOG_TARGET_COLUMNS = [
  'name', 'description', 'category', 'concerns', 'skin_types',
  'monk_skin_tones', 'ingredients', 'key_ingredients', 'price',
  'currency', 'image_url', 'product_url', 'external_id', 'in_stock',
]

const PURCHASE_TARGET_COLUMNS = [
  'customer_id', 'product_id', 'product_name', 'order_date', 'quantity',
]

export async function normalizeCatalogColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<Record<string, string>> {
  // If all headers already match, skip the Claude call
  const alreadyMatch = CATALOG_TARGET_COLUMNS.filter(t => headers.includes(t))
  if (alreadyMatch.length >= Math.min(4, headers.length)) {
    return Object.fromEntries(headers.map(h => [h, h]))
  }

  return inferMapping(headers, sampleRows, CATALOG_TARGET_COLUMNS, 'product catalog')
}

export async function normalizePurchaseColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<Record<string, string>> {
  const alreadyMatch = PURCHASE_TARGET_COLUMNS.filter(t => headers.includes(t))
  if (alreadyMatch.length >= 3) {
    return Object.fromEntries(headers.map(h => [h, h]))
  }

  return inferMapping(headers, sampleRows, PURCHASE_TARGET_COLUMNS, 'purchase/order history')
}

async function inferMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
  targetColumns: string[],
  dataType: string,
): Promise<Record<string, string>> {
  const preview = sampleRows.slice(0, 3).map(r =>
    headers.map(h => `${h}: ${r[h] ?? ''}`).join(' | ')
  ).join('\n')

  const prompt = `You are mapping columns from a ${dataType} export to a standard schema.

Source columns: ${JSON.stringify(headers)}

Sample data (first 3 rows):
${preview}

Target schema columns: ${JSON.stringify(targetColumns)}

Return a JSON object where each KEY is a source column name and each VALUE is the best-matching target column name.
Only include columns that have a clear match. Omit source columns that don't map to anything.
If a source column maps to a target that is already claimed by a better match, omit the weaker one.
Return ONLY valid JSON, no explanation.`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '{}'
    const json = text.replace(/^```json\n?|\n?```$/g, '')
    return JSON.parse(json) as Record<string, string>
  } catch {
    // Fall back to identity mapping — let processor skip unknown columns
    return Object.fromEntries(headers.map(h => [h, h]))
  }
}

export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): Record<string, string>[] {
  return rows.map(row => {
    const out: Record<string, string> = {}
    for (const [src, tgt] of Object.entries(mapping)) {
      if (row[src] !== undefined) out[tgt] = row[src]!
    }
    return out
  })
}
