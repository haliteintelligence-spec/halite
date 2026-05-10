import { BY_IATA, type AirportEntry } from '../data/airports.js'
import { BY_ALPHA2, BY_ALPHA3, type CountryEntry } from '../data/countries.js'
import { BY_REGION_CODE, type RegionEntry } from '../data/regions.js'

export type MatchType = 'IATA' | 'COUNTRY_A2' | 'COUNTRY_A3' | 'REGION' | 'GEOCODE'
export type LocationIcon = 'airport' | 'city' | 'country' | 'region'

export interface LocationSuggestion {
  displayName: string
  matchedCode: string | null
  matchType: MatchType
  icon: LocationIcon
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  timezone: string
  currency: string
}

// ── Levenshtein distance (fuzzy fallback) ─────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
    }
  }
  return dp[m]![n]!
}

// ── Static resolution ─────────────────────────────────────────────────────

function airportToSuggestion(a: AirportEntry): LocationSuggestion {
  return {
    displayName: `${a.city}, ${a.country}`,
    matchedCode: a.iata,
    matchType: 'IATA',
    icon: 'airport',
    city: a.city,
    country: a.country,
    countryCode: a.countryCode,
    lat: a.lat,
    lng: a.lng,
    timezone: a.timezone,
    currency: BY_ALPHA2.get(a.countryCode)?.currency ?? 'USD',
  }
}

function countryToSuggestion(c: CountryEntry, matchType: 'COUNTRY_A2' | 'COUNTRY_A3'): LocationSuggestion {
  return {
    displayName: `${c.name} → ${c.largestCity}`,
    matchedCode: matchType === 'COUNTRY_A2' ? c.alpha2 : c.alpha3,
    matchType,
    icon: 'country',
    city: c.largestCity,
    country: c.name,
    countryCode: c.alpha2,
    lat: c.lat,
    lng: c.lng,
    timezone: c.timezone,
    currency: c.currency,
  }
}

function regionToSuggestion(r: RegionEntry): LocationSuggestion {
  return {
    displayName: `${r.name} → ${r.largestCity}`,
    matchedCode: r.code,
    matchType: 'REGION',
    icon: 'region',
    city: r.largestCity,
    country: r.country,
    countryCode: r.countryCode,
    lat: r.lat,
    lng: r.lng,
    timezone: r.timezone,
    currency: r.currency,
  }
}

export function resolveCode(input: string): LocationSuggestion[] {
  const upper = input.toUpperCase().trim()
  const results: LocationSuggestion[] = []

  if (upper.length === 2) {
    const country = BY_ALPHA2.get(upper)
    if (country) results.push(countryToSuggestion(country, 'COUNTRY_A2'))
    const region = BY_REGION_CODE.get(upper)
    if (region) results.push(regionToSuggestion(region))
  }

  if (upper.length === 3) {
    const airport = BY_IATA.get(upper)
    if (airport) results.push(airportToSuggestion(airport))
    const country = BY_ALPHA3.get(upper)
    if (country) results.push(countryToSuggestion(country, 'COUNTRY_A3'))
  }

  // Partial IATA prefix match (e.g. "LO" → LOS, LON, LOD...)
  if (upper.length === 2) {
    for (const [code, airport] of BY_IATA) {
      if (code.startsWith(upper) && !results.some((r) => r.matchedCode === code)) {
        results.push(airportToSuggestion(airport))
        if (results.length >= 5) break
      }
    }
  }

  return results.slice(0, 5)
}

// ── Fuzzy match against static datasets ───────────────────────────────────

export function fuzzyMatch(input: string, limit = 3): LocationSuggestion[] {
  const query = input.toLowerCase().trim()
  const scored: Array<{ suggestion: LocationSuggestion; score: number }> = []

  for (const airport of BY_IATA.values()) {
    const cityScore = levenshtein(query, airport.city.toLowerCase())
    const nameScore = levenshtein(query, airport.name.toLowerCase())
    const score = Math.min(cityScore, nameScore)
    if (score <= 3) {
      scored.push({ suggestion: airportToSuggestion(airport), score })
    }
  }

  for (const country of BY_ALPHA2.values()) {
    const score = levenshtein(query, country.name.toLowerCase())
    if (score <= 3) {
      scored.push({ suggestion: countryToSuggestion(country, 'COUNTRY_A2'), score })
    }
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.suggestion)
}

// ── Geocoding (OpenCage) for free-text queries ─────────────────────────────

export interface GeocodeResult {
  displayName: string
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  timezone: string
  currency: string
}

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  const key = process.env.GEOCODING_API_KEY
  if (!key) return []

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${key}&limit=5&no_annotations=0&language=en`
  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json() as OpenCageResponse
  return data.results
    .filter((r) => r.geometry && r.components)
    .map((r) => {
      const city =
        r.components.city ??
        r.components.town ??
        r.components.village ??
        r.components.state ??
        r.components.country ??
        query
      const countryCode = r.components['ISO_3166-1_alpha-2'] ?? ''
      const currency = BY_ALPHA2.get(countryCode)?.currency ?? 'USD'
      const timezone = r.annotations?.timezone?.name ?? 'UTC'
      return {
        displayName: r.formatted,
        city,
        country: r.components.country ?? '',
        countryCode,
        lat: r.geometry.lat,
        lng: r.geometry.lng,
        timezone,
        currency,
      }
    })
}

interface OpenCageResponse {
  results: Array<{
    formatted: string
    geometry: { lat: number; lng: number }
    components: Record<string, string>
    annotations?: { timezone?: { name: string } }
  }>
}

// ── Main suggest function — called by the route ───────────────────────────

export async function suggestLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // Try static code resolution first (zero latency)
  const staticResults = resolveCode(trimmed)
  if (staticResults.length > 0) return staticResults

  // Geocoding API for free-text (3+ chars)
  if (trimmed.length >= 3) {
    const geoResults = await geocodeQuery(trimmed)
    if (geoResults.length > 0) {
      return geoResults.map((g) => ({
        ...g,
        matchedCode: null,
        matchType: 'GEOCODE' as MatchType,
        icon: 'city' as LocationIcon,
      }))
    }
  }

  // Fuzzy fallback
  return fuzzyMatch(trimmed)
}
