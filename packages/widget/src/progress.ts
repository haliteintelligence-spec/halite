import type { HaliteApi } from './api'
import type { CheckIn, Routine } from './types'

const POSITIVE_SYMPTOMS = new Set([
  'IMPROVEMENT', 'GLOW', 'HYDRATED', 'TEXTURE_SMOOTH',
])

const SYMPTOM_LABELS: Record<string, string> = {
  BREAKOUT: 'Breakouts', DRYNESS: 'Dryness', REDNESS: 'Redness',
  IRRITATION: 'Irritation', PURGING: 'Purging', OILINESS: 'Oiliness',
  DULLNESS: 'Dullness', HYPERPIGMENTATION_FADING: 'Pigmentation',
  IMPROVEMENT: 'Improving', GLOW: 'Glowing', HYDRATED: 'Hydrated',
  TEXTURE_SMOOTH: 'Smooth texture',
}

const RATING_EMOJIS = ['', '😔', '😐', '🙂', '😊', '🤩']

export class ProgressController {
  constructor(
    private api: HaliteApi,
    private render: (node: HTMLElement) => void,
    private setProgress: (pct: number) => void,
    private setBack: (fn: (() => void) | null) => void,
  ) {}

  async start() {
    this.renderLoading()
    try {
      const [checkIns, routine] = await Promise.all([
        this.api.getCheckIns(),
        this.api.getRoutine(),
      ])
      this.renderDashboard(checkIns, routine)
    } catch {
      this.renderError()
    }
  }

  private renderDashboard(checkIns: CheckIn[], routine: Routine | null) {
    this.setProgress(1)
    this.setBack(null)

    if (checkIns.length === 0) {
      this.renderEmpty()
      return
    }

    // Reverse so oldest first for chart
    const sorted = [...checkIns].reverse()
    const ratings = sorted.map(c => c.skinRating)
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    const latest = checkIns[0].skinRating
    const streak = calcStreak(checkIns)
    const compliance = calcCompliance(checkIns)
    const topSymptoms = calcTopSymptoms(checkIns)
    const productStats = calcProductStats(checkIns)

    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;gap:20px;'

    // ── Header stat row ───────────────────────────────────────────────
    const statRow = document.createElement('div')
    statRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;'
    statRow.appendChild(statTile('Current', `${RATING_EMOJIS[latest]} ${latest}/5`, latest >= 4 ? '#4caf82' : latest >= 3 ? '#C17A47' : '#e57373'))
    statRow.appendChild(statTile('Average', avg.toFixed(1) + '/5', '#888'))
    statRow.appendChild(statTile('Streak', `🔥 ${streak}`, '#C17A47'))
    el.appendChild(statRow)

    // ── Sparkline ─────────────────────────────────────────────────────
    if (ratings.length > 1) {
      const chartCard = card('Skin Rating Over Time')
      chartCard.appendChild(buildSparkline(ratings))
      const axisRow = document.createElement('div')
      axisRow.style.cssText = 'display:flex;justify-content:space-between;margin-top:6px;'
      const dateFirst = fmtDate(sorted[0].date)
      const dateLast = fmtDate(sorted[sorted.length - 1].date)
      axisRow.innerHTML = `<span style="font-size:10px;color:#bbb">${dateFirst}</span><span style="font-size:10px;color:#bbb">${dateLast}</span>`
      chartCard.appendChild(axisRow)
      el.appendChild(chartCard)
    }

    // ── Compliance ────────────────────────────────────────────────────
    const compCard = card('Routine Compliance')
    const compPct = Math.round(compliance * 100)
    const compBar = document.createElement('div')
    compBar.style.cssText = 'height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;margin:10px 0 6px;'
    const compFill = document.createElement('div')
    compFill.style.cssText = `height:100%;width:${compPct}%;background:${compPct >= 80 ? '#4caf82' : compPct >= 50 ? '#C17A47' : '#e57373'};border-radius:4px;transition:width 0.6s ease;`
    compBar.appendChild(compFill)
    compCard.appendChild(compBar)
    compCard.appendChild(label(`${compPct}% of check-ins marked routine followed · ${checkIns.length} check-in${checkIns.length !== 1 ? 's' : ''} total`))
    el.appendChild(compCard)

    // ── Symptoms ──────────────────────────────────────────────────────
    if (topSymptoms.length > 0) {
      const symCard = card('Top Symptoms')
      const positives = topSymptoms.filter(s => POSITIVE_SYMPTOMS.has(s.key))
      const concerns = topSymptoms.filter(s => !POSITIVE_SYMPTOMS.has(s.key))
      const max = topSymptoms[0].count

      if (positives.length > 0) {
        symCard.appendChild(sectionLabel('Positive'))
        positives.forEach(s => symCard.appendChild(symptomBar(s.key, s.count, max, true)))
      }
      if (concerns.length > 0) {
        const dl = sectionLabel('Concerns')
        if (positives.length > 0) dl.style.marginTop = '14px'
        symCard.appendChild(dl)
        concerns.forEach(s => symCard.appendChild(symptomBar(s.key, s.count, max, false)))
      }
      el.appendChild(symCard)
    }

    // ── Product reactions ─────────────────────────────────────────────
    if (productStats.length > 0) {
      const prodCard = card('Product Feedback')
      productStats.forEach(p => {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;'
        const name = document.createElement('span')
        name.style.cssText = 'font-size:12px;color:#333;flex:1;font-weight:500;'
        name.textContent = p.name
        row.appendChild(name)
        const badges = document.createElement('div')
        badges.style.cssText = 'display:flex;gap:5px;'
        if (p.positive) badges.appendChild(reactionBadge(`👍 ${p.positive}`, '#4caf82'))
        if (p.neutral) badges.appendChild(reactionBadge(`👌 ${p.neutral}`, '#888'))
        if (p.negative) badges.appendChild(reactionBadge(`👎 ${p.negative}`, '#e57373'))
        row.appendChild(badges)
        prodCard.appendChild(row)
      })
      el.appendChild(prodCard)
    }

    // ── Current routine summary ───────────────────────────────────────
    if (routine && routine.steps.length > 0) {
      const routineCard = card(`Your ${routine.focusArea.toLowerCase()} routine`)
      const stepCount = routine.steps.length
      routineCard.appendChild(label(`${stepCount} step${stepCount !== 1 ? 's' : ''} · Keep going!`))
      const stepRow = document.createElement('div')
      stepRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;'
      const seen = new Set<string>()
      routine.steps.forEach(s => {
        if (seen.has(s.product.id)) return
        seen.add(s.product.id)
        const chip = document.createElement('span')
        chip.style.cssText = 'font-size:11px;padding:4px 10px;border-radius:100px;background:#f5f5f5;color:#555;font-weight:500;'
        chip.textContent = s.product.name
        stepRow.appendChild(chip)
      })
      routineCard.appendChild(stepRow)
      el.appendChild(routineCard)
    }

    this.render(el)
  }

  renderLoading() {
    this.setProgress(0); this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-loading'
    el.innerHTML = `
      <div class="hlw-spinner"></div>
      <p class="hlw-loading-text">Loading your progress…</p>
      <div class="hlw-dots"><span></span><span></span><span></span></div>
    `
    this.render(el)
  }

  private renderEmpty() {
    this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-success'
    el.innerHTML = `
      <div class="hlw-success-icon">📊</div>
      <p class="hlw-success-title">No check-ins yet</p>
      <p class="hlw-success-sub">Complete your first check-in to start tracking your skin progress over time.</p>
    `
    this.render(el)
  }

  private renderError() {
    this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-error'
    el.innerHTML = `
      <div class="hlw-error-icon">✦</div>
      <p class="hlw-error-text">Could not load progress</p>
      <p class="hlw-error-sub">Complete the skin quiz first, then check back here.</p>
    `
    this.render(el)
  }
}

// ── SVG Sparkline ──────────────────────────────────────────────────────────

function buildSparkline(values: number[]): SVGSVGElement {
  const W = 440, H = 72, PAD = 8
  const min = 1, max = 5
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.style.cssText = 'width:100%;height:72px;overflow:visible;'

  const toX = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const toY = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)

  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  const firstX = toX(0), lastX = toX(values.length - 1)

  // Gradient fill
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  defs.innerHTML = `
    <linearGradient id="hlw-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C17A47" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#C17A47" stop-opacity="0"/>
    </linearGradient>
  `
  svg.appendChild(defs)

  // Area fill
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  area.setAttribute('points', `${firstX},${H} ${pts} ${lastX},${H}`)
  area.setAttribute('fill', 'url(#hlw-grad)')
  svg.appendChild(area)

  // Line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  line.setAttribute('points', pts)
  line.setAttribute('fill', 'none')
  line.setAttribute('stroke', '#C17A47')
  line.setAttribute('stroke-width', '2')
  line.setAttribute('stroke-linejoin', 'round')
  line.setAttribute('stroke-linecap', 'round')
  svg.appendChild(line)

  // Dots
  values.forEach((v, i) => {
    const cx = toX(i), cy = toY(v)
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(cx))
    dot.setAttribute('cy', String(cy))
    dot.setAttribute('r', i === values.length - 1 ? '4' : '3')
    dot.setAttribute('fill', i === values.length - 1 ? '#C17A47' : '#fff')
    dot.setAttribute('stroke', '#C17A47')
    dot.setAttribute('stroke-width', '2')
    svg.appendChild(dot)

    // Rating label on last point
    if (i === values.length - 1) {
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      txt.setAttribute('x', String(cx + 8))
      txt.setAttribute('y', String(cy + 4))
      txt.setAttribute('font-size', '11')
      txt.setAttribute('fill', '#C17A47')
      txt.setAttribute('font-weight', '600')
      txt.textContent = String(v)
      svg.appendChild(txt)
    }
  })

  return svg
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcStreak(checkIns: CheckIn[]): string {
  if (!checkIns.length) return '0 days'
  const sorted = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1].date).getTime() - new Date(sorted[i].date).getTime()) / 86400000
    if (diff <= 8) streak++
    else break
  }
  return `${streak} week${streak !== 1 ? 's' : ''}`
}

function calcCompliance(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0
  return checkIns.filter(c => c.compliant).length / checkIns.length
}

function calcTopSymptoms(checkIns: CheckIn[]): Array<{ key: string; count: number }> {
  const counts: Record<string, number> = {}
  checkIns.forEach(c => c.symptoms.forEach(s => { counts[s] = (counts[s] ?? 0) + 1 }))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => ({ key, count }))
}

function calcProductStats(checkIns: CheckIn[]) {
  const stats: Record<string, { name: string; positive: number; neutral: number; negative: number }> = {}
  checkIns.forEach(c => {
    c.products.forEach(p => {
      if (!stats[p.productId]) stats[p.productId] = { name: p.product.name, positive: 0, neutral: 0, negative: 0 }
      if (p.reaction === 'POSITIVE') stats[p.productId].positive++
      else if (p.reaction === 'NEUTRAL') stats[p.productId].neutral++
      else if (p.reaction === 'NEGATIVE') stats[p.productId].negative++
    })
  })
  return Object.values(stats).sort((a, b) => (b.positive + b.neutral + b.negative) - (a.positive + a.neutral + a.negative))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── DOM helpers ────────────────────────────────────────────────────────────

function card(title: string): HTMLElement {
  const c = document.createElement('div')
  c.style.cssText = 'background:#fafafa;border:1.5px solid #f0f0f0;border-radius:16px;padding:16px;'
  const h = document.createElement('p')
  h.style.cssText = 'font-size:12px;font-weight:700;color:#1a1a1a;margin:0 0 12px;'
  h.textContent = title
  c.appendChild(h)
  return c
}

function statTile(label: string, value: string, color: string): HTMLElement {
  const t = document.createElement('div')
  t.style.cssText = 'background:#fafafa;border:1.5px solid #f0f0f0;border-radius:14px;padding:14px 10px;text-align:center;'
  t.innerHTML = `
    <p style="font-size:18px;font-weight:700;color:${color};margin:0 0 4px;">${value}</p>
    <p style="font-size:10px;color:#aaa;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
  `
  return t
}

function sectionLabel(text: string): HTMLElement {
  const l = document.createElement('p')
  l.className = 'hlw-section-label'
  l.textContent = text
  return l
}

function label(text: string): HTMLElement {
  const l = document.createElement('p')
  l.style.cssText = 'font-size:12px;color:#888;margin:0;'
  l.textContent = text
  return l
}

function symptomBar(key: string, count: number, max: number, positive: boolean): HTMLElement {
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;'
  const lbl = document.createElement('span')
  lbl.style.cssText = 'font-size:12px;color:#555;width:130px;flex-shrink:0;'
  lbl.textContent = SYMPTOM_LABELS[key] ?? key
  const track = document.createElement('div')
  track.style.cssText = 'flex:1;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;'
  const fill = document.createElement('div')
  const pct = Math.round((count / max) * 100)
  fill.style.cssText = `height:100%;width:${pct}%;background:${positive ? '#4caf82' : '#C17A47'};border-radius:3px;`
  track.appendChild(fill)
  const cnt = document.createElement('span')
  cnt.style.cssText = 'font-size:11px;color:#aaa;width:20px;text-align:right;flex-shrink:0;'
  cnt.textContent = String(count)
  row.appendChild(lbl); row.appendChild(track); row.appendChild(cnt)
  return row
}

function reactionBadge(text: string, color: string): HTMLElement {
  const b = document.createElement('span')
  b.style.cssText = `font-size:11px;padding:3px 8px;border-radius:100px;background:${color}18;color:${color};font-weight:600;`
  b.textContent = text
  return b
}
