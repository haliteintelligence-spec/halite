import type { HaliteApi } from './api'
import type { QuizQuestion, Routine } from './types'

const TIME_LABELS: Record<string, string> = {
  AM: 'Morning',
  PM: 'Evening',
  DAILY: 'Daily',
  WASH_DAY: 'Wash Day',
  AS_NEEDED: 'As Needed',
}

export class QuizController {
  private questions: QuizQuestion[] = []
  private answers: Record<string, unknown> = {}
  private sessionId = ''
  private index = 0
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private api: HaliteApi,
    private render: (node: HTMLElement) => void,
    private setProgress: (pct: number) => void,
    private setBack: (fn: (() => void) | null) => void,
  ) {}

  async start() {
    this.renderLoading('Loading your quiz…', '')
    try {
      this.questions = await this.api.getQuestions()
      this.sessionId = await this.api.createSession()
      this.index = 0
      this.answers = {}
      this.showQuestion()
    } catch {
      this.renderError('Could not load quiz', 'Check your connection and try again.')
    }
  }

  private showQuestion() {
    const q = this.questions[this.index]
    if (!q) { this.complete(); return }

    this.setProgress(this.index / this.questions.length)
    this.setBack(this.index > 0 ? () => { this.index--; this.showQuestion() } : null)

    const container = document.createElement('div')

    const titleEl = document.createElement('p')
    titleEl.className = 'hlw-question-text'
    titleEl.textContent = q.question
    container.appendChild(titleEl)

    if (q.subtext) {
      const sub = document.createElement('p')
      sub.className = 'hlw-question-sub'
      sub.textContent = q.subtext
      container.appendChild(sub)
    }

    let getValue: () => unknown = () => null
    let isValid: () => boolean = () => false

    const onNext = () => {
      if (!isValid()) return
      const val = getValue()
      this.answers[q.id] = val
      this.scheduleSave()
      this.index++
      this.showQuestion()
    }

    if (q.type === 'single' && q.options) {
      const opts = document.createElement('div')
      opts.className = 'hlw-options'
      let selected = ''

      q.options.forEach(opt => {
        const el = document.createElement('div')
        el.className = 'hlw-option'
        el.innerHTML = `<div class="hlw-option-label">${opt.label}</div>${opt.description ? `<div class="hlw-option-desc">${opt.description}</div>` : ''}`
        el.addEventListener('click', () => {
          opts.querySelectorAll('.hlw-option').forEach(o => o.classList.remove('selected'))
          el.classList.add('selected')
          selected = opt.value
          nextBtn.disabled = false
        })
        opts.appendChild(el)
      })
      container.appendChild(opts)
      getValue = () => selected
      isValid = () => !!selected

    } else if (q.type === 'multi' && q.options) {
      const opts = document.createElement('div')
      opts.className = 'hlw-options'
      const chosen = new Set<string>()

      q.options.forEach(opt => {
        const el = document.createElement('div')
        el.className = 'hlw-option'
        el.innerHTML = `<div class="hlw-option-label">${opt.label}</div>`
        el.addEventListener('click', () => {
          if (chosen.has(opt.value)) { chosen.delete(opt.value); el.classList.remove('selected') }
          else { chosen.add(opt.value); el.classList.add('selected') }
          nextBtn.disabled = chosen.size === 0
        })
        opts.appendChild(el)
      })
      container.appendChild(opts)
      getValue = () => Array.from(chosen)
      isValid = () => chosen.size > 0

    } else if (q.type === 'scale') {
      const steps = q.scaleSteps ?? 10
      const wrap = document.createElement('div')
      wrap.className = 'hlw-scale-wrap'
      const input = document.createElement('input')
      input.type = 'range'
      input.className = 'hlw-scale-input'
      input.min = '1'; input.max = String(steps); input.value = String(Math.ceil(steps / 2))
      const labels = document.createElement('div')
      labels.className = 'hlw-scale-labels'
      labels.innerHTML = `<span>${q.scaleMin ?? '1'}</span><span>${q.scaleMax ?? String(steps)}</span>`
      wrap.appendChild(input); wrap.appendChild(labels)
      container.appendChild(wrap)
      getValue = () => input.value
      isValid = () => true
      nextBtn.disabled = false

    } else if (q.type === 'text') {
      const input = document.createElement('input')
      input.type = 'text'; input.className = 'hlw-text-input'
      input.placeholder = 'Type your answer…'
      input.addEventListener('input', () => { nextBtn.disabled = !input.value.trim() })
      container.appendChild(input)
      getValue = () => input.value.trim()
      isValid = () => !!input.value.trim()

    } else if (q.type === 'area_select' && q.options) {
      const opts = document.createElement('div')
      opts.className = 'hlw-options'
      const chosen = new Set<string>()

      q.options.forEach(opt => {
        const el = document.createElement('div')
        el.className = 'hlw-option'
        el.innerHTML = `<div class="hlw-option-label">${opt.label}</div>${opt.description ? `<div class="hlw-option-desc">${opt.description}</div>` : ''}`
        el.addEventListener('click', () => {
          if (chosen.has(opt.value)) { chosen.delete(opt.value); el.classList.remove('selected') }
          else { chosen.add(opt.value); el.classList.add('selected') }
          nextBtn.disabled = chosen.size === 0
        })
        opts.appendChild(el)
      })
      container.appendChild(opts)
      getValue = () => Array.from(chosen)
      isValid = () => chosen.size > 0

    } else {
      // Fallback: skip unsupported question types (location etc.)
      this.index++
      this.showQuestion()
      return
    }

    // Next button (appended after question body)
    const nextBtn = document.createElement('button')
    nextBtn.className = 'hlw-btn-next'
    nextBtn.textContent = this.index === this.questions.length - 1 ? 'Get My Routine' : 'Continue'
    nextBtn.disabled = !['scale'].includes(q.type)
    nextBtn.addEventListener('click', onNext)

    // Inject next btn into footer via custom event
    const footerEvent = new CustomEvent('hlw:setNext', { detail: nextBtn, bubbles: true })
    container.dispatchEvent(footerEvent)

    // Store ref so footer can grab it
    ;(container as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn

    this.render(container)
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(async () => {
      try { await this.api.saveAnswers(this.sessionId, this.answers) } catch { /* non-blocking */ }
    }, 400)
  }

  private async complete() {
    this.renderLoading('Building your routine…', 'Claude is analysing your profile and selecting products just for you.')
    try {
      await this.api.saveAnswers(this.sessionId, this.answers)
      await this.api.completeSession(this.sessionId)
      await this.pollRoutine()
    } catch {
      this.renderError('Something went wrong', 'Your profile was saved. Try reopening the widget.')
    }
  }

  private async pollRoutine() {
    const maxAttempts = 20
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(2000)
      const routine = await this.api.getRoutine()
      if (routine) { this.renderRoutine(routine); return }
    }
    this.renderError('Routine is taking longer than usual', 'Check back in a minute — your routine will be ready soon.')
  }

  renderLoading(title: string, sub: string) {
    this.setProgress(0); this.setBack(null)
    const el = document.createElement('div')
    el.className = 'hlw-loading'
    el.innerHTML = `
      <div class="hlw-spinner"></div>
      <p class="hlw-loading-text">${title}</p>
      ${sub ? `<p class="hlw-loading-sub">${sub}</p>` : ''}
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
      <p class="hlw-error-text">${title}</p>
      <p class="hlw-error-sub">${sub}</p>
    `
    this.render(el)
  }

  private renderRoutine(routine: Routine) {
    this.setProgress(1); this.setBack(null)

    const grouped: Record<string, typeof routine.steps> = {}
    for (const step of routine.steps) {
      const key = step.timeOfDay
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(step)
    }

    const el = document.createElement('div')
    el.className = 'hlw-routine'

    const header = document.createElement('div')
    header.className = 'hlw-routine-header'
    header.innerHTML = `
      <p class="hlw-routine-title">Your Personalised Routine</p>
      <p class="hlw-routine-sub">${routine.steps.length} step${routine.steps.length !== 1 ? 's' : ''} · ${routine.area.toLowerCase()} routine</p>
    `
    el.appendChild(header)

    const timeOrder = ['AM', 'PM', 'DAILY', 'WASH_DAY', 'AS_NEEDED']
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      return (timeOrder.indexOf(a) ?? 99) - (timeOrder.indexOf(b) ?? 99)
    })

    for (const timeKey of sortedKeys) {
      const group = document.createElement('div')
      group.className = 'hlw-time-group'

      const label = document.createElement('p')
      label.className = 'hlw-time-label'
      label.textContent = TIME_LABELS[timeKey] ?? timeKey
      group.appendChild(label)

      for (const step of grouped[timeKey]) {
        const card = document.createElement('div')
        card.className = 'hlw-step-card'
        const ingredients = (step.product.keyIngredients ?? []).slice(0, 3)
        card.innerHTML = `
          <div class="hlw-step-top">
            <div class="hlw-step-num">${step.step}</div>
            <div class="hlw-step-name">${step.product.name}</div>
            <div class="hlw-step-price">${step.product.currency} ${step.product.price.toFixed(2)}</div>
          </div>
          <p class="hlw-step-instruction">${step.instruction}</p>
          ${ingredients.length ? `<div class="hlw-tags">${ingredients.map(i => `<span class="hlw-tag">${i}</span>`).join('')}</div>` : ''}
        `
        group.appendChild(card)
      }

      el.appendChild(group)
    }

    this.render(el)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
