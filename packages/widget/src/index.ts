import { HaliteApi } from './api'
import { QuizController } from './quiz'
import { CheckInController } from './checkin'
import { ProgressController } from './progress'
import { getStyles } from './styles'

interface HaliteWidgetConfig {
  apiKey: string
  apiUrl?: string
  accentColor?: string
}

class HaliteWidgetInstance {
  private api: HaliteApi
  private controller!: QuizController | CheckInController | ProgressController
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

  open(mode: 'quiz' | 'checkin' | 'progress' = 'quiz') {
    if (this.overlay) return
    this.overlay = this.buildModal()
    document.body.appendChild(this.overlay)
    document.body.style.overflow = 'hidden'

    const renderFn = (node: HTMLElement) => this.renderBody(node)
    const progressFn = (pct: number) => this.setProgress(pct)
    const backFn = (fn: (() => void) | null) => this.setBack(fn)

    if (mode === 'checkin') {
      this.controller = new CheckInController(this.api, renderFn, progressFn, backFn)
    } else if (mode === 'progress') {
      this.controller = new ProgressController(this.api, renderFn, progressFn, backFn)
    } else {
      this.controller = new QuizController(this.api, renderFn, progressFn, backFn)
    }

    this.api.init()
      .then(() => this.controller.start())
      .catch(() => (this.controller as ProgressController).renderLoading('Connecting…'))
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

  close() {
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
  }

  attachTriggers()
  // Also handle dynamically added triggers
  const observer = new MutationObserver(attachTriggers)
  observer.observe(document.body, { childList: true, subtree: true })

  return instance
}

// Auto-init from script tag: <script src="..." data-api-key="..." data-api-url="..." data-accent="...">
function autoInit() {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-api-key]')
  scripts.forEach(script => {
    const apiKey = script.dataset.apiKey
    if (!apiKey) return
    init({
      apiKey,
      apiUrl: script.dataset.apiUrl,
      accentColor: script.dataset.accent,
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}

// Expose for manual init: HaliteWidget.init({ apiKey: '...' })
export { init }
