import type { HaliteApi } from './api'
import type { Routine } from './types'
import { escapeHtml } from './utils'

const SYMPTOMS_NEGATIVE = [
  { value: 'BREAKOUT', label: '🔴 Breakout' },
  { value: 'DRYNESS', label: '🏜️ Dryness' },
  { value: 'REDNESS', label: '🌹 Redness' },
  { value: 'IRRITATION', label: '⚡ Irritation' },
  { value: 'PURGING', label: '🔄 Purging' },
  { value: 'OILINESS', label: '💧 Oiliness' },
  { value: 'DULLNESS', label: '🌑 Dullness' },
  { value: 'HYPERPIGMENTATION_FADING', label: '🔮 Still patchy' },
]

const SYMPTOMS_POSITIVE = [
  { value: 'IMPROVEMENT', label: '✨ Improving' },
  { value: 'GLOW', label: '🌟 Glowing' },
  { value: 'HYDRATED', label: '💦 Hydrated' },
  { value: 'TEXTURE_SMOOTH', label: '🧈 Smooth' },
]

const RATING_LABELS = ['Rough', 'Okay', 'Good', 'Great', 'Glowing']
const RATING_EMOJIS = ['😔', '😐', '🙂', '😊', '🤩']

interface Step { id: number; title: string }

const STEPS: Step[] = [
  { id: 1, title: 'How is your skin today?' },
  { id: 2, title: 'Any symptoms?' },
  { id: 3, title: 'Product feedback' },
  { id: 4, title: 'Any notes?' },
  { id: 5, title: 'Add a photo (optional)' },
]

export class CheckInController {
  private step = 1
  private skinRating = 0
  private symptoms = new Set<string>()
  private reactions: Record<string, string> = {}
  private notes = ''
  private photoUrl = ''
  private routine: Routine | null = null
  private previousCount = 0

  constructor(
    private api: HaliteApi,
    private render: (node: HTMLElement) => void,
    private setProgress: (pct: number) => void,
    private setBack: (fn: (() => void) | null) => void,
  ) {}

  async start() {
    this.renderLoading('Loading your routine…')
    try {
      const [routine, checkIns] = await Promise.all([
        this.api.getRoutine(),
        this.api.getCheckIns(),
      ])
      this.routine = routine
      this.previousCount = checkIns.length
      this.step = 1
      this.showStep()
    } catch {
      this.renderError('Could not load your routine.', 'Complete the skin quiz first to unlock check-ins.')
    }
  }

  private showStep() {
    this.setProgress((this.step - 1) / STEPS.length)
    this.setBack(this.step > 1 ? () => { this.step--; this.showStep() } : null)

    switch (this.step) {
      case 1: return this.renderRating()
      case 2: return this.renderSymptoms()
      case 3: return this.renderProducts()
      case 4: return this.renderNotes()
      case 5: return this.renderPhoto()
    }
  }

  private next() {
    this.step++
    if (this.step > STEPS.length) { this.submit(); return }
    this.showStep()
  }

  // ── Step 1: Skin rating ────────────────────────────────────────────

  private renderRating() {
    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'How is your skin feeling today?'
    el.appendChild(title)

    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Rate your overall skin condition'
    el.appendChild(sub)

    const row = document.createElement('div')
    row.className = 'hlw-rating-row'

    const nextBtn = this.makeNextBtn('Continue', true)
    nextBtn.disabled = this.skinRating === 0

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button')
      btn.className = 'hlw-rating-btn' + (this.skinRating === i ? ' selected' : '')
      btn.innerHTML = `${RATING_EMOJIS[i - 1]}<span>${RATING_LABELS[i - 1]}</span>`
      btn.addEventListener('click', () => {
        this.skinRating = i
        row.querySelectorAll('.hlw-rating-btn').forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
        nextBtn.disabled = false
      })
      row.appendChild(btn)
    }

    el.appendChild(row)
    nextBtn.addEventListener('click', () => { if (this.skinRating > 0) this.next() })
    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  // ── Step 2: Symptoms ───────────────────────────────────────────────

  private renderSymptoms() {
    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'Any symptoms to note?'
    el.appendChild(title)
    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Select all that apply — or skip'
    el.appendChild(sub)

    const posLabel = document.createElement('p')
    posLabel.className = 'hlw-section-label'
    posLabel.textContent = 'Positive'
    el.appendChild(posLabel)

    const posGrid = document.createElement('div')
    posGrid.className = 'hlw-symptom-grid'
    SYMPTOMS_POSITIVE.forEach(s => {
      const btn = document.createElement('button')
      btn.className = 'hlw-symptom-btn positive' + (this.symptoms.has(s.value) ? ' selected' : '')
      btn.textContent = s.label
      btn.addEventListener('click', () => {
        if (this.symptoms.has(s.value)) { this.symptoms.delete(s.value); btn.classList.remove('selected') }
        else { this.symptoms.add(s.value); btn.classList.add('selected') }
      })
      posGrid.appendChild(btn)
    })
    el.appendChild(posGrid)

    const negLabel = document.createElement('p')
    negLabel.className = 'hlw-section-label'
    negLabel.style.marginTop = '16px'
    negLabel.textContent = 'Concerns'
    el.appendChild(negLabel)

    const negGrid = document.createElement('div')
    negGrid.className = 'hlw-symptom-grid'
    SYMPTOMS_NEGATIVE.forEach(s => {
      const btn = document.createElement('button')
      btn.className = 'hlw-symptom-btn' + (this.symptoms.has(s.value) ? ' selected' : '')
      btn.textContent = s.label
      btn.addEventListener('click', () => {
        if (this.symptoms.has(s.value)) { this.symptoms.delete(s.value); btn.classList.remove('selected') }
        else { this.symptoms.add(s.value); btn.classList.add('selected') }
      })
      negGrid.appendChild(btn)
    })
    el.appendChild(negGrid)

    const nextBtn = this.makeNextBtn('Continue', false)
    nextBtn.disabled = false
    nextBtn.addEventListener('click', () => this.next())
    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  // ── Step 3: Product reactions ──────────────────────────────────────

  private renderProducts() {
    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'How are your products working?'
    el.appendChild(title)
    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Rate each product from your current routine'
    el.appendChild(sub)

    const steps = this.routine?.steps ?? []

    if (steps.length === 0) {
      const empty = document.createElement('p')
      empty.style.cssText = 'font-size:13px;color:#888;margin:16px 0 24px;'
      empty.textContent = 'No products in your routine yet.'
      el.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.className = 'hlw-product-list'

      const seen = new Set<string>()
      steps.forEach(step => {
        const p = step.product
        if (seen.has(p.id)) return
        seen.add(p.id)

        const row = document.createElement('div')
        row.className = 'hlw-product-row'

        const name = document.createElement('span')
        name.className = 'hlw-product-name'
        name.textContent = p.name
        row.appendChild(name)

        const btns = document.createElement('div')
        btns.className = 'hlw-reaction-btns'

        const reactions = [
          { value: 'POSITIVE', emoji: '👍', cls: 'active-pos' },
          { value: 'NEUTRAL', emoji: '👌', cls: 'active-neu' },
          { value: 'NEGATIVE', emoji: '👎', cls: 'active-neg' },
        ]

        reactions.forEach(r => {
          const btn = document.createElement('button')
          btn.className = 'hlw-reaction-btn' + (this.reactions[p.id] === r.value ? ` ${r.cls}` : '')
          btn.textContent = r.emoji
          btn.title = r.value.toLowerCase()
          btn.addEventListener('click', () => {
            this.reactions[p.id] = r.value
            btns.querySelectorAll('.hlw-reaction-btn').forEach(b => {
              b.className = 'hlw-reaction-btn'
            })
            btn.classList.add(r.cls)
          })
          btns.appendChild(btn)
        })

        row.appendChild(btns)
        list.appendChild(row)
      })

      el.appendChild(list)
    }

    const nextBtn = this.makeNextBtn('Continue', false)
    nextBtn.disabled = false
    nextBtn.addEventListener('click', () => this.next())
    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  // ── Step 4: Notes ──────────────────────────────────────────────────

  private renderNotes() {
    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'Any other notes?'
    el.appendChild(title)
    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Optional — changes to diet, stress, sleep, environment…'
    el.appendChild(sub)

    const textarea = document.createElement('textarea')
    textarea.className = 'hlw-notes-input'
    textarea.rows = 4
    textarea.placeholder = 'e.g. Been drinking more water this week, started a new supplement…'
    textarea.value = this.notes
    textarea.addEventListener('input', () => { this.notes = textarea.value })
    el.appendChild(textarea)

    const nextBtn = this.makeNextBtn('Submit Check-in', false)
    nextBtn.disabled = false
    nextBtn.addEventListener('click', () => this.next())
    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  // ── Step 5: Photo ──────────────────────────────────────────────────

  private renderPhoto() {
    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'Add a skin photo'
    el.appendChild(title)

    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Optional — helps track visible progress over time. Stored privately.'
    el.appendChild(sub)

    const uploadArea = document.createElement('div')
    uploadArea.className = 'hlw-photo-upload'
    uploadArea.innerHTML = `<span class="hlw-photo-icon">📷</span><p class="hlw-photo-label">Tap to add photo</p>`

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'user'
    input.style.display = 'none'

    let uploading = false

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file || uploading) return
      uploading = true
      uploadArea.innerHTML = `<span class="hlw-photo-icon">⏳</span><p class="hlw-photo-label">Uploading…</p>`
      try {
        this.photoUrl = await this.api.uploadCheckInPhoto(file)
        const preview = document.createElement('img')
        preview.src = URL.createObjectURL(file)
        preview.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px;'
        uploadArea.innerHTML = ''
        uploadArea.appendChild(preview)
      } catch {
        this.photoUrl = ''
        uploadArea.innerHTML = `<span class="hlw-photo-icon">⚠️</span><p class="hlw-photo-label">Upload failed — continuing without photo</p>`
      }
      uploading = false
    })

    uploadArea.addEventListener('click', () => input.click())
    el.appendChild(uploadArea)
    el.appendChild(input)

    const nextBtn = this.makeNextBtn('Submit Check-in', false)
    nextBtn.disabled = false
    nextBtn.addEventListener('click', () => this.next())
    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  // ── Submit ─────────────────────────────────────────────────────────

  private async submit() {
    this.setProgress(1); this.setBack(null)
    this.renderLoading('Saving your check-in…')

    const steps = this.routine?.steps ?? []
    const seen = new Set<string>()
    const uniqueProducts = steps.filter(s => { if (seen.has(s.product.id)) return false; seen.add(s.product.id); return true })
    const products = uniqueProducts.map(s => ({
      productId: s.product.id,
      used: s.product.id in this.reactions,
      reaction: this.reactions[s.product.id] as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | undefined,
    }))

    // Compliant if at least half of routine products got a reaction (user engaged with routine)
    const reactedCount = Object.keys(this.reactions).length
    const compliant = uniqueProducts.length === 0 || reactedCount >= Math.ceil(uniqueProducts.length / 2)

    try {
      await this.api.submitCheckIn({
        skinRating: this.skinRating,
        symptoms: Array.from(this.symptoms),
        notes: this.notes || undefined,
        compliant,
        photoUrl: this.photoUrl || undefined,
        products,
      })
      this.renderSuccess()
    } catch {
      this.renderError('Could not save check-in', 'Please check your connection and try again.')
    }
  }

  // ── Terminal states ────────────────────────────────────────────────

  private renderSuccess() {
    this.setBack(null)
    const streak = this.previousCount + 1

    const el = document.createElement('div')
    el.className = 'hlw-success'
    el.innerHTML = `
      <div class="hlw-success-icon">✦</div>
      <p class="hlw-success-title">Check-in logged</p>
      <p class="hlw-success-sub">Your skin data has been recorded. Consistent check-ins help Halite refine your routine over time.</p>
      <div class="hlw-streak">🔥 ${streak} check-in${streak !== 1 ? 's' : ''} total</div>
    `
    this.render(el)
  }

  renderLoading(msg: string) {
    this.setProgress(0); this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-loading'
    el.innerHTML = `
      <div class="hlw-spinner"></div>
      <p class="hlw-loading-text">${escapeHtml(msg)}</p>
      <div class="hlw-dots"><span></span><span></span><span></span></div>
    `
    this.render(el)
  }

  private renderError(title: string, sub: string) {
    this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-error'
    el.innerHTML = `
      <div class="hlw-error-icon">✦</div>
      <p class="hlw-error-text">${escapeHtml(title)}</p>
      <p class="hlw-error-sub">${escapeHtml(sub)}</p>
    `
    this.render(el)
  }

  private makeNextBtn(label: string, disabled: boolean): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'hlw-btn-next'
    btn.textContent = label
    btn.disabled = disabled
    return btn
  }
}
