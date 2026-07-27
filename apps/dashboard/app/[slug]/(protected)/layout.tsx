import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SideNav } from '@/components/side-nav'
import { MobileNavToggle } from '@/components/ui/MobileNavToggle'
import { getBrandProfile, getAnalytics, type BrandThemeConfig } from '@/lib/api'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

// brandThemeConfig ultimately comes from admin-triggered scraping of a
// brand's own website (see apps/api's scrape-theme endpoint) — it's not
// hand-authored, so it isn't trustworthy CSS. Every value is validated
// against a strict allowlist before it's allowed anywhere near the raw
// <style dangerouslySetInnerHTML> block below; anything that doesn't match
// falls back to a safe default rather than being dropped in as-is, since a
// value like `</style><script>...` would otherwise break out of the style
// tag entirely and execute as real script.
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
const FONT_NAME_RE = /^[a-z0-9 '-]{1,60}$/i

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR_RE.test(value) ? value : fallback
}

function safeFontName(value: string, fallback: string): string {
  const trimmed = value.trim()
  return FONT_NAME_RE.test(trimmed) ? trimmed : fallback
}

function safeFontUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    // Reject anything that could break out of the url('...') context.
    if (/['"<>;\s]/.test(value)) return null
    return url.toString()
  } catch {
    return null
  }
}

function buildWhiteLabelCSS(raw: BrandThemeConfig): string {
  const t = {
    primary: safeColor(raw.primary, '#450F2A'),
    primaryLight: safeColor(raw.primaryLight, '#F5E6ED'),
    primaryDark: safeColor(raw.primaryDark, '#2D0A1C'),
    background: safeColor(raw.background, '#FAF6F0'),
    surface: safeColor(raw.surface, '#ffffff'),
    text: safeColor(raw.text, '#1A0A12'),
    textSecondary: safeColor(raw.textSecondary, '#4A2A38'),
    accent: safeColor(raw.accent, '#C17A47'),
    border: safeColor(raw.border, '#E8DDD0'),
    fontSans: safeFontName(raw.fontSans, 'Inter'),
    fontDisplay: safeFontName(raw.fontDisplay, 'Playfair Display'),
    fontUrl: safeFontUrl(raw.fontUrl),
  }
  const fontImport = t.fontUrl ? `@import url('${t.fontUrl}');` : ''
  return `${fontImport}
:root {
  --clay: ${t.primary};
  --clay-light: ${t.primaryLight};
  --clay-dim: ${t.primaryDark};
  --clay-dark: ${t.primaryDark};
  --porcelain: ${t.background};
  --porcelain-2: ${t.background};
  --surface: ${t.surface};
  --sand-1: ${t.background};
  --sand-2: ${t.border};
  --sand-3: ${t.border};
  --ink: ${t.text};
  --ink-2: ${t.textSecondary};
  --ink-3: ${t.textSecondary};
  --ink-4: ${t.border};
  --gold: ${t.accent};
  --gold-light: ${t.primaryLight};
  --border: ${t.border};
  --border-sub: ${t.primaryLight};
  --font-sans: '${t.fontSans}', system-ui, sans-serif;
  --font-display: '${t.fontDisplay}', Georgia, serif;
}`
}

export default async function BrandLayout({ children, params }: Props) {
  const { slug } = await params
  const token = (await cookies()).get('halite_token')?.value
  if (!token) redirect(`/${slug}/login`)

  const profile = await getBrandProfile()
  if (profile && profile.slug !== slug) redirect(`/${slug}/login`)
  const isDemo = profile?.isDemo ?? false
  const demoLinkExpiresAt = profile?.demoLinkExpiresAt ?? null
  const whiteLabelEnabled = profile?.whiteLabelEnabled ?? false
  const brandThemeConfig = profile?.brandThemeConfig ?? null
  const brandName = profile?.name ?? null
  const brandLogoUrl = profile?.logoUrl ?? null

  const daysLeft = demoLinkExpiresAt
    ? Math.ceil((new Date(demoLinkExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <>
      {whiteLabelEnabled && brandThemeConfig && (
        <style dangerouslySetInnerHTML={{ __html: buildWhiteLabelCSS(brandThemeConfig) }} />
      )}
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--porcelain)' }}>
      <SideNav
        slug={slug}
        isDemo={isDemo}
        demoLinkExpiresAt={demoLinkExpiresAt}
        whiteLabelEnabled={whiteLabelEnabled}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNavToggle />
        {isDemo && (
          <div
            className="flex-shrink-0 flex items-center justify-center gap-2 py-2 px-4 text-[12px] font-medium"
            style={{ background: 'var(--clay)', color: 'white' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
            AI-Generated Demo Data — this environment is for demonstration purposes only
            {daysLeft !== null && daysLeft > 0 && (
              <span className="ml-2 opacity-70">· Access expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            )}
            {daysLeft !== null && daysLeft <= 0 && (
              <span className="ml-2 opacity-70">· Access expired — contact your Halite representative</span>
            )}
          </div>
        )}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>

    </div>

    </>
  )
}
