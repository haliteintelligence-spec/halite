import type { HaliteApi } from './api'
import type { ReorderItem } from './types'

const URGENCY_CONFIG = {
  overdue:  { color: '#e57373', bg: '#e5737318', label: 'Overdue',  badge: '⚠️' },
  soon:     { color: '#C17A47', bg: '#C17A4718', label: 'Due soon', badge: '🔔' },
  upcoming: { color: '#4caf82', bg: '#4caf8218', label: 'Upcoming', badge: '📦' },
  none:     { color: '#888',    bg: '#88888818', label: '',          badge: '📦' },
}

export class ReorderController {
  constructor(
    private api: HaliteApi,
    private render: (node: HTMLElement) => void,
    private setProgress: (pct: number) => void,
    private setBack: (fn: (() => void) | null) => void,
  ) {}

  async start() {
    this.renderLoading()
    try {
      const items = await this.api.getReorderItems()
      this.renderReorder(items)
    } catch {
      this.renderError()
    }
  }

  private renderReorder(items: ReorderItem[]) {
    this.setProgress(1)
    this.setBack(null)

    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;gap:12px;'

    // Header
    const header = document.createElement('div')
    header.innerHTML = `
      <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">Reorder Reminders</p>
      <p style="font-size:13px;color:#888;margin:0;">${items.length === 0 ? 'All products are well stocked.' : `${items.length} product${items.length !== 1 ? 's' : ''} running low`}</p>
    `
    el.appendChild(header)

    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'text-align:center;padding:40px 20px;'
      empty.innerHTML = `
        <div style="font-size:36px;margin-bottom:12px;">✓</div>
        <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 6px;">You're all stocked up</p>
        <p style="font-size:12px;color:#aaa;margin:0;">We'll remind you when it's time to reorder.</p>
      `
      el.appendChild(empty)
      this.render(el)
      return
    }

    items.forEach(item => {
      const cfg = URGENCY_CONFIG[item.urgency]
      const card = document.createElement('div')
      card.style.cssText = `padding:16px;border-radius:16px;border:1.5px solid ${cfg.color}40;background:${cfg.bg};`

      const top = document.createElement('div')
      top.style.cssText = 'display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;'

      // Category icon area
      const icon = document.createElement('div')
      icon.style.cssText = `width:40px;height:40px;border-radius:10px;background:${cfg.color}20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;`
      icon.textContent = categoryEmoji(item.product.category)
      top.appendChild(icon)

      const info = document.createElement('div')
      info.style.cssText = 'flex:1;'
      info.innerHTML = `
        <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 3px;">${item.product.name}</p>
        <p style="font-size:11px;color:#888;margin:0;">${item.routineArea.toLowerCase()} routine · ${item.product.currency} ${item.product.price.toFixed(2)}</p>
      `
      top.appendChild(info)

      const badge = document.createElement('div')
      badge.style.cssText = `font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;background:${cfg.color}20;color:${cfg.color};flex-shrink:0;`
      badge.textContent = item.daysUntil !== null && item.daysUntil <= 0
        ? 'Overdue'
        : item.daysUntil !== null
          ? `${item.daysUntil}d left`
          : cfg.label
      top.appendChild(badge)
      card.appendChild(top)

      // Due date bar
      if (item.daysUntil !== null) {
        const maxDays = 14
        const pct = Math.max(0, Math.min(100, ((maxDays - item.daysUntil) / maxDays) * 100))
        const barWrap = document.createElement('div')
        barWrap.style.cssText = 'height:4px;background:#e8e8e8;border-radius:2px;overflow:hidden;margin-bottom:12px;'
        const barFill = document.createElement('div')
        barFill.style.cssText = `height:100%;width:${pct}%;background:${cfg.color};border-radius:2px;`
        barWrap.appendChild(barFill)
        card.appendChild(barWrap)
      }

      // Shop button
      const btn = document.createElement('a')
      btn.style.cssText = `display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;background:${cfg.color};color:#fff;font-size:13px;font-weight:600;text-decoration:none;`
      btn.textContent = item.product.productUrl ? 'Shop Now →' : 'View Routine'
      if (item.product.productUrl) {
        btn.href = item.product.productUrl
        btn.target = '_blank'
        btn.rel = 'noopener'
      }
      card.appendChild(btn)
      el.appendChild(card)
    })

    this.render(el)
  }

  renderLoading() {
    this.setProgress(0); this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-loading'
    el.innerHTML = `
      <div class="hlw-spinner"></div>
      <p class="hlw-loading-text">Checking your supplies…</p>
      <div class="hlw-dots"><span></span><span></span><span></span></div>
    `
    this.render(el)
  }

  private renderError() {
    this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-error'
    el.innerHTML = `
      <div class="hlw-error-icon">✦</div>
      <p class="hlw-error-text">Could not load reorder reminders</p>
      <p class="hlw-error-sub">Please try again shortly.</p>
    `
    this.render(el)
  }
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    SERUM: '💧', MOISTURIZER: '🧴', CLEANSER: '🫧', SPF: '☀️',
    TONER: '💦', TREATMENT: '⚗️', EYE_CREAM: '👁️', MASK: '🧖',
    HAIR_MASK: '💆', SHAMPOO: '🚿', CONDITIONER: '💎',
    BODY_MOISTURIZER: '✨', OIL: '🌿',
  }
  return map[category] ?? '📦'
}
