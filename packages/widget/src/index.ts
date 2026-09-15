import { HaliteApi } from './api'
import { QuizController } from './quiz'
import { CheckInController } from './checkin'
import { ProgressController } from './progress'
import { ReorderController } from './reorder'
import { ConnectController } from './connect'
import { Decorator, type DecorateOptions } from './decorate'
import { attachActions } from './actions'
import { getStyles } from './styles'

interface HaliteWidgetConfig {
  apiKey: string
  apiUrl?: string
  accentColor?: string
}

class HaliteWidgetInstance {
  readonly api: HaliteApi
  private controller!: QuizController | CheckInController | ProgressController | ReorderController | ConnectController
  private overlay: HTMLElement | null = null
  private body: HTMLElement | null = null
  private progress: HTMLElement | null = null
  private footer: HTMLElement | null = null
  private backBtn: HTMLElement | null = null
  private nextSlot: HTMLElement | null = null

  constructor(private config: Required<HaliteWidgetConfig>) {
    this.api = new HaliteApi(config.apiUrl, config.apiKey)
    this.injectStyles()
  }

  private injectStyles() {
    if (document.getElementById('hlw-styles')) return
    const style = document.createElement('style')
    style.id = 'hlw-styles'
    style.textContent = getStyles(this.config.accentColor)
    document.head.appendChild(style)
  }

  open(mode: 'quiz' | 'checkin' | 'progress' | 'reorder' | 'connect' = 'quiz', surface = 'pdp') {
    if (this.overlay) return
    this.overlay = this.buildModal()
    document.body.appendChild(this.overlay)
    document.body.style.overflow = 'hidden'
    document.addEventListener('halite:close', this.closeListener)

    const renderFn = (node: HTMLElement) => this.renderBody(node)
    const progressFn = (pct: number) => this.setProgress(pct)
    const backFn = (fn: (() => void) | null) => this.setBack(fn)

    if (mode === 'connect') {
      // Connect needs no end-user session — the brand key and the
      // consumer's own consent are the whole authorisation.
      this.controller = new ConnectController(this.api, renderFn, progressFn, backFn, surface)
      void this.controller.start()
      return
    }

    if (mode === 'checkin') {
      this.controller = new CheckInController(this.api, renderFn, progressFn, backFn)
    } else if (mode === 'progress') {
      this.controller = new ProgressController(this.api, renderFn, progressFn, backFn)
    } else if (mode === 'reorder') {
      this.controller = new ReorderController(this.api, renderFn, progressFn, backFn)
    } else {
      this.controller = new QuizController(this.api, renderFn, progressFn, backFn)
    }

    this.api.init()
      .then(() => this.controller.start())
      .catch(() => (this.controller as any).renderLoading?.('Connecting…'))
  }

  private buildModal(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.className = 'hlw-overlay'
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close() })

    const modal = document.createElement('div')
    modal.className = 'hlw-modal'
    modal.addEventListener('click', e => e.stopPropagation())

    // Header
    const header = document.createElement('div')
    header.className = 'hlw-header'
    const logo = document.createElement('span')
    logo.className = 'hlw-logo'
    logo.textContent = 'Halite Intelligence'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'hlw-close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.textContent = '✕'
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(logo)
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Progress bar
    const track = document.createElement('div')
    track.className = 'hlw-progress-track'
    const fill = document.createElement('div')
    fill.className = 'hlw-progress-fill'
    fill.style.width = '0%'
    this.progress = fill
    track.appendChild(fill)
    modal.appendChild(track)

    // Scrollable body
    const body = document.createElement('div')
    body.className = 'hlw-body'
    this.body = body
    modal.appendChild(body)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'hlw-footer'
    footer.style.display = 'none'
    this.footer = footer

    const backBtn = document.createElement('button')
    backBtn.className = 'hlw-btn-back'
    backBtn.textContent = '← Back'
    backBtn.style.display = 'none'
    this.backBtn = backBtn
    footer.appendChild(backBtn)

    const nextSlot = document.createElement('div')
    nextSlot.style.flex = '1'
    this.nextSlot = nextSlot
    footer.appendChild(nextSlot)

    modal.appendChild(footer)
    overlay.appendChild(modal)
    return overlay
  }

  private renderBody(node: HTMLElement) {
    if (!this.body || !this.footer || !this.nextSlot) return

    // Animate out / in
    this.body.style.opacity = '0'
    this.body.style.transform = 'translateY(8px)'
    this.body.style.transition = 'opacity 0.15s, transform 0.15s'

    requestAnimationFrame(() => {
      this.body!.innerHTML = ''
      this.body!.appendChild(node)

      // Wire up next button from controller
      const btn = (node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn
      this.nextSlot!.innerHTML = ''
      if (btn) {
        this.nextSlot!.appendChild(btn)
        this.footer!.style.display = 'flex'
      } else {
        this.footer!.style.display = 'none'
      }

      requestAnimationFrame(() => {
        this.body!.style.opacity = '1'
        this.body!.style.transform = 'translateY(0)'
      })
    })
  }

  private setProgress(pct: number) {
    if (this.progress) this.progress.style.width = `${Math.round(pct * 100)}%`
  }

  private setBack(fn: (() => void) | null) {
    if (!this.backBtn) return
    if (fn) {
      this.backBtn.style.display = 'block'
      this.backBtn.onclick = fn
    } else {
      this.backBtn.style.display = 'none'
      this.backBtn.onclick = null
    }
  }

  private closeListener = () => this.close()

  close() {
    document.removeEventListener('halite:close', this.closeListener)
    if (!this.overlay) return
    this.overlay.remove()
    this.overlay = null
    document.body.style.overflow = ''
  }
}

function init(config: HaliteWidgetConfig) {
  const resolved: Required<HaliteWidgetConfig> = {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl ?? 'https://api.haliteintelligence.com',
    accentColor: config.accentColor ?? '#C17A47',
  }

  const instance = new HaliteWidgetInstance(resolved)

  // Attach to all [data-halite-quiz] and [data-halite-checkin] triggers
  function attachTriggers() {
    document.querySelectorAll<HTMLElement>('[data-halite-quiz]').forEach(el => {
      if (el.dataset.hlwBound) return
      el.dataset.hlwBound = '1'
      el.addEventListener('click', () => instance.open('quiz'))
    })
    document.querySelectorAll<HTMLElement>('[data-halite-checkin]').forEach(el => {
      if (el.dataset.hlwBound) return
      el.dataset.hlwBound = '1'
      el.addEventListener('click', () => instance.open('checkin'))
    })
    document.querySelectorAll<HTMLElement>('[data-halite-progress]').forEach(el => {
      if (el.dataset.hlwBound) return
      el.dataset.hlwBound = '1'
      el.addEventListener('click', () => instance.open('progress'))
    })
    document.querySelectorAll<HTMLElement>('[data-halite-reorder]').forEach(el => {
      if (el.dataset.hlwBound) return
      el.dataset.hlwBound = '1'
      el.addEventListener('click', () => instance.open('reorder'))
    })
    // <button data-halite-connect="pdp"> — the value names the surface, so
    // acceptance can be compared across placements.
    document.querySelectorAll<HTMLElement>('[data-halite-connect]').forEach(el => {
      if (el.dataset.hlwBound) return
      el.dataset.hlwBound = '1'
      const surface = el.dataset.haliteConnect || 'pdp'
      el.addEventListener('click', () => instance.open('connect', surface))
    })
  }

  attachTriggers()
  // Also handle dynamically added triggers
  const observer = new MutationObserver(attachTriggers)
  observer.observe(document.body, { childList: true, subtree: true })

  // Scores follow the shopper around the site, not just the page that
  // rendered a list. Options come off the script tag so a merchant can point
  // at their own markup without writing any JavaScript.
  const script = document.querySelector<HTMLScriptElement>('script[data-api-key]')
  const decorateOptions: DecorateOptions = {
    ...(script?.dataset['haliteBadge'] ? { badgeSelector: script.dataset['haliteBadge'] } : {}),
    ...(script?.dataset['haliteReasons'] ? { reasonsSelector: script.dataset['haliteReasons'] } : {}),
    ...(script?.dataset['haliteMinScore'] ? { minScore: Number(script.dataset['haliteMinScore']) } : {}),
  }
  const decorator = new Decorator(instance.api, decorateOptions)

  // Saves and purchases report from any page, not just a widget-rendered one.
  attachActions(instance.api, script?.dataset['haliteSurface'] ?? 'pdp')

  // On connect, and on every later page load while the grant is live.
  window.addEventListener('halite:connected', () => { void decorator.run() })
  window.addEventListener('halite:disconnected', () => { decorator.stop() })
  if (instance.api.connectedConsumerId) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { void decorator.run() })
    } else {
      void decorator.run()
    }
  }

  // Storefront surface. A merchant reads recommendations and reports what
  // happened to them without touching the modal at all.
  const connect = {
    isConnected: () => instance.api.connectedConsumerId != null,
    consumerId: () => instance.api.connectedConsumerId,
    open: (surface = 'pdp') => instance.open('connect', surface),
    recommendations: (opts?: { surface?: string; limit?: number; maxPrice?: number }) =>
      instance.api.connectRecommendations(opts ?? {}),
    /** Re-scan the page — call after rendering products yourself. */
    decorate: (options?: DecorateOptions) =>
      options ? new Decorator(instance.api, options).run() : decorator.run(),
    match: (skus: string[]) => instance.api.connectMatch({ skus }),
    track: (
      event: 'product_viewed' | 'add_to_cart' | 'wishlisted' | 'purchase' | 'returned' | 'rated',
      payload?: {
        sku?: string; productId?: string; recommendationId?: string
        surface?: string; value?: number; currency?: string
      },
    ) => instance.api.connectEvent(event, payload ?? {}),
  }

  return Object.assign(instance, { connect })
}

type HaliteInstance = ReturnType<typeof init>

declare global {
  interface Window {
    Halite?: HaliteInstance
  }
}

// Auto-init from script tag: <script src="..." data-api-key="..." data-api-url="..." data-accent="...">
//
// The instance is published as window.Halite. Without it a merchant using
// the documented snippet has no handle on the widget at all — the storefront
// API (Halite.connect.recommendations / .track) would be unreachable, which
// is most of what Connect is for.
function autoInit() {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-api-key]')
  scripts.forEach(script => {
    const apiKey = script.dataset.apiKey
    if (!apiKey) return
    const instance = init({
      apiKey,
      apiUrl: script.dataset.apiUrl,
      accentColor: script.dataset.accent,
    })
    // First script tag wins, so a page with two never swaps the handle.
    if (!window.Halite) {
      window.Halite = instance
      // A storefront's own script usually runs before this one finishes, so
      // it cannot simply read window.Halite and expect an answer. Announcing
      // readiness is what stops a connected shopper being asked to connect
      // again on the next page.
      window.dispatchEvent(new CustomEvent('halite:ready', {
        detail: { connected: instance.connect.isConnected() },
      }))
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}

// Manual init: HaliteWidget.init({ apiKey: '...' }) — returns the same shape
// that auto-init publishes as window.Halite.
export { init }
