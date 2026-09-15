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
 * The value may be a SKU or an internal product id — the server tries both,
 * because a merchant's markup carries whichever it already had.
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
  /** Fade a product below this score. Off unless a merchant asks for it. */
  fadeBelow?: number
}

export class Decorator {
  private cache = new Map<string, ConnectMatch>()
  private pending = new Set<string>()
  private observer: MutationObserver | null = null
  private scheduled = 0
  private reported = false

  constructor(private api: HaliteApi, private options: DecorateOptions = {}) {}

  /** Scores anything tagged and not yet done, then keeps watching. */
  async run(): Promise<void> {
    if (!this.api.connectedConsumerId) return
    await this.sweep()
    this.watch()
  }

  /**
   * Says what happened, once per page.
   *
   * Silence is the worst outcome for a merchant integrating this: no badges
   * and no reason why. The usual causes are a page that tagged nothing and
   * SKUs the catalog does not carry, and neither is visible without saying
   * so out loud.
   */
  private report(found: number, scored: number): void {
    if (this.reported) return
    this.reported = true
    if (found === 0) {
      console.info('[halite] nothing to score — no elements carry data-halite-product')
      return
    }
    if (scored === 0) {
      console.warn(
        `[halite] ${found} tagged product(s) on this page, none matched the catalog. ` +
        'Check that data-halite-product carries the SKU or product id Halite holds.',
      )
      return
    }
    console.info(`[halite] scored ${scored} of ${found} products on this page`)
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
    const all = document.querySelectorAll<HTMLElement>(`[${ATTR}]`)
    const elements = Array.from(all).filter(el => !el.dataset[MARK])
    if (elements.length === 0) {
      this.report(all.length, this.cache.size)
      return
    }

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
        const matches = await this.api.connectMatch({ refs: batch })
        // Key on what the page asked with — a merchant may tag by SKU or by
        // internal id, and the reply says which one matched.
        for (const m of matches) {
          const key = m.ref ?? m.sku ?? m.product_id
          if (key) this.cache.set(key, m)
        }
        for (const s of batch) this.pending.delete(s)
      }
    }

    let applied = 0
    for (const el of elements) {
      const sku = el.getAttribute(ATTR)
      if (!sku) continue
      const match = this.cache.get(sku)
      if (!match) continue
      el.dataset[MARK] = '1'
      this.apply(el, match)
      applied++
    }
    this.report(all.length, applied)
  }

  private apply(el: HTMLElement, match: ConnectMatch): void {
    // Fading is a judgement about fit, so it follows the score rather than
    // whether a product happened to make some top-N list.
    const fade = this.options.fadeBelow
    if (fade != null && match.match_score < fade) el.style.opacity = '0.55'

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
