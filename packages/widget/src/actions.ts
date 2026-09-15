import type { HaliteApi } from './api'
import type { ConnectEventName } from './types'

/**
 * Reports what the shopper does with a product, from any page.
 *
 * Saving on a brand's site is what puts something on their Hallie wishlist,
 * and buying is what puts it on their shelf — so those buttons have to work
 * on a collection page, a product page and a search result, not only on a
 * grid the widget rendered. A merchant marks them up once:
 *
 *   <button data-halite-save>Save</button>
 *   <button data-halite-purchase>Buy</button>
 *
 * inside (or pointed at) an element carrying data-halite-product. One
 * delegated listener on the document covers anything added later.
 */

const PRODUCT_ATTR = 'data-halite-product'

const ACTIONS: Array<{ attr: string; event: ConnectEventName }> = [
  { attr: 'data-halite-save', event: 'wishlisted' },
  { attr: 'data-halite-cart', event: 'add_to_cart' },
  { attr: 'data-halite-purchase', event: 'purchase' },
  { attr: 'data-halite-view', event: 'product_viewed' },
]

export function attachActions(api: HaliteApi, surface = 'pdp'): void {
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null
    if (!target) return

    for (const { attr, event: name } of ACTIONS) {
      const trigger = target.closest<HTMLElement>(`[${attr}]`)
      if (!trigger) continue

      // The product is whatever the button sits inside, unless the button
      // names one itself — a "save" in a sticky bar, say.
      const ref = trigger.getAttribute(attr)?.trim()
        || trigger.closest<HTMLElement>(`[${PRODUCT_ATTR}]`)?.getAttribute(PRODUCT_ATTR)
      if (!ref) {
        console.warn(`[halite] ${attr} clicked but no product could be identified`)
        return
      }

      const value = Number(trigger.getAttribute('data-halite-value'))
      void api.connectEvent(name, {
        sku: ref,
        productId: ref,
        surface: trigger.getAttribute('data-halite-surface') ?? surface,
        ...(Number.isFinite(value) && value > 0 ? { value } : {}),
      })
      return
    }
  }, true)
}
