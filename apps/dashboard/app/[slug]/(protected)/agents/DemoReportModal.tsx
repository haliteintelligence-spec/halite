'use client'

import { X, Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Minus } from 'lucide-react'

interface Metric {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface Finding {
  label: string
  detail: string
  severity?: 'high' | 'medium' | 'positive' | 'neutral'
}

interface ReportSection {
  title: string
  findings: Finding[]
}

interface ReportData {
  title: string
  subtitle: string
  generatedAt: string
  metrics: Metric[]
  sections: ReportSection[]
  recommendations: Array<{ text: string; impact: string }>
}

const REPORT_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

function getReport(workflowType: string, workflowName: string): ReportData {
  const base = { generatedAt: REPORT_DATE }

  if (workflowType === 'CHURN_PREDICTION') {
    return {
      ...base,
      title: 'Churn & Retention Risk Report',
      subtitle: workflowName,
      metrics: [
        { label: 'Active Consumers', value: '847', delta: '+12 this week', trend: 'up' },
        { label: 'High-Risk Consumers', value: '23', delta: '8.2% of base', trend: 'down' },
        { label: 'Medium-Risk Consumers', value: '67', delta: '23.9% of base', trend: 'neutral' },
        { label: 'Avg. Compliance Rate', value: '61%', delta: '-4% vs last week', trend: 'down' },
      ],
      sections: [
        {
          title: 'High-Risk Segment Breakdown',
          findings: [
            { label: 'Declining skin ratings (3+ consecutive)', detail: '14 consumers — avg rating dropped from 6.8 → 4.1 over 3 check-ins. Cluster skews toward oily-acne prone skin type using Retinol Serum within first 2 weeks.', severity: 'high' },
            { label: 'No check-in in 14+ days', detail: '9 consumers — last engagement was routine setup. Zero post-purchase check-ins logged. All acquired via social campaign (IG story, Nov cohort).', severity: 'high' },
          ],
        },
        {
          title: 'Medium-Risk Segment Breakdown',
          findings: [
            { label: 'Compliance drop below 50%', detail: '31 consumers — AM routine completion fallen below threshold. Evening step (2nd cleanse) most frequently skipped. Concentration: melanin-rich skin tones MST 4–6.', severity: 'medium' },
            { label: 'Increasing negative symptoms', detail: '18 consumers — BREAKOUT or IRRITATION flag on 2+ consecutive check-ins without a routine adjustment triggered. Average days since last intervention: 22.', severity: 'medium' },
            { label: 'Single-product usage only', detail: '18 consumers — routine assigned but only 1 of 3+ products reported in use. Likely product fatigue or purchase friction at step 2.', severity: 'medium' },
          ],
        },
        {
          title: 'Healthy Cohort Signals',
          findings: [
            { label: 'Strong retention: 30-day cohort', detail: '312 consumers (36.8%) completed 4+ check-ins in the last 30 days with avg rating ≥6.5. Ingredient overlap: Niacinamide + Ceramide combination in morning routine.', severity: 'positive' },
            { label: 'Highest NPS proxy segment', detail: 'Consumers using Hydrating Serum + SPF combo showing highest re-purchase signal (78% opened last email, 44% clicked product rec).', severity: 'positive' },
          ],
        },
      ],
      recommendations: [
        { text: 'Trigger re-engagement message for 9 no-check-in consumers with simplified 1-question skin check prompting a routine refresh.', impact: 'Est. 40–55% re-activation rate based on similar cohorts' },
        { text: 'Simplify routine for 31 low-compliance consumers — reduce to 2-step AM/PM and reintroduce complexity after 2 weeks of consistent use.', impact: 'Projected +22% compliance lift in 14 days' },
        { text: 'Flag 14 declining-rating consumers to CX for outreach — offer product swap to a gentler alternative and a 15% re-commitment discount.', impact: 'Estimated $1,240 LTV retention per cohort' },
      ],
    }
  }

  if (workflowType === 'PRODUCT_INTELLIGENCE') {
    return {
      ...base,
      title: 'Product Intelligence Report',
      subtitle: workflowName,
      metrics: [
        { label: 'Products Analyzed', value: '34', delta: 'full catalog', trend: 'neutral' },
        { label: 'Avg Outcome Score', value: '7.2 / 10', delta: '+0.4 vs last run', trend: 'up' },
        { label: 'Consumers with Irritation Flag', value: '11.4%', delta: '-2.1% improvement', trend: 'up' },
        { label: 'Unmet Concern Segments', value: '3', delta: 'identified', trend: 'neutral' },
      ],
      sections: [
        {
          title: 'Top Performing Ingredients',
          findings: [
            { label: 'Niacinamide (5% concentration)', detail: 'Present in 8 products. +81% positive outcomes across dark spot and uneven tone cohorts. Strongest correlation in consumers with MST 4–6. No irritation signals across 234 check-ins.', severity: 'positive' },
            { label: 'Centella Asiatica (Cica) Extract', detail: 'Present in 4 products. +73% positive outcomes for REDNESS and sensitive skin concern cohort. 96-day longitudinal data shows compounding improvement at week 6+.', severity: 'positive' },
            { label: 'Peptide Complex (Matrixyl 3000)', detail: 'Present in 3 products. +68% for firmness/aging concern segment. Performance strongest in 35–50 age bracket and MST 1–3, moderate in MST 4–6 (suggests possible formulation refinement needed).', severity: 'positive' },
          ],
        },
        {
          title: 'Formulation Concerns',
          findings: [
            { label: 'Synthetic Fragrance (4 products)', detail: '22.4% irritation correlation in sensitive skin consumers. These 4 SKUs account for 41% of all IRRITATION flags in the last 60 days. Fragrance-free reformulation would impact 89 consumers directly.', severity: 'high' },
            { label: 'High-concentration Glycolic Acid (>8%)', detail: '2 products with 10% AHA show overexfoliation flags in 15.3% of users who apply AM + PM. No buffer or SPF pairing recommendation in current routine logic.', severity: 'medium' },
          ],
        },
        {
          title: 'White Space Opportunities',
          findings: [
            { label: 'Barrier repair for melanin-rich skin', detail: '0 current catalog SKUs specifically targeting barrier disruption in MST 4–6. 143 consumers show chronic DRYNESS + IRRITATION combination — currently receiving generic moisturiser recommendation.', severity: 'neutral' },
            { label: 'Hyperpigmentation + Rosacea crossover', detail: '37 consumers flagged for both concerns simultaneously. Current catalog has no dual-action formulation. Avg routine satisfaction score for this segment: 4.9/10 (lowest in catalog).', severity: 'neutral' },
            { label: 'Post-active recovery step', detail: 'No SKU exists for the day-after AHA/BHA recovery window. 18 consumers self-reported "skipping" the following AM routine — a formulation opportunity to reduce dropout.', severity: 'neutral' },
          ],
        },
      ],
      recommendations: [
        { text: 'Prioritise fragrance-free reformulation for top 4 fragrance-containing SKUs — particularly the Brightening Toner and Vitamin C Serum.', impact: 'Could reduce irritation complaints by ~40% and improve overall catalog satisfaction score' },
        { text: 'Develop a barrier serum targeting MST 4–6 with ceramide + niacinamide + sea buckthorn — no direct competitor in current DTC skincare market.', impact: 'Addresses 143 underserved consumers; estimated $38K annual revenue opportunity' },
        { text: 'Introduce SPF pairing nudge in routine logic when Glycolic Acid products are assigned — reduces overexfoliation risk and increases morning routine completion.', impact: 'Proj. 15% reduction in IRRITATION flags for AHA users' },
      ],
    }
  }

  if (workflowType === 'CONVERSION') {
    return {
      ...base,
      title: 'Conversion Intelligence Report',
      subtitle: workflowName,
      metrics: [
        { label: 'Quiz Completion Rate', value: '68.4%', delta: '+5.2% vs last month', trend: 'up' },
        { label: 'Routine Adoption (post-quiz)', value: '52.1%', delta: '-3.8% vs last month', trend: 'down' },
        { label: 'Avg. Time to First Check-in', value: '4.2 days', delta: '-0.9 days improvement', trend: 'up' },
        { label: 'Cart Abandonment on Step 2', value: '31.7%', delta: 'Primary drop-off point', trend: 'down' },
      ],
      sections: [
        {
          title: 'Funnel Performance',
          findings: [
            { label: 'Quiz → Routine assignment: strong', detail: '68.4% completion. Primary exit point is the skin tone / MST question (22% drop-off at that step). Consumers who complete the full quiz have 3.1× higher 30-day retention.', severity: 'positive' },
            { label: 'Routine → Purchase: conversion gap', detail: '52.1% of consumers who receive a routine recommendation go on to purchase step 1 product. Step 2 product converts at only 34.6% — primary friction point identified.', severity: 'medium' },
            { label: 'Post-purchase → First check-in: improving', detail: 'Time to first check-in dropped to 4.2 days from 5.1 days last period, following the reminder email sequence update. Email open rate: 61%, click rate: 29%.', severity: 'positive' },
          ],
        },
        {
          title: 'Drop-off Analysis',
          findings: [
            { label: 'MST question abandonment', detail: '22% of quiz starters exit at the skin tone step. Mobile-first users abandon at 31% — potential UX friction with swatch grid on smaller screens. Consider progressive disclosure or image-based selection.', severity: 'medium' },
            { label: 'Step 2 product price sensitivity', detail: 'A/B data suggests step 2 product price ($58) is above threshold for new consumers. Segment showing highest drop-off: consumers under 30, acquired via TikTok, first-time skincare routine purchaser.', severity: 'high' },
            { label: 'No check-in after 7 days', detail: '18.3% of purchasers who have not checked in by day 7 never complete a check-in. Identified as "lost" consumers. Current flow sends only 1 reminder; cohorts with 3 reminders show 44% higher activation.', severity: 'medium' },
          ],
        },
      ],
      recommendations: [
        { text: 'Introduce a step 2 product bundle discount (15%) triggered when step 1 add-to-cart occurs — specifically for new consumers with TikTok attribution source.', impact: 'Projected +12–18% step 2 conversion lift' },
        { text: 'Add a simplified skin tone selection UI for mobile — image-based reference cards rather than abstract MST scale, with a "not sure" fallback to reduce abandonment.', impact: 'Est. 8% improvement in quiz completion on mobile' },
        { text: 'Extend post-purchase check-in reminder sequence to 3 touchpoints (day 1, day 4, day 8). Automate routine "progress preview" at day 4 to increase activation.', impact: 'Could recover ~44% of currently-lost post-purchase consumers' },
      ],
    }
  }

  if (workflowType === 'EXECUTIVE_INTELLIGENCE') {
    return {
      ...base,
      title: 'Executive Intelligence Summary',
      subtitle: workflowName,
      metrics: [
        { label: 'Brand Health Score', value: '74 / 100', delta: '+6 pts this month', trend: 'up' },
        { label: 'Active Consumers (30-day)', value: '612', delta: '+89 new this month', trend: 'up' },
        { label: 'Avg. Routine Satisfaction', value: '7.4 / 10', delta: '+0.3 improvement', trend: 'up' },
        { label: 'Retention Rate (90-day)', value: '58.2%', delta: 'Industry avg: 52%', trend: 'up' },
      ],
      sections: [
        {
          title: 'Brand Momentum',
          findings: [
            { label: 'Consumer growth on track', detail: 'Month-over-month growth at 17%. New consumer acquisition pacing ahead of Q4 target by 12%. Primary acquisition channel: organic referral now accounts for 28% of new sign-ups (up from 19%).', severity: 'positive' },
            { label: 'Routine satisfaction improving', detail: 'Avg satisfaction score of 7.4 driven primarily by gains in the hyperpigmentation concern segment (+1.1 pts). Dry skin segment remains a drag at 6.1/10 — requires product formulation attention.', severity: 'positive' },
            { label: 'Churn rate below industry benchmark', detail: '90-day retention at 58.2% vs industry average of 52%. High-compliance consumers (4+ check-ins/month) retain at 81.4% — this cohort is the core business anchor.', severity: 'positive' },
          ],
        },
        {
          title: 'Risks & Headwinds',
          findings: [
            { label: 'Dry skin segment underperforming', detail: '143 dry skin consumers averaging 6.1/10 satisfaction. Primary complaint: tightness post-cleanse. No barrier-specific product in catalog. Risk: segment represents 16.9% of base with elevated churn likelihood.', severity: 'high' },
            { label: 'Medium-risk churn cohort growing', detail: 'Medium-risk consumer count grew 14% month-over-month to 67 consumers. Main driver: compliance drop, not product dissatisfaction. Suggests routine complexity issue rather than formulation failure.', severity: 'medium' },
            { label: 'Step 2 conversion gap', detail: 'Only 34.6% of consumers purchase the full recommended routine at onboarding. Revenue per consumer significantly lower than model assumption. Closing this gap is highest-leverage revenue action.', severity: 'medium' },
          ],
        },
        {
          title: 'Strategic Opportunities',
          findings: [
            { label: 'Referral channel acceleration', detail: 'Organic referral growing to 28% of acquisition without a formal referral programme. Implementing a structured referral incentive (e.g. £10 credit) could double this channel within 60 days.', severity: 'positive' },
            { label: 'High-compliance consumer LTV unlocked', detail: 'Consumers completing 4+ check-ins/month have 2.7× higher LTV and 81% 90-day retention. A loyalty or recognition mechanic targeting this segment could accelerate their upsell conversion.', severity: 'positive' },
          ],
        },
      ],
      recommendations: [
        { text: 'Launch a formal referral programme with £10 credit for referrer and £10 welcome discount for referred. Target the high-compliance cohort as seed ambassadors.', impact: 'Projected doubling of referral acquisition channel within 60 days' },
        { text: 'Commission a barrier repair product for dry skin segment as priority R&D item. Interim: adjust routine logic to add protective occlusive step for consumers flagged with DRYNESS.', impact: 'Addresses 143-consumer drag; estimated LTV improvement of £34/consumer' },
        { text: 'Introduce step 2 bundle incentive at checkout to close the routine completion gap. Current 34.6% → target 50% step 2 adoption within 90 days.', impact: 'Estimated +£18K monthly recurring revenue at target conversion rate' },
      ],
    }
  }

  // Default: ROUTINE_OUTCOME
  return {
    ...base,
    title: 'Routine Outcome Analysis',
    subtitle: workflowName,
    metrics: [
      { label: 'Consumers Analyzed', value: '847', delta: 'full active base', trend: 'neutral' },
      { label: 'Positive Outcome Rate', value: '73%', delta: '+8% vs prior period', trend: 'up' },
      { label: 'Avg. Rating Improvement', value: '+2.3', delta: 'week-over-week', trend: 'up' },
      { label: 'Routines Flagged for Review', value: '8', delta: 'require adjustment', trend: 'down' },
    ],
    sections: [
      {
        title: 'Top Performing Routine Configurations',
        findings: [
          { label: 'Niacinamide + Hyaluronic Acid (AM)', detail: 'Avg rating delta: +2.8 over 4 weeks. 93% of consumers on this pairing showed consistent improvement. Strongest in dark spot and uneven tone cohorts. No adverse reactions logged across 312 check-ins.', severity: 'positive' },
          { label: 'Bakuchiol + Ceramide Barrier Serum (PM)', detail: 'Avg rating delta: +2.4. Retinol-alternative combination driving strong results in sensitive skin segment (MST 3–6). 88% compliance rate — above average for evening 2-step protocols.', severity: 'positive' },
          { label: 'Controlled AHA/BHA exfoliation (2×/week)', detail: 'Avg rating delta: +1.9. Best outcomes in oily/congested cohort. Consumers using on a Monday/Thursday cadence show 14% better outcomes than daily users.', severity: 'positive' },
        ],
      },
      {
        title: 'Under-Performing Routines',
        findings: [
          { label: 'Retinol intro for hyperpigmentation segment', detail: 'Avg rating: 4.3/10. 12.4% week-over-week decline in skin comfort scores. PURGING flag appearing in 34% of this cohort in weeks 1–2. Routine likely introduces retinol too aggressively without an adjustment ramp.', severity: 'high' },
          { label: 'Salicylic acid in dry skin routine', detail: 'IRRITATION reports up 34% in dry skin consumers assigned salicylic acid-containing cleanser. Product not contraindicated for this skin type but lacks compensatory hydration step. 18 consumers at churn risk.', severity: 'high' },
          { label: 'Multi-active layering (Vit C + AHA same AM)', detail: 'pH conflict causing sub-optimal absorption and elevated sensitivity in 28 consumers. Avg satisfaction 5.6/10. Routine logic needs a sequencing fix — these actives should not be same-step.', severity: 'medium' },
        ],
      },
      {
        title: 'Ingredient Correlation Insights',
        findings: [
          { label: 'Ceramide + Peptide synergy confirmed', detail: 'Consumers using both ceramide moisturiser and peptide serum show +31% better outcome scores than peptide-only users. Suggests barrier function enhancement amplifies peptide signal. Worth testing as a bundled routine.', severity: 'positive' },
          { label: 'SPF compliance unlocks active performance', detail: 'Consumers who log SPF use in AM check-ins show 1.6× better outcomes from Vitamin C and exfoliant steps. Currently 42% of consumers don\'t log SPF. Routine reminder gap to address.', severity: 'neutral' },
        ],
      },
    ],
    recommendations: [
      { text: 'Modify hyperpigmentation + retinol routine to introduce a low-dose (0.025%) retinol for weeks 1–4 before stepping up. Add a buffer moisturiser as mandatory step 2.', impact: 'Projected +18% compliance and reduction in purging flags within 3 weeks' },
      { text: 'Remove salicylic acid cleanser from dry skin routine assignments — replace with lactic acid alternative. Trigger auto-swap for 18 at-risk consumers immediately.', impact: 'Eliminates primary irritation driver for 18 consumers at churn risk' },
      { text: 'Fix routine logic to prevent Vitamin C and AHA being assigned to the same AM step. Introduce pH-aware sequencing with at least 15-minute gap recommendation.', impact: 'Resolves active conflict for 28 consumers; estimated +1.4pt avg satisfaction lift' },
    ],
  }
}

function generateDownloadHTML(report: ReportData, workflowName: string): string {
  const metricCards = report.metrics.map(m => `
    <div style="background:#f9f7f5;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px;flex:1;min-width:160px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;margin-bottom:6px;">${m.label}</div>
      <div style="font-size:24px;font-weight:700;color:#1c1917;font-family:Georgia,serif;">${m.value}</div>
      ${m.delta ? `<div style="font-size:11px;color:${m.trend === 'up' ? '#15803d' : m.trend === 'down' ? '#b91c1c' : '#78716c'};margin-top:4px;">${m.delta}</div>` : ''}
    </div>`).join('')

  const severityColor = (s?: string) => s === 'high' ? '#fef2f2' : s === 'medium' ? '#fffbeb' : s === 'positive' ? '#f0fdf4' : '#f9f7f5'
  const severityBorder = (s?: string) => s === 'high' ? '#fecaca' : s === 'medium' ? '#fde68a' : s === 'positive' ? '#bbf7d0' : '#e7e5e4'
  const severityTag = (s?: string) => s === 'high' ? '<span style="background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.04em;">HIGH PRIORITY</span>' : s === 'medium' ? '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.04em;">REVIEW</span>' : s === 'positive' ? '<span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.04em;">POSITIVE</span>' : ''

  const sectionsHTML = report.sections.map(s => `
    <div style="margin-bottom:32px;">
      <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;border-bottom:1px solid #e7e5e4;padding-bottom:8px;margin-bottom:16px;">${s.title}</h3>
      ${s.findings.map(f => `
        <div style="background:${severityColor(f.severity)};border:1px solid ${severityBorder(f.severity)};border-radius:10px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;color:#1c1917;">${f.label}</span>
            ${severityTag(f.severity)}
          </div>
          <p style="font-size:12px;color:#44403c;line-height:1.6;margin:0;">${f.detail}</p>
        </div>`).join('')}
    </div>`).join('')

  const recsHTML = report.recommendations.map((r, i) => `
    <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #f0ede9;">
      <span style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#c17b5c;color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${i + 1}</span>
      <div>
        <p style="font-size:13px;color:#1c1917;margin:0 0 4px 0;">${r.text}</p>
        <p style="font-size:11px;color:#78716c;margin:0;font-style:italic;">${r.impact}</p>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${report.title} — Halite Intelligence</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fafaf9; color: #1c1917; padding: 40px 24px; max-width: 880px; margin: 0 auto; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e7e5e4;padding-bottom:24px;margin-bottom:32px;">
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#c17b5c;margin-bottom:6px;">Halite Intelligence</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:#1c1917;margin-bottom:4px;">${report.title}</h1>
      <div style="font-size:13px;color:#78716c;">${workflowName}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#78716c;">Generated ${report.generatedAt}</div>
      <div style="font-size:11px;color:#a8a29e;margin-top:2px;">Halite Intelligence Platform</div>
    </div>
  </div>

  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:40px;">${metricCards}</div>

  ${sectionsHTML}

  <div style="background:#1c1917;border-radius:14px;padding:24px 28px;margin-top:32px;">
    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#c17b5c;margin-bottom:4px;">Recommended Actions</h3>
    <p style="font-size:11px;color:#a8a29e;margin-bottom:16px;">Prioritised by projected impact</p>
    ${recsHTML}
  </div>

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e5e4;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;color:#a8a29e;">Generated by Halite Intelligence · ${report.generatedAt}</span>
    <span style="font-size:10px;color:#a8a29e;">Confidential — for internal use only</span>
  </div>
</body>
</html>`
}

export function DemoReportModal({
  workflowType,
  workflowName,
  onClose,
}: {
  workflowType: string
  workflowName: string
  onClose: () => void
}) {
  const report = getReport(workflowType, workflowName)

  function handleDownload() {
    const html = generateDownloadHTML(report, workflowName)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const trendColor = (t?: string) =>
    t === 'up' ? '#15803d' : t === 'down' ? '#b91c1c' : 'var(--ink-3)'

  const severityStyles = (severity?: string) => {
    if (severity === 'high') return { bg: '#fef2f2', border: '#fecaca' }
    if (severity === 'medium') return { bg: '#fffbeb', border: '#fde68a' }
    if (severity === 'positive') return { bg: '#f0fdf4', border: '#bbf7d0' }
    return { bg: 'var(--sand-1)', border: 'var(--border)' }
  }

  const severityTag = (severity?: string) => {
    if (severity === 'high') return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>
        HIGH PRIORITY
      </span>
    )
    if (severity === 'medium') return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
        REVIEW
      </span>
    )
    if (severity === 'positive') return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>
        POSITIVE
      </span>
    )
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <div
          className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-6 py-5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--sand-1)' }}
          >
            <div className="min-w-0 mr-4">
              <span
                className="text-[9px] font-bold tracking-widest uppercase mb-1.5 block"
                style={{ color: 'var(--clay)' }}
              >
                Halite Intelligence · Agent Report
              </span>
              <h2
                className="text-xl font-semibold font-display leading-tight"
                style={{ color: 'var(--ink)' }}
              >
                {report.title}
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {report.subtitle} · Generated {report.generatedAt}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--clay)', color: 'white' }}
              >
                <Download size={11} />
                Download
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                style={{ color: 'var(--ink-3)' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {report.metrics.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3"
                  style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>
                    {m.label}
                  </p>
                  <p className="text-[20px] font-bold font-display leading-tight" style={{ color: 'var(--ink)' }}>
                    {m.value}
                  </p>
                  {m.delta && (
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: trendColor(m.trend) }}>
                      {m.delta}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Sections */}
            {report.sections.map((section, si) => (
              <div key={si}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}
                >
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.findings.map((f, fi) => {
                    const styles = severityStyles(f.severity)
                    return (
                      <div
                        key={fi}
                        className="rounded-xl p-3.5"
                        style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
                      >
                        <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                            {f.label}
                          </span>
                          {severityTag(f.severity)}
                        </div>
                        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                          {f.detail}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Recommendations */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-3"
                style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}
              >
                Recommended Actions
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--ink)', border: '1px solid var(--ink)' }}
              >
                {report.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < report.recommendations.length - 1 ? '1px solid rgba(255,255,255,0.08)' : undefined }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: 'var(--clay)', color: 'white' }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[12px] leading-relaxed text-white">{r.text}</p>
                      <p className="text-[11px] mt-1 italic" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-3)' }}>
              Sample report generated by Halite Intelligence · Confidential — for internal use only
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
