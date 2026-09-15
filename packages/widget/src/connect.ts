import type { HaliteApi } from './api'
import type { ConnectSession, ConnectQuiz, ConnectQuizQuestion } from './types'

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
  private quiz: ConnectQuiz | null = null
  private answers: Record<string, string[]> = {}
  private step = 0
  private email = ''

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
        <span>Email or phone number</span>
        <input class="hlw-text-input" type="text" inputmode="email" autocomplete="email" placeholder="you@example.com or +234 801 234 5678" />
      </label>
      <p class="hlw-connect-hint">Whichever you used for Hallie. No new account, no password.</p>
      <button type="button" class="hlw-connect-noprofile">Don&rsquo;t have a Hallie profile? Build one in a minute &rsaquo;</button>
      <p class="hlw-connect-error" style="display:none"></p>
    `

    const input = node.querySelector<HTMLInputElement>('input')!
    const error = node.querySelector<HTMLParagraphElement>('.hlw-connect-error')!

    const allow = document.createElement('button')
    allow.className = 'hlw-btn-next'
    allow.textContent = 'Allow access'
    allow.disabled = true

    input.addEventListener('input', () => {
      allow.disabled = identify(input.value) === null
      error.style.display = 'none'
    })

    allow.addEventListener('click', async () => {
      const id = identify(input.value)
      if (!id) return
      allow.disabled = true
      allow.textContent = 'Connecting…'
      try {
        const res = await this.api.connectAuthorize({ ...id, surface: this.surface })
        this.renderConnected(res.consumer_id)
      } catch {
        allow.disabled = false
        allow.textContent = 'Allow access'
        error.textContent = 'We couldn’t find a Hallie profile for that. Nothing was shared — check it, or build a profile below.'
        error.style.display = 'block'
      }
    })

    ;(node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = allow

    const noProfile = node.querySelector<HTMLButtonElement>('.hlw-connect-noprofile')
    noProfile?.addEventListener('click', () => { void this.startQuiz() })

    this.back(() => {
      void this.api.connectDecline(this.surface)
      window.dispatchEvent(new CustomEvent('halite:connect:declined'))
      document.dispatchEvent(new CustomEvent('halite:close'))
    })

    this.progress(0.5)
    this.render(node)
  }


  /**
   * The preference quiz, for a shopper with no Hallie profile yet.
   *
   * These are Hallie's own questions, narrowed to the categories this brand
   * sells. The answers create a profile the shopper owns and takes with
   * them — the brand is just where they happened to fill it in.
   */
  private async startQuiz(): Promise<void> {
    this.back(() => this.renderConsent())
    try {
      this.quiz = await this.api.connectQuiz()
      this.step = 0
      this.answers = {}
      this.renderQuestion()
    } catch {
      this.renderError()
    }
  }

  private get questions(): ConnectQuizQuestion[] {
    return this.quiz?.questions ?? []
  }

  private renderQuestion(): void {
    const q = this.questions[this.step]
    if (!q) return this.renderQuizEmail()

    const node = document.createElement('div')
    const chosen = this.answers[q.key] ?? []

    node.innerHTML = `
      <p class="hlw-connect-label">${escapeHtml(categoryLabel(q.category))} &middot; ${this.step + 1} of ${this.questions.length}</p>
      <p class="hlw-question-text">${escapeHtml(q.prompt)}</p>
      <p class="hlw-question-sub">${escapeHtml(q.help ?? (q.multi ? 'Choose as many as apply.' : 'Choose one.'))}</p>
      <div class="hlw-options">
        ${q.options.map(o => `
          <div class="hlw-option${chosen.includes(o.value) ? ' selected' : ''}" data-value="${escapeHtml(o.value)}">
            <div class="hlw-option-label">${escapeHtml(o.label)}</div>
          </div>`).join('')}
      </div>`

    const next = document.createElement('button')
    next.className = 'hlw-btn-next'
    next.textContent = this.step === this.questions.length - 1 ? 'Last one' : 'Next'
    next.disabled = chosen.length === 0 && !q.optional

    node.querySelectorAll<HTMLElement>('.hlw-option').forEach(el => {
      el.addEventListener('click', () => {
        const value = el.dataset['value']!
        const current = this.answers[q.key] ?? []
        if (q.multi) {
          this.answers[q.key] = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value]
          el.classList.toggle('selected')
        } else {
          this.answers[q.key] = [value]
          node.querySelectorAll('.hlw-option').forEach(o => o.classList.remove('selected'))
          el.classList.add('selected')
        }
        next.disabled = (this.answers[q.key]?.length ?? 0) === 0 && !q.optional
      })
    })

    next.addEventListener('click', () => { this.step++; this.renderQuestion() })
    ;(node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = next

    this.back(() => {
      if (this.step === 0) return this.renderConsent()
      this.step--
      this.renderQuestion()
    })
    this.progress((this.step + 1) / (this.questions.length + 1))
    this.render(node)
  }

  private renderQuizEmail(): void {
    const node = document.createElement('div')
    node.innerHTML = `
      <p class="hlw-question-text">Where should we keep this?</p>
      <p class="hlw-question-sub">${escapeHtml(this.quiz?.disclosure ?? '')}</p>
      <label class="hlw-connect-field">
        <span>Your email</span>
        <input class="hlw-text-input" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" />
      </label>
      <p class="hlw-connect-hint">An email is needed to create the profile &mdash; it is how you claim it in Hallie later. No password needed.</p>
      <p class="hlw-connect-error" style="display:none"></p>`

    const input = node.querySelector<HTMLInputElement>('input')!
    const error = node.querySelector<HTMLParagraphElement>('.hlw-connect-error')!
    const done = document.createElement('button')
    done.className = 'hlw-btn-next'
    done.textContent = 'Create my profile'
    done.disabled = true

    input.addEventListener('input', () => {
      this.email = input.value.trim()
      done.disabled = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email)
      error.style.display = 'none'
    })

    done.addEventListener('click', async () => {
      done.disabled = true
      done.textContent = 'Creating…'
      try {
        const res = await this.api.connectSubmitQuiz({
          email: this.email, answers: this.answers, surface: this.surface,
        })
        this.renderConnected(res.consumer_id)
      } catch {
        done.disabled = false
        done.textContent = 'Create my profile'
        error.textContent = 'That didn\u2019t go through. Nothing was saved — try again.'
        error.style.display = 'block'
      }
    })

    ;(node as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = done
    this.back(() => { this.step = this.questions.length - 1; this.renderQuestion() })
    this.progress(0.95)
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

const CATEGORY_LABELS: Record<string, string> = {
  skin_care: 'Skincare', body_care: 'Body', hair_care: 'Hair',
  makeup: 'Makeup', perfume: 'Fragrance',
}

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ')
}

/**
 * A shopper may have signed up to Hallie with either, so accept either and
 * let the shape of what they typed decide which it is. Phone numbers are
 * sent as typed — the server compares on digits, so formatting does not
 * have to match what Hallie stored.
 */
export function identify(raw: string): { email: string } | { phone: string } | null {
  const value = raw.trim()
  if (!value) return null
  if (value.includes('@')) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? { email: value } : null
  }
  const digits = value.replace(/\D/g, '')
  // Short enough to be a typo rather than a number anyone actually has.
  return digits.length >= 9 && digits.length <= 15 ? { phone: value } : null
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
