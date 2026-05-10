export type ClimateTag =
  | 'TROPICAL'
  | 'DRY_ARID'
  | 'TEMPERATE'
  | 'CONTINENTAL'
  | 'POLAR'
  | 'MEDITERRANEAN'

export interface ClimateSnapshot {
  tempAvgC: number
  tempMinC: number
  tempMaxC: number
  humidityAvg: number
  uvIndexAvg: number
  precipitationDays: number
  dominantCondition: string
  season: string
  forecastWindowDays: number
  capturedAt: string
}

export interface ClimateResult {
  climateTag: ClimateTag
  snapshot: ClimateSnapshot
}

// ── WeatherAPI.com ─────────────────────────────────────────────────────────

interface WeatherAPIForecastDay {
  date: string
  day: {
    avgtemp_c: number
    mintemp_c: number
    maxtemp_c: number
    avghumidity: number
    uv: number
    daily_will_it_rain: number
    condition: { text: string }
  }
}

interface WeatherAPIResponse {
  forecast: {
    forecastday: WeatherAPIForecastDay[]
  }
}

export async function fetchClimate(lat: number, lng: number): Promise<ClimateResult> {
  const key = process.env.WEATHER_API_KEY
  if (!key) return buildFallbackClimate(lat)

  // WeatherAPI free tier: 14 days. Paid: 30 days.
  // We request 14 and note it in the snapshot.
  const days = 14
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${lat},${lng}&days=${days}&aqi=no&alerts=no`

  let forecastDays: WeatherAPIForecastDay[] = []
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = await res.json() as WeatherAPIResponse
      forecastDays = data.forecast.forecastday
    }
  } catch {
    // Network failure — fall back to lat-based heuristic
  }

  if (forecastDays.length === 0) return buildFallbackClimate(lat)

  const tempAvgC = avg(forecastDays.map((d) => d.day.avgtemp_c))
  const tempMinC = Math.min(...forecastDays.map((d) => d.day.mintemp_c))
  const tempMaxC = Math.max(...forecastDays.map((d) => d.day.maxtemp_c))
  const humidityAvg = avg(forecastDays.map((d) => d.day.avghumidity))
  const uvIndexAvg = avg(forecastDays.map((d) => d.day.uv))
  const precipitationDays = forecastDays.filter((d) => d.day.daily_will_it_rain === 1).length
  const dominantCondition = mostFrequent(forecastDays.map((d) => d.day.condition.text))
  const season = getSeason(lat)

  const snapshot: ClimateSnapshot = {
    tempAvgC: round(tempAvgC),
    tempMinC: round(tempMinC),
    tempMaxC: round(tempMaxC),
    humidityAvg: round(humidityAvg),
    uvIndexAvg: round(uvIndexAvg),
    precipitationDays,
    dominantCondition,
    season,
    forecastWindowDays: days,
    capturedAt: new Date().toISOString(),
  }

  return {
    climateTag: classifyClimate(snapshot),
    snapshot,
  }
}

// ── Köppen-inspired classification ────────────────────────────────────────

function classifyClimate(s: ClimateSnapshot): ClimateTag {
  const { tempAvgC, humidityAvg, precipitationDays, tempMinC } = s

  if (tempAvgC >= 22 && humidityAvg >= 70 && precipitationDays >= 8)
    return 'TROPICAL'

  if (humidityAvg < 35 && precipitationDays <= 3)
    return 'DRY_ARID'

  if (tempMinC < 0)
    return 'CONTINENTAL'

  if (tempAvgC < 5)
    return 'POLAR'

  // Mediterranean: warm/hot dry summers — inferred from low precip + moderate humidity
  if (precipitationDays <= 4 && humidityAvg < 60 && tempAvgC >= 14)
    return 'MEDITERRANEAN'

  return 'TEMPERATE'
}

// ── Season (hemisphere-aware) ──────────────────────────────────────────────

function getSeason(lat: number): string {
  const month = new Date().getMonth() + 1 // 1–12
  const southern = lat < 0
  const seasons = southern
    ? ['Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
    : ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
  return seasons[month - 1]!
}

// ── Lat-based fallback (no API key / network failure) ─────────────────────

function buildFallbackClimate(lat: number): ClimateResult {
  const absLat = Math.abs(lat)
  let climateTag: ClimateTag
  let tempAvgC: number
  let humidityAvg: number
  let uvIndexAvg: number

  if (absLat < 15) {
    climateTag = 'TROPICAL'; tempAvgC = 28; humidityAvg = 80; uvIndexAvg = 10
  } else if (absLat < 25) {
    climateTag = 'DRY_ARID'; tempAvgC = 30; humidityAvg = 30; uvIndexAvg = 9
  } else if (absLat < 40) {
    climateTag = 'MEDITERRANEAN'; tempAvgC = 20; humidityAvg = 55; uvIndexAvg = 6
  } else if (absLat < 55) {
    climateTag = 'TEMPERATE'; tempAvgC = 12; humidityAvg = 65; uvIndexAvg = 4
  } else if (absLat < 65) {
    climateTag = 'CONTINENTAL'; tempAvgC = 5; humidityAvg = 70; uvIndexAvg = 3
  } else {
    climateTag = 'POLAR'; tempAvgC = -5; humidityAvg = 75; uvIndexAvg = 1
  }

  return {
    climateTag,
    snapshot: {
      tempAvgC,
      tempMinC: tempAvgC - 6,
      tempMaxC: tempAvgC + 6,
      humidityAvg,
      uvIndexAvg,
      precipitationDays: 0,
      dominantCondition: 'Unknown',
      season: getSeason(lat),
      forecastWindowDays: 0,
      capturedAt: new Date().toISOString(),
    },
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

function mostFrequent(arr: string[]): string {
  const freq = new Map<string, number>()
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? arr[0] ?? ''
}
