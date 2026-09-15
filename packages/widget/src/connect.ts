import type { HaliteApi } from './api'
import type { ConnectSession } from './types'

type RenderFn = (node: HTMLElement) => void
type ProgressFn = (pct: number) => void
type BackFn = (fn: (() => void) | null) => void

const AREA_LABELS: Record<string, string> = {
  SKINCARE: 'skincare', BODY: 'body', HAIR: 'hair', MAKEUP: 'makeup',
  FRAGRANCE: 'fragrance', NAILS: 'nails', WELLNESS: 'wellness',
  SUN_CARE: 'sun care', LIP_CARE: 'lip care', EYE_CARE: 'eye care',
}

function areaPhrase(areas: string[]): string {
  const words = areas.map(a => AREA_LABELS[a] ?? a.toLowerCase().replace(/_/g, ' '))
  if (words.length === 0) return 'beauty'
  if (words.length === 1) return words[0]
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/**
 * The consent screen.
 *
 * Everything shown here comes from /v1/connect/session rather than from the
 * embedding page, so a brand cannot overstate what it is asking for by
 * editing its own snippet.
 */
export class ConnectController {
  private session: ConnectSession | null = null
  private surface: string

  constructor(
    private api: HaliteApi,
    private render: RenderFn,
    private progress: ProgressFn,
    private back: BackFn,
    surface = 'pdp',
  ) {
    this.surface = surface
  }

  async start(): Promise<void> {
    this.progress(0)
    this.back(null)
    try {
      this.session = await this.api.connectSession(this.surface)
      this.renderConsent()
    } catch {
      this.renderError()
    }
  }

  private renderError() {
    const node = document.createElement('div')
    node.innerHTML = `
      <p class="hlw-question-text">We couldn't reach Halite</p>
      <p class="hlw-question-sub">Nothing was shared. Try again in a moment.</p>`
    this.render(node)
  }

  private renderConsent() {
    const s = this.session!
    const node = document.createElement('div')
    const areas = areaPhrase(s.request.categories)

    node.innerHTML = `
      <div class="hlw-connect-marks">
        <div class="hlw-connect-mark hlw-connect-mark-brand">${escapeHtml(initial(s.brand.name))}</div>
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="#C4B5BD" stroke-width="1.8" stroke-linecap="round"><path d="M1 7h20"/><path d="M16 2.5L20.5 7 16 11.5"/></svg>
        <div class="hlw-connect-mark hlw-connect-mark-hallie">H</div>
      </div>

      <p class="hlw-question-text">${escapeHtml(s.brand.name)} wants to connect your Hallie profile</p>
      <p class="hlw-question-sub">So it can recommend ${escapeHtml(areas)} from what you already like, own and wear &mdash; instead of guessing.</p>

      <p class="hlw-connect-label">What ${escapeHtml(s.brand.name)} receives</p>
      <div class="hlw-connect-box">
        <p class="hlw-connect-box-title">Your ${escapeHtml(areas)} profile</p>
        <ul class="hlw-connect-list">
          ${s.disclosure.receives.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
        <p class="hlw-connect-footnote">Shared as one set. ${escapeHtml(s.brand.name)} sees what your products are made of, never whose they are.</p>
      </div>

      <div class="hlw-connect-meta">
        <div class="hlw-connect-meta-row">
          <span class="hlw-connect-meta-k">Purpose</span>
          <span class="hlw-connect-meta-v">${escapeHtml(purposeLabel(s.request.purpose, areas))}</span>
        </div>
        <div class="hlw-connect-meta-row">
          <span class="hlw-connect-meta-k">${escapeHtml(s.brand.name)} keeps</span>
          <span class="hlw-connect-meta-v">Its recommendations &mdash; not your profile</span>
        </div>
      </div>

      <div class="hlw-connect-not">
        <p class="hlw-connect-not-label">${escapeHtml(s.brand.name)} will not see</p>
        <ul class="hlw-connect-not-list">
          ${s.disclosure.withheld.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
        </ul>
      </div>

      <label class="hlw-connect-field">
        <span>Your email</span>
        <input class="hlw-text-input" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" />
      </label>
      <p class="hlw-connect-hint">We use this to find your Hallie profile. No new account, no password.</p>
      <p class="hlw-connect-error" style="display:none"></p>
    `

    const input = node.querySelector<HTMLInputElement>('input')!
    const error = node.querySelector<HTMLParagraphElement>('.hlw-connect-error')!

    const allow = document.createElement('button')
    allow.className = 'hlw-btn-next'
    allow.textContent = 'Allow access'
    allow.disabled = true

    input.addEventListener('input', () => {
      allow.disabled = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())
      error.style.display = 'none'
    })

    allow.addEventListener('click', async () => {
      allow.disabled = true
      allow.textContent = 'Connecting…'
      try {
        const res = await this.api.connectAuthorize({ email: input.value.trim(), surface: this.surface })
        this.renderConnected(res.consumer_id)
      } catch {
        allow.disabled = false
        allow.textContent = 'Allow access'
        error.textContent = 'That didn’t go through. Nothing was shared — try again.'
        error.style.display = 'block'
      }
    })

    ;(node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = allow

    this.back(() => {
      void this.api.connectDecline(this.surface)
      window.dispatchEvent(new CustomEvent('halite:connect:declined'))
      document.dispatchEvent(new CustomEvent('halite:close'))
    })

    this.progress(0.5)
    this.render(node)
  }

  private renderConnected(consumerId: string) {
    const s = this.session!
    const node = document.createElement('div')
    node.innerHTML = `
      <div class="hlw-connect-done">
        <div class="hlw-connect-tick">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>
        </div>
        <p class="hlw-question-text" style="text-align:center">Connected</p>
        <p class="hlw-question-sub" style="text-align:center">${escapeHtml(s.brand.name)} can now rank its ${escapeHtml(areaPhrase(s.request.categories))} against your profile. Disconnect anytime in Hallie.</p>
      </div>`

    const done = document.createElement('button')
    done.className = 'hlw-btn-next'
    done.textContent = 'See what fits'
    done.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('halite:close'))
    })
    ;(node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = done

    this.back(null)
    this.progress(1)
    this.render(node)

    // The host page listens for this to re-render its grid with match scores.
    window.dispatchEvent(new CustomEvent('halite:connected', { detail: { consumerId } }))
  }
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

function purposeLabel(purpose: string, areas: string): string {
  if (purpose === 'product_recommendations') return `${areas.charAt(0).toUpperCase()}${areas.slice(1)} recommendations`
  return purpose.replace(/_/g, ' ')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  ))
}
