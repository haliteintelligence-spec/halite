'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, SlidersHorizontal, Check, X, BarChart2, Table2, Gauge, Brain, List, MessageSquare, Activity, Package2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetType = 'metric' | 'chart' | 'table' | 'list' | 'ai' | 'interactive'
type WidgetCategory =
  | 'Overview'
  | 'Consumer Intelligence'
  | 'Product Performance'
  | 'Ingredient Lab'
  | 'Market Signals'
  | 'Benchmarking'
  | 'Outcomes'
  | 'AI Lab'
  | 'Predictive Insights'
  | 'Supply Chain'
  | 'Identity'
  | 'Crystal AI'

interface LibraryWidget {
  id: string
  name: string
  description: string
  category: WidgetCategory
  type: WidgetType
  tags: string[]
  pageHref: string
  pageName: string
}

// ── Widget catalogue ──────────────────────────────────────────────────────────

const WIDGETS: LibraryWidget[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  {
    id: 'ov-active-consumers',
    name: 'Active Consumers',
    description: 'Total number of registered consumers on the brand.',
    category: 'Overview', type: 'metric', tags: ['kpi', 'consumers'],
    pageHref: '', pageName: 'Overview',
  },
  {
    id: 'ov-routine-adoption',
    name: 'Routine Adoption Rate',
    description: 'Percentage of product recommendations adopted into consumer routines.',
    category: 'Overview', type: 'metric', tags: ['kpi', 'products'],
    pageHref: '', pageName: 'Overview',
  },
  {
    id: 'ov-avg-satisfaction',
    name: 'Avg Satisfaction',
    description: 'Average skin satisfaction rating across all consumer check-ins (out of 5).',
    category: 'Overview', type: 'metric', tags: ['kpi', 'outcomes'],
    pageHref: '', pageName: 'Overview',
  },
  {
    id: 'ov-routine-compliance',
    name: 'Routine Compliance',
    description: 'Percentage of consumers actively following their assigned routine.',
    category: 'Overview', type: 'metric', tags: ['kpi', 'outcomes'],
    pageHref: '', pageName: 'Overview',
  },
  {
    id: 'ov-ai-insight-badge',
    name: 'AI Insight Badge',
    description: 'AI-generated one-liner surfacing the most important signal from current data.',
    category: 'Overview', type: 'ai', tags: ['ai', 'insight'],
    pageHref: '', pageName: 'Overview',
  },
  {
    id: 'ov-outcomes-snapshot',
    name: 'Outcomes Snapshot',
    description: '2×2 mini-grid of Avg Skin Rating, Compliance %, Total Check-ins, and Routines Refined.',
    category: 'Overview', type: 'metric', tags: ['kpi', 'outcomes'],
    pageHref: '', pageName: 'Overview',
  },

  // ── Consumer Intelligence ─────────────────────────────────────────────────
  {
    id: 'con-skin-tone-grid',
    name: 'Skin Tone Distribution',
    description: 'Monk skin tone scale grid (Types I–VI) showing consumer distribution across tones.',
    category: 'Consumer Intelligence', type: 'chart', tags: ['skin tone', 'demographics'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-skin-type-bars',
    name: 'Skin Type Bar Chart',
    description: 'Horizontal bars showing split across Dry, Oily, Combination, Normal, and Sensitive.',
    category: 'Consumer Intelligence', type: 'chart', tags: ['skin type', 'demographics'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-skin-tone-insight',
    name: 'Skin Tone Insight Badge',
    description: 'AI narrative on dominant skin tone and its correlation with top consumer concern.',
    category: 'Consumer Intelligence', type: 'ai', tags: ['ai', 'skin tone'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-checkin-sparkline',
    name: 'Check-in Activity Sparkline',
    description: '12-week weekly check-in trend sparkline with colour-coded bars (high/mid/low).',
    category: 'Consumer Intelligence', type: 'chart', tags: ['check-ins', 'trend'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-weekly-checkins',
    name: 'Weekly Check-ins Metric',
    description: "This week's check-in count with a week-over-week percentage change badge.",
    category: 'Consumer Intelligence', type: 'metric', tags: ['check-ins', 'kpi'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-wow-change',
    name: 'Week-over-Week Change',
    description: 'Percentage change in check-ins vs last week, colour-coded green/red.',
    category: 'Consumer Intelligence', type: 'metric', tags: ['check-ins', 'trend'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-top-concerns',
    name: 'Top Consumer Concerns',
    description: 'Horizontal bar chart of the top 6 concerns by % of consumers reporting them.',
    category: 'Consumer Intelligence', type: 'chart', tags: ['concerns', 'demographics'],
    pageHref: '/consumers', pageName: 'Consumers',
  },
  {
    id: 'con-age-distribution',
    name: 'Age Distribution',
    description: 'Vertical bar chart showing consumer distribution across age cohorts.',
    category: 'Consumer Intelligence', type: 'chart', tags: ['age', 'demographics'],
    pageHref: '/consumers', pageName: 'Consumers',
  },

  // ── Product Performance ───────────────────────────────────────────────────
  {
    id: 'prod-usage-rate',
    name: 'Usage Rate Metric',
    description: 'Percentage of product recommendations that consumers confirmed adopting.',
    category: 'Product Performance', type: 'metric', tags: ['kpi', 'adoption'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-total-recommended',
    name: 'Total Recommended',
    description: 'Total number of product recommendations issued by the engine.',
    category: 'Product Performance', type: 'metric', tags: ['kpi', 'recommendations'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-confirmed-used',
    name: 'Confirmed Used',
    description: 'Count of products consumers confirmed actively using, highlighted in green.',
    category: 'Product Performance', type: 'metric', tags: ['kpi', 'adoption'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-adoption-insight',
    name: 'Routine Adoption Insight',
    description: 'AI-generated advice on improving routine adoption based on current rate.',
    category: 'Product Performance', type: 'ai', tags: ['ai', 'adoption'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-radar',
    name: 'Engine Quality Radar',
    description: '5-axis radar chart scoring Accuracy, Diversity, Timeliness, Engagement, and Repeat Rate.',
    category: 'Product Performance', type: 'chart', tags: ['radar', 'engine quality'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-category-perf',
    name: 'Category Performance Bars',
    description: 'Horizontal bar chart of acceptance % per product category, colour-coded green/gold/grey.',
    category: 'Product Performance', type: 'chart', tags: ['category', 'acceptance'],
    pageHref: '/products', pageName: 'Products',
  },
  {
    id: 'prod-top-products',
    name: 'Top Recommended Products',
    description: 'Ranked list of top products with usage count, positive reactions, and acceptance rate badge.',
    category: 'Product Performance', type: 'list', tags: ['products', 'ranking'],
    pageHref: '/products', pageName: 'Products',
  },

  // ── Ingredient Lab ────────────────────────────────────────────────────────
  {
    id: 'ing-index',
    name: 'Ingredient Intelligence Index',
    description: 'Ranked list of top ingredients with associated concerns, progress bars, and routine counts.',
    category: 'Ingredient Lab', type: 'list', tags: ['ingredients', 'ranking'],
    pageHref: '/ingredients', pageName: 'Ingredients',
  },
  {
    id: 'ing-concern-gaps',
    name: 'Concern Coverage Gaps Alert',
    description: 'High-prevalence consumer concerns with low or zero product coverage, colour-coded by risk.',
    category: 'Ingredient Lab', type: 'list', tags: ['concerns', 'gaps'],
    pageHref: '/ingredients', pageName: 'Ingredients',
  },
  {
    id: 'ing-coverage-map',
    name: 'Concern Coverage Map',
    description: 'Progress bars for every concern showing coverage %, product count, and risk level.',
    category: 'Ingredient Lab', type: 'chart', tags: ['concerns', 'coverage'],
    pageHref: '/ingredients', pageName: 'Ingredients',
  },

  // ── Market Signals ────────────────────────────────────────────────────────
  {
    id: 'mkt-trend-feed',
    name: 'Market Trend Signal Feed',
    description: 'Live-style feed of beauty trend signals with category badge, alignment badge, and sparkline.',
    category: 'Market Signals', type: 'list', tags: ['trends', 'market'],
    pageHref: '/market', pageName: 'Market',
  },
  {
    id: 'mkt-sentiment-bars',
    name: 'Consumer Sentiment Drivers',
    description: 'Horizontal bars showing % of consumers driven by clean formulas, dermatologist rec, fragrance-free, etc.',
    category: 'Market Signals', type: 'chart', tags: ['sentiment', 'market'],
    pageHref: '/market', pageName: 'Market',
  },
  {
    id: 'mkt-sentiment-insight',
    name: 'Sentiment Insight Badge',
    description: 'AI narrative connecting top sentiment driver to brand catalogue alignment.',
    category: 'Market Signals', type: 'ai', tags: ['ai', 'sentiment'],
    pageHref: '/market', pageName: 'Market',
  },
  {
    id: 'mkt-emerging-ingredients',
    name: 'Emerging Ingredient Signals',
    description: 'List of trending ingredients with in-catalogue badge and emerging/rising signal tag.',
    category: 'Market Signals', type: 'list', tags: ['ingredients', 'trends'],
    pageHref: '/market', pageName: 'Market',
  },

  // ── Benchmarking ──────────────────────────────────────────────────────────
  {
    id: 'bmk-radar',
    name: 'Performance vs Industry Radar',
    description: 'Dual-overlay radar chart comparing your brand (clay) against industry average (grey) across 6 metrics.',
    category: 'Benchmarking', type: 'chart', tags: ['benchmark', 'radar'],
    pageHref: '/benchmarking', pageName: 'Benchmarking',
  },
  {
    id: 'bmk-breakdown-table',
    name: 'Benchmark Metrics Table',
    description: '7-row table comparing your metrics against industry with directional up/down indicators.',
    category: 'Benchmarking', type: 'table', tags: ['benchmark', 'comparison'],
    pageHref: '/benchmarking', pageName: 'Benchmarking',
  },
  {
    id: 'bmk-checkin-bars',
    name: 'Check-in Activity vs Baseline',
    description: 'Paired bar chart across 6 bi-weekly windows comparing your check-in volume to industry baseline.',
    category: 'Benchmarking', type: 'chart', tags: ['benchmark', 'check-ins'],
    pageHref: '/benchmarking', pageName: 'Benchmarking',
  },

  // ── Outcomes ──────────────────────────────────────────────────────────────
  {
    id: 'out-total-checkins',
    name: 'Total Check-ins',
    description: 'All-time total check-in count across the brand.',
    category: 'Outcomes', type: 'metric', tags: ['kpi', 'check-ins'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-avg-skin-rating',
    name: 'Avg Skin Rating',
    description: 'Average skin satisfaction rating from consumer check-ins (1–5 scale).',
    category: 'Outcomes', type: 'metric', tags: ['kpi', 'outcomes'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-compliance-rate',
    name: 'Compliance Rate',
    description: 'Percentage of consumers actively following their routine at latest check-in.',
    category: 'Outcomes', type: 'metric', tags: ['kpi', 'compliance'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-routines-refined',
    name: 'Routines Refined',
    description: 'Count of routines automatically refined by the AI engine based on check-in feedback.',
    category: 'Outcomes', type: 'metric', tags: ['kpi', 'ai'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-skin-rating-trend',
    name: 'Skin Rating Trend',
    description: '12-week line chart showing average skin satisfaction rating over time (1–5 scale).',
    category: 'Outcomes', type: 'chart', tags: ['trend', 'ratings'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-compliance-trend',
    name: 'Compliance Trend',
    description: '12-week bar chart of weekly compliance percentages, colour-coded by compliance level.',
    category: 'Outcomes', type: 'chart', tags: ['trend', 'compliance'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-symptom-split',
    name: 'Positive / Negative Symptom Split',
    description: 'Single dual-colour bar showing the ratio of positive signals vs negative concerns from check-ins.',
    category: 'Outcomes', type: 'chart', tags: ['symptoms', 'sentiment'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },
  {
    id: 'out-symptom-list',
    name: 'Symptom Breakdown',
    description: 'Each reported symptom with a horizontal occurrence bar and count, positive vs negative segmented.',
    category: 'Outcomes', type: 'list', tags: ['symptoms', 'check-ins'],
    pageHref: '/outcomes', pageName: 'Outcomes',
  },

  // ── AI Lab ────────────────────────────────────────────────────────────────
  {
    id: 'lab-analysis-feed',
    name: 'AI Analyses Feed',
    description: 'Cards for each cross-module AI analysis (catalogue alignment, engine performance, consumer profile).',
    category: 'AI Lab', type: 'ai', tags: ['ai', 'analysis'],
    pageHref: '/ai-lab', pageName: 'AI Lab',
  },
  {
    id: 'lab-action-queue',
    name: 'AI Action Queue',
    description: 'Prioritised list of recommended next steps with urgency badge (Critical / High / Medium) and module tag.',
    category: 'AI Lab', type: 'list', tags: ['ai', 'actions'],
    pageHref: '/ai-lab', pageName: 'AI Lab',
  },
  {
    id: 'lab-intelligence-score',
    name: 'Platform Intelligence Score',
    description: '0–100 composite score (satisfaction + compliance + product acceptance) displayed in a circular metric.',
    category: 'AI Lab', type: 'metric', tags: ['kpi', 'ai', 'score'],
    pageHref: '/ai-lab', pageName: 'AI Lab',
  },

  // ── Predictive Insights ───────────────────────────────────────────────────
  {
    id: 'pred-demand-forecast',
    name: '30-Day Demand Forecast',
    description: 'Projected total check-ins over the next 30 days with trend delta vs last period.',
    category: 'Predictive Insights', type: 'metric', tags: ['forecast', 'check-ins'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-at-risk-consumers',
    name: 'At-Risk Consumer Count',
    description: 'Estimated number of consumers at high churn risk based on compliance patterns.',
    category: 'Predictive Insights', type: 'metric', tags: ['forecast', 'churn'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-wow-trend',
    name: 'Week-over-Week Trend',
    description: 'Percentage change in check-ins this week vs last week with directional indicator.',
    category: 'Predictive Insights', type: 'metric', tags: ['forecast', 'trend'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-confidence',
    name: 'Forecast Confidence',
    description: 'Confidence level (High / Medium / Low) derived from available historical data volume.',
    category: 'Predictive Insights', type: 'metric', tags: ['forecast', 'confidence'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-demand-sparkline',
    name: 'Check-in Demand Forecast Chart',
    description: 'SVG sparkline of historical weekly check-ins (solid) + dashed 4-week projection line.',
    category: 'Predictive Insights', type: 'chart', tags: ['forecast', 'sparkline'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-weekly-projection',
    name: '4-Week Projection Grid',
    description: 'Week-by-week projected check-in counts for the next 4 weeks (Wk+1 through Wk+4).',
    category: 'Predictive Insights', type: 'metric', tags: ['forecast', 'check-ins'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-churn-risk',
    name: 'Churn Risk Index',
    description: '3-band horizontal bar chart (High / Medium / Low) with estimated % of consumers in each risk tier.',
    category: 'Predictive Insights', type: 'chart', tags: ['forecast', 'churn'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-category-trajectory',
    name: 'Category Performance Trajectory',
    description: 'Category-level acceptance bars with ↑↓ momentum indicator and deviation from platform average.',
    category: 'Predictive Insights', type: 'chart', tags: ['forecast', 'category'],
    pageHref: '/predictive', pageName: 'Predictive',
  },
  {
    id: 'pred-concern-momentum',
    name: 'Concern Momentum',
    description: 'Consumer concern bars with coverage status and gap alerts — shows which concerns are gaining demand.',
    category: 'Predictive Insights', type: 'chart', tags: ['forecast', 'concerns'],
    pageHref: '/predictive', pageName: 'Predictive',
  },

  // ── Supply Chain ──────────────────────────────────────────────────────────
  {
    id: 'sc-active-ingredients',
    name: 'Active Ingredients Count',
    description: 'Number of unique ingredients currently present in consumer routines.',
    category: 'Supply Chain', type: 'metric', tags: ['kpi', 'ingredients'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-high-demand-products',
    name: 'High-Demand Products',
    description: 'Count of products with adoption rates above the platform average — highest reorder pressure.',
    category: 'Supply Chain', type: 'metric', tags: ['kpi', 'demand'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-coverage-gaps-count',
    name: 'Coverage Gaps Count',
    description: 'Number of consumer concerns with demand but zero product coverage — new product line signals.',
    category: 'Supply Chain', type: 'metric', tags: ['kpi', 'gaps'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-projected-units',
    name: 'Projected Units (30d)',
    description: 'Total projected unit demand across all active products for the next 30 days.',
    category: 'Supply Chain', type: 'metric', tags: ['kpi', 'demand'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-ingredient-forecast',
    name: 'Ingredient Demand Forecast Table',
    description: 'Top ingredients with 30-day and 90-day projected consumption volumes and High/Medium/Low risk badges.',
    category: 'Supply Chain', type: 'table', tags: ['ingredients', 'forecast'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-product-stock',
    name: 'Product Stock Planning Table',
    description: 'Top products with projected units needed at 30, 60, and 90 days based on current adoption rates.',
    category: 'Supply Chain', type: 'table', tags: ['products', 'forecast'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-gap-pipeline',
    name: 'Coverage Gap Pipeline',
    description: 'Concerns with consumer demand but no product coverage, ranked by priority — new product line opportunities.',
    category: 'Supply Chain', type: 'list', tags: ['gaps', 'pipeline'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },
  {
    id: 'sc-category-demand',
    name: 'Category Demand Forecast',
    description: 'Category-level demand with growing/stable/declining momentum badges and projected 30-day units.',
    category: 'Supply Chain', type: 'chart', tags: ['category', 'forecast'],
    pageHref: '/predictive/supply-chain', pageName: 'Supply Chain',
  },

  // ── Identity ──────────────────────────────────────────────────────────────
  {
    id: 'id-total-consumers',
    name: 'Total Consumers (Identity)',
    description: 'All-time total consumer count from the identity intelligence view.',
    category: 'Identity', type: 'metric', tags: ['kpi', 'identity'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-identified-pct',
    name: 'Identified Consumers',
    description: 'Percentage of consumers with verified Halite Identity records (clay background highlight).',
    category: 'Identity', type: 'metric', tags: ['kpi', 'identity'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-cross-brand',
    name: 'Cross-Brand Consumers',
    description: 'Count and rate of consumers seen across multiple brands in the Halite network.',
    category: 'Identity', type: 'metric', tags: ['kpi', 'identity'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-retained',
    name: 'Retained Consumers',
    description: 'Retention metric: percentage and count of consumers with 3 or more check-ins.',
    category: 'Identity', type: 'metric', tags: ['kpi', 'retention'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-identification-trend',
    name: 'Identification Trend Chart',
    description: 'Stacked area chart showing identified vs anonymous consumer volumes across 8 weeks.',
    category: 'Identity', type: 'chart', tags: ['identity', 'trend'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-cross-brand-display',
    name: 'Cross-Brand Count Display',
    description: 'Large-format prominent display of cross-brand consumer count with contextual explanation.',
    category: 'Identity', type: 'metric', tags: ['identity', 'network'],
    pageHref: '/identity', pageName: 'Identity',
  },
  {
    id: 'id-anonymous-display',
    name: 'Anonymous Consumer Display',
    description: 'Large-format display of anonymous consumer count with explanation of identification opportunity.',
    category: 'Identity', type: 'metric', tags: ['identity', 'anonymous'],
    pageHref: '/identity', pageName: 'Identity',
  },

  // ── Crystal AI ────────────────────────────────────────────────────────────
  {
    id: 'cry-conversation-list',
    name: 'Conversation History',
    description: 'Sidebar list of past AI conversations with title, timestamp, message count, and delete action.',
    category: 'Crystal AI', type: 'list', tags: ['ai', 'chat'],
    pageHref: '/crystal', pageName: 'Crystal AI',
  },
  {
    id: 'cry-starter-questions',
    name: 'Starter Question Grid',
    description: '4 contextual suggested prompts shown in the empty state to guide first interaction.',
    category: 'Crystal AI', type: 'interactive', tags: ['ai', 'chat'],
    pageHref: '/crystal', pageName: 'Crystal AI',
  },
  {
    id: 'cry-chat-messages',
    name: 'Chat Message Thread',
    description: 'Full streaming chat interface with user bubbles, AI response bubbles, and loading cursor.',
    category: 'Crystal AI', type: 'interactive', tags: ['ai', 'chat'],
    pageHref: '/crystal', pageName: 'Crystal AI',
  },
  {
    id: 'cry-message-input',
    name: 'Chat Input Bar',
    description: 'Auto-growing multi-line input with send button, supporting streaming AI responses.',
    category: 'Crystal AI', type: 'interactive', tags: ['ai', 'chat'],
    pageHref: '/crystal', pageName: 'Crystal AI',
  },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: WidgetCategory[] = [
  'Overview', 'Consumer Intelligence', 'Product Performance', 'Ingredient Lab',
  'Market Signals', 'Benchmarking', 'Outcomes', 'AI Lab',
  'Predictive Insights', 'Supply Chain', 'Identity', 'Crystal AI',
]

const TYPE_CONFIG: Record<WidgetType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  metric:      { label: 'Metric',      icon: Gauge,        color: '#5b21b6', bg: '#ede9fe' },
  chart:       { label: 'Chart',       icon: BarChart2,    color: '#1e40af', bg: '#dbeafe' },
  table:       { label: 'Table',       icon: Table2,       color: '#92400e', bg: '#fef3c7' },
  list:        { label: 'List',        icon: List,         color: '#1a7a3c', bg: '#d4f4dd' },
  ai:          { label: 'AI Insight',  icon: Brain,        color: '#9a3800', bg: '#ffe4cc' },
  interactive: { label: 'Interactive', icon: MessageSquare, color: '#374151', bg: '#f3f4f6' },
}

const STORAGE_KEY = 'halite_library_selection'

// ── Component ─────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<WidgetCategory | ''>('')
  const [filterType, setFilterType] = useState<WidgetType | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load persisted selection
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSelected(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  function toggleWidget(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll(ids: string[]) {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  function deselectAll(ids: string[]) {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }

  function saveSelection() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filtered = useMemo(() => {
    return WIDGETS.filter(w => {
      if (filterCategory && w.category !== filterCategory) return false
      if (filterType && w.type !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        return w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.tags.some(t => t.includes(q)) ||
          w.pageName.toLowerCase().includes(q)
      }
      return true
    })
  }, [search, filterCategory, filterType])

  // Group by category for the grouped view
  const grouped = useMemo(() => {
    const map = new Map<WidgetCategory, LibraryWidget[]>()
    for (const w of filtered) {
      if (!map.has(w.category)) map.set(w.category, [])
      map.get(w.category)!.push(w)
    }
    return map
  }, [filtered])

  const activeFilters = (filterCategory ? 1 : 0) + (filterType ? 1 : 0)

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Platform
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Dashboard Library</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {WIDGETS.length} widgets across {ALL_CATEGORIES.length} modules — select the ones you want
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {selected.size} selected
          </span>
          <button
            onClick={saveSelection}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: saved ? 'var(--sage)' : 'var(--clay)' }}
          >
            {saved ? <Check size={13} /> : <Activity size={13} />}
            {saved ? 'Saved' : 'Save Selection'}
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Search widgets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={11} style={{ color: 'var(--ink-3)' }} />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium"
            style={{
              background: activeFilters > 0 ? 'var(--clay-light)' : 'var(--surface)',
              border: `1px solid ${activeFilters > 0 ? 'var(--clay)' : 'var(--border)'}`,
              color: activeFilters > 0 ? 'var(--clay)' : 'var(--ink)',
            }}
          >
            <SlidersHorizontal size={12} />
            Filters
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: 'var(--clay)' }}>
                {activeFilters}
              </span>
            )}
          </button>

          {showFilters && (
            <div
              className="absolute left-0 top-full mt-1.5 z-50 rounded-xl shadow-lg p-4 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '260px' }}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Module</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['', ...ALL_CATEGORIES] as (WidgetCategory | '')[]).map(c => (
                    <button
                      key={c || 'all'}
                      onClick={() => setFilterCategory(c)}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: filterCategory === c ? 'var(--clay)' : 'var(--sand-1)',
                        color: filterCategory === c ? 'white' : 'var(--ink)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {c || 'All'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['', 'metric', 'chart', 'table', 'list', 'ai', 'interactive'] as (WidgetType | '')[]).map(t => (
                    <button
                      key={t || 'all'}
                      onClick={() => setFilterType(t)}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: filterType === t ? 'var(--clay)' : 'var(--sand-1)',
                        color: filterType === t ? 'white' : 'var(--ink)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {t ? TYPE_CONFIG[t].label : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterType('') }}
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <X size={10} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-[12px] ml-1" style={{ color: 'var(--ink-3)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Widget groups */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No widgets match your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {ALL_CATEGORIES.filter(cat => grouped.has(cat)).map(category => {
            const widgets = grouped.get(category)!
            const allSelected = widgets.every(w => selected.has(w.id))
            const anySelected = widgets.some(w => selected.has(w.id))
            return (
              <div key={category}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                      {category}
                    </h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--sand-1)', color: 'var(--ink-3)' }}>
                      {widgets.length}
                    </span>
                  </div>
                  <button
                    onClick={() => allSelected ? deselectAll(widgets.map(w => w.id)) : selectAll(widgets.map(w => w.id))}
                    className="text-[11px] font-medium hover:underline"
                    style={{ color: anySelected ? 'var(--clay)' : 'var(--ink-3)' }}
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {/* Widget grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {widgets.map(widget => {
                    const isSelected = selected.has(widget.id)
                    const TypeIcon = TYPE_CONFIG[widget.type].icon
                    const typeStyle = TYPE_CONFIG[widget.type]
                    return (
                      <button
                        key={widget.id}
                        onClick={() => toggleWidget(widget.id)}
                        className="text-left rounded-xl p-4 transition-all hover:shadow-sm"
                        style={{
                          background: isSelected ? 'var(--clay-light)' : 'var(--surface)',
                          border: `1px solid ${isSelected ? 'var(--clay)' : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: isSelected ? 'var(--clay)' : 'var(--sand-1)' }}
                            >
                              <TypeIcon size={13} style={{ color: isSelected ? 'white' : 'var(--ink-3)' }} />
                            </div>
                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                              {widget.name}
                            </p>
                          </div>
                          <div
                            className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border"
                            style={{
                              background: isSelected ? 'var(--clay)' : 'transparent',
                              borderColor: isSelected ? 'var(--clay)' : 'var(--border)',
                            }}
                          >
                            {isSelected && <Check size={11} color="white" />}
                          </div>
                        </div>

                        <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--ink-3)' }}>
                          {widget.description}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: typeStyle.bg, color: typeStyle.color }}
                          >
                            <TypeIcon size={9} />
                            {typeStyle.label}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}
                          >
                            {widget.pageName}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky footer when items selected */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-2xl shadow-xl z-50"
          style={{ background: 'var(--ink)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'var(--clay)' }}>
              {selected.size}
            </div>
            <p className="text-[13px] text-white/80">widget{selected.size !== 1 ? 's' : ''} selected</p>
          </div>
          <button
            onClick={saveSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all"
            style={{ background: saved ? 'var(--sage)' : 'var(--clay)' }}
          >
            {saved ? <Check size={12} /> : <Package2 size={12} />}
            {saved ? 'Saved!' : 'Save Selection'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
