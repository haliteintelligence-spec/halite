/**
 * Downloads the OpenFlights airports dataset (public domain) and writes
 * apps/api/src/data/airports-full.json for runtime use.
 *
 * Run: pnpm --filter @halite/api airports:fetch
 */

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/airports-full.json')

const URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'

interface RawRow {
  0: string  // id
  1: string  // name
  2: string  // city
  3: string  // country
  4: string  // IATA (3-letter or \N)
  5: string  // ICAO
  6: string  // lat
  7: string  // lng
  8: string  // altitude
  9: string  // UTC offset
  10: string // DST
  11: string // timezone
  12: string // type
  13: string // source
}

async function main() {
  console.log('Fetching OpenFlights airports dataset…')
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  const text = await res.text()

  const rows: RawRow[] = parse(text, {
    relax_quotes: true,
    skip_empty_lines: true,
  })

  const airports = rows
    .filter((r) => r[4] !== '\\N' && r[4].length === 3)
    .map((r) => ({
      iata: r[4].trim(),
      name: r[1].trim(),
      city: r[2].trim(),
      country: r[3].trim(),
      lat: parseFloat(r[6]),
      lng: parseFloat(r[7]),
      timezone: r[11].trim(),
    }))
    .filter((a) => !isNaN(a.lat) && !isNaN(a.lng))

  writeFileSync(OUT, JSON.stringify(airports, null, 2))
  console.log(`Written ${airports.length} airports to ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
