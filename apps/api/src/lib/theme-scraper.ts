export interface BrandThemeConfig {
  primary: string
  primaryLight: string
  primaryDark: string
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  border: string
  fontSans: string
  fontDisplay: string
  fontUrl: string | null
}

const DEFAULT_THEME: BrandThemeConfig = {
  primary: '#450F2A',
  primaryLight: '#F5E6ED',
  primaryDark: '#2D0A1C',
  background: '#FAF6F0',
  surface: '#ffffff',
  text: '#1A0A12',
  textSecondary: '#4A2A38',
  accent: '#C17A47',
  border: '#E8DDD0',
  fontSans: 'Inter',
  fontDisplay: 'Playfair Display',
  fontUrl: null,
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : null
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(v => Math.min(255, Math.round(v + (255 - v) * amount))) as [number, number, number]
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(v => Math.max(0, Math.round(v * (1 - amount)))) as [number, number, number]
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  return 0.2126 * (rgb[0] / 255) + 0.7152 * (rgb[1] / 255) + 0.0722 * (rgb[2] / 255)
}

function extractColors(html: string): string[] {
  const found = new Set<string>()
  const re = /#([0-9a-fA-F]{6})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    found.add(`#${m[1]!.toLowerCase()}`)
  }
  return [...found]
}

function pickPrimary(colors: string[]): string | null {
  // Prefer mid-range luminance (not too light, not too dark) — likely a brand color
  const candidates = colors.filter(c => {
    const l = luminance(c)
    return l > 0.03 && l < 0.6
  })
  if (candidates.length === 0) return null
  // Find the most "saturated" looking color by comparing R/G/B spread
  let best = candidates[0]!
  let bestSpread = 0
  for (const c of candidates) {
    const rgb = hexToRgb(c)
    if (!rgb) continue
    const spread = Math.max(...rgb) - Math.min(...rgb)
    if (spread > bestSpread) { bestSpread = spread; best = c }
  }
  return best
}

function extractFonts(html: string): { fontSans: string; fontDisplay: string; fontUrl: string | null } {
  let fontUrl: string | null = null
  let fonts: string[] = []

  // Google Fonts link tags
  const gfRe = /href=["']([^"']*fonts\.googleapis\.com\/css[^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = gfRe.exec(html)) !== null) {
    const url = m[1]!.replace(/&amp;/g, '&')
    fontUrl = url
    // Extract family names from ?family=Inter:wght@400;700|Playfair+Display
    const familyRe = /family=([^&"']+)/gi
    let fm: RegExpExecArray | null
    while ((fm = familyRe.exec(url)) !== null) {
      const families = fm[1]!.split('|').map(f => f.split(':')[0]!.replace(/\+/g, ' ').trim())
      fonts.push(...families)
    }
    break
  }

  // CSS @font-face
  if (fonts.length === 0) {
    const ffRe = /font-family:\s*["']?([A-Za-z][A-Za-z0-9 _-]+?)["']?\s*[;,{]/g
    while ((m = ffRe.exec(html)) !== null) {
      const name = m[1]!.trim()
      if (name && !fonts.includes(name)) fonts.push(name)
    }
  }

  const serifKeywords = ['serif', 'playfair', 'georgia', 'garamond', 'merriweather', 'lora', 'libre baskerville', 'cormorant', 'dm serif', 'eb garamond']
  const serif = fonts.find(f => serifKeywords.some(k => f.toLowerCase().includes(k)))
  const sans = fonts.find(f => !serifKeywords.some(k => f.toLowerCase().includes(k)))

  return {
    fontSans: sans ?? 'Inter',
    fontDisplay: serif ?? sans ?? 'Playfair Display',
    fontUrl,
  }
}

export async function scrapeTheme(url: string): Promise<BrandThemeConfig> {
  let html = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HaliteBot/1.0; +https://haliteintelligence.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) html = await res.text()
  } catch {
    return { ...DEFAULT_THEME }
  }

  // meta theme-color
  let primary: string | null = null
  const themeColorMatch = /meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{6})["']/i.exec(html)
    ?? /meta[^>]+content=["'](#[0-9a-fA-F]{6})["'][^>]+name=["']theme-color["']/i.exec(html)
  if (themeColorMatch) primary = themeColorMatch[1]!.toLowerCase()

  // CSS custom properties — look for --primary, --brand, --color-primary etc.
  if (!primary) {
    const cssVarRe = /--(?:primary|brand|accent|color-primary|main-color|brand-color)\s*:\s*(#[0-9a-fA-F]{6})/i
    const cssMatch = cssVarRe.exec(html)
    if (cssMatch) primary = cssMatch[1]!.toLowerCase()
  }

  // Fallback: pick from all hex colors in the document
  if (!primary) {
    const colors = extractColors(html)
    primary = pickPrimary(colors)
  }

  if (!primary) return { ...DEFAULT_THEME }

  const lum = luminance(primary)
  const background = lum < 0.1 ? lighten(primary, 0.92) : '#FAF6F0'
  const surface = '#ffffff'
  const text = lum > 0.5 ? darken(primary, 0.7) : darken(primary, 0.1)
  const textSecondary = lighten(darken(primary, 0.2), 0.3)
  const primaryLight = lighten(primary, 0.85)
  const primaryDark = darken(primary, 0.35)
  const accent = lighten(primary, 0.25)
  const border = lighten(primary, 0.7)

  const { fontSans, fontDisplay, fontUrl } = extractFonts(html)

  return {
    primary,
    primaryLight,
    primaryDark,
    background,
    surface,
    text,
    textSecondary,
    accent,
    border,
    fontSans,
    fontDisplay,
    fontUrl,
  }
}
