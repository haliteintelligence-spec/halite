import type { HaliteApi } from './api'
import type { QuizQuestion, Routine } from './types'

const TIME_LABELS: Record<string, string> = {
  AM: 'Morning',
  PM: 'Evening',
  DAILY: 'Daily',
  WASH_DAY: 'Wash Day',
  AS_NEEDED: 'As Needed',
}

const PREFILL_IDS = new Set([
  'S1','S2','S3','S4','S5',
  'B1','B2','B3','B4',
  'H1','H2','H3','H4','H5','H6',
  'M1','M2','M3',
  'SH0','SH1_location','SH1_climate','SH1_currency',
  'SH4','SH5','SH6',
])

export class QuizController {
  private questions: QuizQuestion[] = []
  private answers: Record<string, unknown> = {}
  private sessionId = ''
  private index = 0
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private prefillCount = 0

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
      this.showGate()
    } catch {
      this.renderError('Could not load quiz', 'Check your connection and try again.')
    }
  }

  private showGate() {
    this.setProgress(0)
    this.setBack(null)

    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = "Let's personalise your routine"
    el.appendChild(title)

    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = 'Enter your email or phone number to save your profile and get faster onboarding next time.'
    el.appendChild(sub)

    // Email field
    const emailInput = document.createElement('input')
    emailInput.type = 'email'
    emailInput.className = 'hlw-text-input'
    emailInput.placeholder = 'Email address'
    emailInput.style.marginBottom = '10px'
    el.appendChild(emailInput)

    // Divider
    const divider = document.createElement('p')
    divider.style.cssText = 'text-align:center;font-size:11px;color:#aaa;margin:4px 0;'
    divider.textContent = 'or'
    el.appendChild(divider)

    // Phone field
    const phoneInput = document.createElement('input')
    phoneInput.type = 'tel'
    phoneInput.className = 'hlw-text-input'
    phoneInput.placeholder = 'Phone number'
    el.appendChild(phoneInput)

    const errMsg = document.createElement('p')
    errMsg.style.cssText = 'font-size:11px;color:#e57373;margin-top:8px;display:none;'
    errMsg.textContent = 'Please enter an email or phone number to continue.'
    el.appendChild(errMsg)

    const nextBtn = document.createElement('button')
    nextBtn.className = 'hlw-btn-next'
    nextBtn.textContent = 'Continue'
    nextBtn.disabled = false

    nextBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim()
      const phone = phoneInput.value.trim()

      if (!email && !phone) {
        errMsg.style.display = 'block'
        return
      }
      errMsg.style.display = 'none'
      nextBtn.disabled = true
      nextBtn.textContent = 'Connecting…'

      try {
        const { prefillAnswers, isReturning } = await this.api.identifyConsumer({
          email: email || undefined,
          phone: phone || undefined,
        })

        // Inject pre-fill answers and count them
        if (isReturning && Object.keys(prefillAnswers).length > 0) {
          this.answers = { ...prefillAnswers }
          this.prefillCount = Object.keys(prefillAnswers).filter(k => PREFILL_IDS.has(k)).length
        }
      } catch {
        // Identity call failed — continue anyway without prefill (graceful degradation)
      }

      this.sessionId = await this.api.createSession()
      this.index = 0
      this.showQuestion()
    })

    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  private showQuestion() {
    const q = this.questions[this.index]
    if (!q) { this.complete(); return }

    // Skip pre-filled questions silently — answer already in this.answers
    if (PREFILL_IDS.has(q.id) && this.answers[q.id] !== undefined) {
      this.index++
      this.showQuestion()
      return
    }

    this.setProgress(this.index / this.questions.length)
    this.setBack(this.index > 0 ? () => { this.index--; this.showQuestion() } : null)

    const container = document.createElement('div')

    // Show prefill badge on the first non-skipped question
    if (this.prefillCount > 0 && this.index === this.firstNonPrefillIndex()) {
      const badge = document.createElement('div')
      badge.className = 'hlw-prefill-badge'
      badge.textContent = `✦ ${this.prefillCount} question${this.prefillCount !== 1 ? 's' : ''} pre-filled from your previous profile`
      container.appendChild(badge)
    }

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

  private firstNonPrefillIndex(): number {
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i]!
      if (!PREFILL_IDS.has(q.id) || this.answers[q.id] === undefined) return i
    }
    return 0
  }

  private async complete() {
    this.renderLoading('Building your routine…', 'Claude is analysing your profile and selecting products just for you.')
    try {
      await this.api.saveAnswers(this.sessionId, this.answers)
      await this.api.completeSession(this.sessionId)
      // Save brand-agnostic answers back to the consumer's platform profile (non-blocking)
      this.api.saveConsumerAnswers(this.answers).catch(() => {})
      await this.pollRoutine()
    } catch {
      this.renderError('Something went wrong', 'Your profile was saved. Try reopening the widget.')
    }
  }

  private async pollRoutine() {
    const selectedAreas = this.answers['__area_select'] as string[] | undefined
    const expectedCount = selectedAreas?.length ?? 1
    const maxAttempts = 30

    for (let i = 0; i < maxAttempts; i++) {
      await sleep(2000)
      const routines = await this.api.getRoutines()
      if (routines.length >= expectedCount) { this.renderRoutines(routines); return }
      // Show partial result if at least one area ready and we've waited a while
      if (routines.length > 0 && i > 5) { this.renderRoutines(routines); return }
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

  private renderRoutines(routines: Routine[]) {
    this.setProgress(1); this.setBack(null)

    const el = document.createElement('div')
    el.className = 'hlw-routine'

    const header = document.createElement('div')
    header.className = 'hlw-routine-header'
    const totalSteps = routines.reduce((n, r) => n + r.steps.length, 0)
    header.innerHTML = `<p class="hlw-routine-title">Your Personalised Routine</p>`
    el.appendChild(header)

    // Area tabs — only shown when more than one area
    if (routines.length > 1) {
      const tabs = document.createElement('div')
      tabs.className = 'hlw-area-tabs'
      const panels: HTMLElement[] = []

      routines.forEach((routine, i) => {
        const areaLabel = fmt(routine.focusArea)
        const tab = document.createElement('button')
        tab.className = 'hlw-area-tab' + (i === 0 ? ' active' : '')
        tab.textContent = areaLabel
        tab.addEventListener('click', () => {
          tabs.querySelectorAll('.hlw-area-tab').forEach(t => t.classList.remove('active'))
          tab.classList.add('active')
          panels.forEach((p, j) => { p.style.display = j === i ? 'block' : 'none' })
        })
        tabs.appendChild(tab)

        const panel = document.createElement('div')
        panel.className = 'hlw-area-panel'
        panel.style.display = i === 0 ? 'block' : 'none'
        buildRoutineSteps(routine, panel)
        panels.push(panel)
      })

      el.appendChild(tabs)
      panels.forEach(p => el.appendChild(p))
    } else if (routines.length === 1) {
      const sub = document.createElement('p')
      sub.className = 'hlw-routine-sub'
      sub.textContent = `${totalSteps} step${totalSteps !== 1 ? 's' : ''} · ${fmt(routines[0]!.focusArea)} routine`
      header.appendChild(sub)
      buildRoutineSteps(routines[0]!, el)
    }

    this.render(el)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buildRoutineSteps(routine: Routine, container: HTMLElement) {
  const grouped: Record<string, typeof routine.steps> = {}
  for (const step of routine.steps) {
    const key = step.timeOfDay
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(step)
  }

  const timeOrder = ['AM', 'PM', 'DAILY', 'WASH_DAY', 'BETWEEN_WASH', 'WEEKLY', 'AS_NEEDED']
  const sortedKeys = Object.keys(grouped).sort(
    (a, b) => (timeOrder.indexOf(a) === -1 ? 99 : timeOrder.indexOf(a)) - (timeOrder.indexOf(b) === -1 ? 99 : timeOrder.indexOf(b))
  )

  for (const timeKey of sortedKeys) {
    const group = document.createElement('div')
    group.className = 'hlw-time-group'

    const label = document.createElement('p')
    label.className = 'hlw-time-label'
    label.textContent = TIME_LABELS[timeKey] ?? fmt(timeKey)
    group.appendChild(label)

    for (const step of grouped[timeKey]!) {
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

    container.appendChild(group)
  }
}
