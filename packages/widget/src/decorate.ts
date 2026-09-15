import type { HaliteApi } from './api'
import type { ConnectMatch } from './types'

/**
 * Puts a match score and its reasons on every product the shopper sees.
 *
 * A ranked list is one moment; the rest of the visit is them browsing. If
 * the score only exists on the page that rendered the list, the profile they
 * just shared stops being useful the moment they click a category. So any
 * element tagged with a product follows them:
 *
 *   <div data-halite-product="SKU-123">…</div>
 *
 * Scores are fetched in one call per batch of new products, cached for the
 * page, and re-applied to anything a filter or infinite scroll adds later.
 */

const ATTR = 'data-halite-product'
const MARK = 'hlwMatched'

export interface DecorateOptions {
  /** Where to put the badge. Defaults to the tagged element itself. */
  badgeSelector?: string
  /** Where reasons go. Omit to skip reasons and show the score alone. */
  reasonsSelector?: string
  /** Hide the badge below this score — a weak match is noise on a listing. */
  minScore?: number
}

export class Decorator {
  private cache = new Map<string, ConnectMatch>()
  private pending = new Set<string>()
  private observer: MutationObserver | null = null
  private scheduled = 0

  constructor(private api: HaliteApi, private options: DecorateOptions = {}) {}

  /** Scores anything tagged and not yet done, then keeps watching. */
  async run(): Promise<void> {
    if (!this.api.connectedConsumerId) return
    await this.sweep()
    this.watch()
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  private watch(): void {
    if (this.observer || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(() => {
      // Filters and infinite scroll can fire this in bursts; one sweep after
      // things settle is enough.
      window.clearTimeout(this.scheduled)
      this.scheduled = window.setTimeout(() => { void this.sweep() }, 250)
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  private async sweep(): Promise<void> {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(`[${ATTR}]`))
      .filter(el => !el.dataset[MARK])
    if (elements.length === 0) return

    const needed: string[] = []
    for (const el of elements) {
      const sku = el.getAttribute(ATTR)
      if (!sku) continue
      if (!this.cache.has(sku) && !this.pending.has(sku)) {
        this.pending.add(sku)
        needed.push(sku)
      }
    }

    if (needed.length) {
      // One request per sweep, not per product.
      for (let i = 0; i < needed.length; i += 100) {
        const batch = needed.slice(i, i + 100)
        const matches = await this.api.connectMatch({ skus: batch })
        for (const m of matches) if (m.sku) this.cache.set(m.sku, m)
        for (const s of batch) this.pending.delete(s)
      }
    }

    for (const el of elements) {
      const sku = el.getAttribute(ATTR)
      if (!sku) continue
      const match = this.cache.get(sku)
      if (!match) continue
      el.dataset[MARK] = '1'
      this.apply(el, match)
    }
  }

  private apply(el: HTMLElement, match: ConnectMatch): void {
    const min = this.options.minScore ?? 0
    if (match.match_score < min) return

    const host = this.options.badgeSelector
      ? el.querySelector<HTMLElement>(this.options.badgeSelector) ?? el
      : el
    if (!host.querySelector('.hlw-match')) {
      const badge = document.createElement('span')
      badge.className = 'hlw-match'
      if (match.warnings.length) badge.classList.add('hlw-match-warn')
      badge.textContent = `${Math.round(match.match_score * 100)}% match`
      // A tooltip means the reason is there even when a brand only wants the score.
      badge.title = [...match.reasons, ...match.warnings].join(' · ')
      host.appendChild(badge)
    }

    if (!this.options.reasonsSelector) return
    const slot = el.querySelector<HTMLElement>(this.options.reasonsSelector)
    if (!slot || slot.querySelector('.hlw-why')) return

    const list = document.createElement('ul')
    list.className = 'hlw-why'
    for (const r of match.reasons.slice(0, 2)) {
      const li = document.createElement('li')
      li.textContent = r
      list.appendChild(li)
    }
    for (const w of match.warnings.slice(0, 1)) {
      const li = document.createElement('li')
      li.className = 'hlw-why-warn'
      li.textContent = w
      list.appendChild(li)
    }
    slot.appendChild(list)
  }
}
