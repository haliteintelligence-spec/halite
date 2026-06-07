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
    el.appendChild(errMsg)

    function isValidEmail(v: string) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
    }
    function isValidPhone(v: string) {
      const digits = v.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15 && /^[\+\d\s\-\(\)]+$/.test(v)
    }

    emailInput.addEventListener('blur', () => {
      const v = emailInput.value.trim()
      if (v && !isValidEmail(v)) {
        errMsg.textContent = 'Please enter a valid email address.'
        errMsg.style.display = 'block'
      } else if (errMsg.textContent?.includes('email')) {
        errMsg.style.display = 'none'
      }
    })
    phoneInput.addEventListener('blur', () => {
      const v = phoneInput.value.trim()
      if (v && !isValidPhone(v)) {
        errMsg.textContent = 'Please enter a valid phone number (e.g. +1 555 000 0000).'
        errMsg.style.display = 'block'
      } else if (errMsg.textContent?.includes('phone')) {
        errMsg.style.display = 'none'
      }
    })

    const nextBtn = document.createElement('button')
    nextBtn.className = 'hlw-btn-next'
    nextBtn.textContent = 'Continue'
    nextBtn.disabled = false

    nextBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim()
      const phone = phoneInput.value.trim()

      if (!email && !phone) {
        errMsg.textContent = 'Please enter an email address or phone number to continue.'
        errMsg.style.display = 'block'
        return
      }
      if (email && !isValidEmail(email)) {
        errMsg.textContent = 'Please enter a valid email address.'
        errMsg.style.display = 'block'
        return
      }
      if (phone && !isValidPhone(phone)) {
        errMsg.textContent = 'Please enter a valid phone number (e.g. +1 555 000 0000).'
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
    if (!q) { this.showNameCapture(); return }

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
    // Hoisted here to avoid "used before declaration" errors in the if/else blocks below
    const nextBtn = document.createElement('button')

    const onNext = () => {
      if (!isValid()) return
      const val = getValue()
      this.answers[q.id] = val
      this.scheduleSave()
      this.index++
      this.showQuestion()
    }

    if (q.type === 'single' && q.options) {
      let selected = ''

      if (q.options[0]?.swatchColor) {
        // Swatch grid for skin tone questions
        const grid = document.createElement('div')
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:8px;'

        const preview = document.createElement('div')
        preview.style.cssText = 'display:none;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1.5px solid #f09118;background:#fef9ee;margin-top:10px;'

        q.options.forEach(opt => {
          const cell = document.createElement('button')
          cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:0;'

          const circle = document.createElement('span')
          circle.style.cssText = `width:36px;height:36px;border-radius:50%;display:block;background:${opt.swatchColor};box-shadow:0 0 0 1.5px rgba(0,0,0,0.08);transition:box-shadow 0.15s,transform 0.15s;`

          const num = document.createElement('span')
          num.style.cssText = 'font-size:9px;font-weight:500;color:#aaa;'
          num.textContent = opt.value

          cell.appendChild(circle)
          cell.appendChild(num)

          cell.addEventListener('click', () => {
            // Reset all circles
            grid.querySelectorAll('span[data-swatch]').forEach((s) => {
              const el = s as HTMLSpanElement
              el.style.boxShadow = '0 0 0 1.5px rgba(0,0,0,0.08)'
              el.style.transform = 'scale(1)'
            })
            num.style.color = '#333'
            circle.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${opt.swatchColor}`
            circle.style.transform = 'scale(1.12)'
            selected = opt.value
            nextBtn.disabled = false

            // Update preview
            preview.style.display = 'flex'
            preview.innerHTML = `<span style="width:20px;height:20px;border-radius:50%;background:${opt.swatchColor};flex-shrink:0;display:inline-block;"></span><div><p style="font-size:12px;font-weight:600;color:#1a1a1a;margin:0;">${opt.label}</p><p style="font-size:11px;color:#888;margin:0;">${opt.description ?? ''}</p></div>`
          })

          circle.setAttribute('data-swatch', opt.value)
          grid.appendChild(cell)
        })

        container.appendChild(grid)
        container.appendChild(preview)
      } else {
        const opts = document.createElement('div')
        opts.className = 'hlw-options'

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
      }

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

    } else if (q.type === 'date') {
      const input = document.createElement('input')
      input.type = 'date'
      input.className = 'hlw-text-input'
      // Prevent future dates
      input.max = new Date().toISOString().split('T')[0]!
      container.appendChild(input)
      // Optional question — next is always enabled
      getValue = () => input.value || null
      isValid = () => true

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

    // Configure and wire up the next button (declared above the if/else blocks)
    nextBtn.className = 'hlw-btn-next'
    nextBtn.textContent = this.index === this.questions.length - 1 ? 'Get My Routine' : 'Continue'
    nextBtn.disabled = !['scale', 'date'].includes(q.type)
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

  private showNameCapture() {
    this.setProgress(1)
    this.setBack(() => { this.index = Math.max(0, this.index - 1); this.showQuestion() })

    const el = document.createElement('div')

    const title = document.createElement('p')
    title.className = 'hlw-question-text'
    title.textContent = 'Almost done — what\'s your name?'
    el.appendChild(title)

    const sub = document.createElement('p')
    sub.className = 'hlw-question-sub'
    sub.textContent = "We'll use this to personalise your routine."
    el.appendChild(sub)

    const nameRow = document.createElement('div')
    nameRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;'

    const firstInput = document.createElement('input')
    firstInput.type = 'text'
    firstInput.className = 'hlw-text-input'
    firstInput.placeholder = 'First name'
    firstInput.style.flex = '1'
    firstInput.autofocus = true

    const lastInput = document.createElement('input')
    lastInput.type = 'text'
    lastInput.className = 'hlw-text-input'
    lastInput.placeholder = 'Last name'
    lastInput.style.flex = '1'

    nameRow.appendChild(firstInput)
    nameRow.appendChild(lastInput)
    el.appendChild(nameRow)

    const errMsg = document.createElement('p')
    errMsg.style.cssText = 'font-size:11px;color:#e57373;margin-top:8px;display:none;'
    errMsg.textContent = 'Please enter your first name to continue.'
    el.appendChild(errMsg)

    const nextBtn = document.createElement('button')
    nextBtn.className = 'hlw-btn-next'
    nextBtn.textContent = 'Get My Routine'
    nextBtn.disabled = true

    firstInput.addEventListener('input', () => {
      nextBtn.disabled = !firstInput.value.trim()
    })

    const submit = () => {
      const firstName = firstInput.value.trim()
      if (!firstName) { errMsg.style.display = 'block'; return }
      errMsg.style.display = 'none'
      nextBtn.disabled = true
      nextBtn.textContent = 'Building…'
      const lastName = lastInput.value.trim() || undefined
      this.api.saveEndUserName(firstName, lastName).catch(() => {})
      this.complete()
    }

    nextBtn.addEventListener('click', submit)
    firstInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && firstInput.value.trim()) submit() })

    ;(el as HTMLElement & { _nextBtn?: HTMLButtonElement })._nextBtn = nextBtn
    this.render(el)
  }

  private async complete() {
    this.renderLoading('Building your routine…', 'Our AI is analysing your profile and selecting products just for you.')
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

    const isDemo = this.api.isDemo
    const shopifyShop = this.api.shopifyShop
    const api = this.api

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
        buildRoutineSteps(routine, panel, { isDemo, shopifyShop, api })
        panels.push(panel)
      })

      el.appendChild(tabs)
      panels.forEach(p => el.appendChild(p))
    } else if (routines.length === 1) {
      const sub = document.createElement('p')
      sub.className = 'hlw-routine-sub'
      sub.textContent = `${totalSteps} step${totalSteps !== 1 ? 's' : ''} · ${fmt(routines[0]!.focusArea)} routine`
      header.appendChild(sub)
      buildRoutineSteps(routines[0]!, el, { isDemo, shopifyShop, api })
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

interface BrandConfig {
  isDemo: boolean
  shopifyShop: string | null
  api: import('./api').HaliteApi
}

function buildRoutineSteps(routine: Routine, container: HTMLElement, config: BrandConfig) {
  const { isDemo, shopifyShop, api } = config

  // Deduplicated product list for the shop section (one per product ID)
  const uniqueProducts = Array.from(
    routine.steps.reduce<Map<string, typeof routine.steps[0]>>(
      (map, step) => { if (!map.has(step.product.id)) map.set(step.product.id, step); return map },
      new Map()
    ).values()
  )

  // Track which products are checked (all auto-checked)
  const checkedIds = new Set(uniqueProducts.map(s => s.product.id))

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

  // "Shop your routine" section with checkboxes + "Add to cart" button
  const shopSection = document.createElement('div')
  shopSection.className = 'hlw-shop-section'
  shopSection.style.cssText = 'margin-top:16px;padding:16px;border-radius:12px;background:var(--hlw-surface,#f9f5f0);'

  const shopLabel = document.createElement('p')
  shopLabel.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.5;margin-bottom:12px;'
  shopLabel.textContent = 'Shop your routine'
  shopSection.appendChild(shopLabel)

  // Checkbox list
  const checkList = document.createElement('div')
  checkList.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:14px;'

  for (const step of uniqueProducts) {
    const row = document.createElement('label')
    row.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer;'

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = true
    cb.style.cssText = 'width:16px;height:16px;flex-shrink:0;cursor:pointer;'
    cb.addEventListener('change', () => {
      if (cb.checked) checkedIds.add(step.product.id)
      else checkedIds.delete(step.product.id)
      updateCartBtn()
    })

    const info = document.createElement('div')
    info.style.cssText = 'flex:1;min-width:0;'
    info.innerHTML = `<p style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${step.product.name}</p>` +
      (step.product.price > 0 ? `<p style="font-size:11px;opacity:.5;">${step.product.currency} ${step.product.price.toFixed(2)}</p>` : '')

    row.appendChild(cb)
    row.appendChild(info)
    checkList.appendChild(row)
  }
  shopSection.appendChild(checkList)

  // "Add to cart" button
  const btn = document.createElement('button')
  btn.className = 'hlw-add-all-btn'

  function updateCartBtn() {
    btn.textContent = `Add to cart (${checkedIds.size})`
    btn.disabled = checkedIds.size === 0
  }
  updateCartBtn()

  btn.addEventListener('click', async () => {
    if (checkedIds.size === 0) return
    btn.disabled = true
    btn.textContent = 'Adding…'

    const selectedIds = Array.from(checkedIds)
    await api.recordCartIntent(selectedIds)

    if (!isDemo) {
      const selectedSteps = uniqueProducts.filter(s => checkedIds.has(s.product.id))
      const variantSteps = selectedSteps.filter(s => s.product.shopifyVariantId)
      if (variantSteps.length > 0) {
        try {
          await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: variantSteps.map(s => ({ id: s.product.shopifyVariantId, quantity: 1 })) }),
          })
        } catch { /* non-fatal */ }
      } else if (shopifyShop) {
        selectedSteps
          .filter(s => s.product.productUrl)
          .forEach(s => window.open(s.product.productUrl!, '_blank', 'noopener,noreferrer'))
      }
    }

    btn.textContent = '✓ Added to cart'
  })

  shopSection.appendChild(btn)
  container.appendChild(shopSection)
}
