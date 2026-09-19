// Small UI vignettes that sit above each numbered step, so "Build / Access /
// Personalize" is shown rather than only asserted. Each one is a fragment of a
// real screen at roughly card scale — deliberately not a full interface, since
// the point is to recognise the moment, not to read it.
//
// All of them render at a fixed height so a row of steps lines up no matter how
// much is inside any one mockup.

const FRAME = 'w-full rounded-2xl overflow-hidden flex flex-col'
const HEIGHT = 196

function Label({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className="text-[9px] font-bold tracking-[0.16em] uppercase"
      style={{ color: onDark ? 'rgba(250,246,240,0.5)' : '#8B6575' }}
    >
      {children}
    </p>
  )
}

function Tick({ color = '#2D7A3A' }: { color?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  )
}

/* ── Halite, step 01: the shopper builds it in Hallie ────────────────────── */
export function BuildMockup() {
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #F2EBE0' }}>
        <span className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'conic-gradient(from 210deg, #D7BD96, #A07D52, #604134, #D7BD96)' }} />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: '#1A0A12' }}>Jamie&rsquo;s profile</p>
          <p className="text-[10px] leading-tight" style={{ color: '#8B6575' }}>Built in Hallie · 38 days logged</p>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        <Label>What they told Hallie</Label>
        <div className="flex flex-wrap gap-1.5">
          {['Dark marks', 'Combination', 'Reacts easily', 'Under $50'].map(t => (
            <span key={t} className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(193,122,71,0.14)', color: '#450F2A' }}>
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <Label>On the shelf</Label>
          <div className="flex gap-1.5 ml-auto">
            {['#E8C99A', '#E2D6CC', '#DEC3CA'].map(c => (
              <span key={c} className="w-6 h-8 rounded-[3px]" style={{ background: c }} />
            ))}
            <span className="w-6 h-8 rounded-[3px] flex items-center justify-center text-[9.5px] font-bold" style={{ background: '#F2EBE0', color: '#8B6575' }}>+9</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Halite, step 02: one tap on the brand's own site ────────────────────── */
export function AccessMockup() {
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#450F2A', border: '1px solid #5C2340' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(250,246,240,0.1)' }}>
        <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#C17A47' }}>
          <span className="font-display text-[10px] leading-none text-white">H</span>
        </span>
        <p className="text-[11.5px] font-semibold" style={{ color: '#FAF6F0' }}>Connect your Hallie profile</p>
      </div>

      <div className="px-4 py-3.5 flex flex-col gap-2 flex-1">
        <Label onDark>Nubian will see</Label>
        <div className="flex flex-col gap-1.5">
          {['Your skincare & body answers', 'Nothing from hair, makeup or fragrance'].map(t => (
            <span key={t} className="flex items-start gap-2 text-[11px] leading-snug" style={{ color: 'rgba(250,246,240,0.75)' }}>
              <Tick color="#C17A47" />
              {t}
            </span>
          ))}
        </div>

        <div className="flex gap-2 mt-auto">
          <span className="flex-1 h-9 rounded-[9px] flex items-center justify-center text-[12px] font-semibold" style={{ background: '#C17A47', color: '#2A1206' }}>
            Connect
          </span>
          <span className="h-9 px-4 rounded-[9px] flex items-center justify-center text-[12px] font-semibold" style={{ border: '1px solid rgba(250,246,240,0.25)', color: 'rgba(250,246,240,0.7)' }}>
            Not now
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Halite, step 03: the catalog comes back ranked ──────────────────────── */
export function PersonalizeMockup() {
  const rows = [
    { name: 'Even Tone Serum', pct: 94, lead: true },
    { name: 'Glycerin Lotion', pct: 88 },
    { name: 'Shea Body Cream', pct: 76 },
    { name: 'Glycolic Peel 15%', pct: 31 },
  ]
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="px-4 pt-4 pb-2.5">
        <Label>Your catalog, ranked</Label>
      </div>
      <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1 justify-center">
        {rows.map(r => (
          <div key={r.name}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] font-semibold truncate pr-2" style={{ color: r.pct < 50 ? '#8B6575' : '#1A0A12' }}>{r.name}</span>
              <span className="text-[10.5px] font-bold flex-shrink-0" style={{ color: r.lead ? '#450F2A' : '#8B6575' }}>{r.pct}%</span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#F2EBE0' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${r.pct}%`, background: r.lead ? 'linear-gradient(90deg, #450F2A, #C17A47)' : '#D9C6B4' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Hallie, card 01: snap the bottle, she reads the label ───────────────── */
export function ShelfMockup() {
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
        <div className="w-[62px] h-[86px] rounded-lg flex items-end justify-center flex-shrink-0 pb-2" style={{ background: 'linear-gradient(160deg, #FBF2E6, #F3E6D4)' }}>
          <svg viewBox="0 0 100 150" width="34" height="51" aria-hidden="true">
            <rect x="42" y="4" width="16" height="19" rx="7" fill="#3B2418" />
            <rect x="36" y="22" width="28" height="9" rx="2.5" fill="#2D0A1C" />
            <rect x="22" y="33" width="56" height="107" rx="11" fill="#E8C99A" />
            <rect x="29" y="64" width="42" height="50" rx="4" fill="#FAF6F0" />
            <rect x="35" y="76" width="30" height="3" rx="1.5" fill="#450F2A" />
            <rect x="35" y="85" width="20" height="2.5" rx="1.25" fill="#C17A47" />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <Label>Read off the label</Label>
          {[
            { k: 'Brand', v: 'Nubian' },
            { k: 'Product', v: 'Even Tone Serum' },
            { k: 'Size', v: '30ml' },
          ].map(f => (
            <div key={f.k} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#F8F3EE' }}>
              <span className="text-[9.5px] uppercase tracking-wide font-bold flex-shrink-0" style={{ color: '#8B6575' }}>{f.k}</span>
              <span className="text-[11px] font-semibold truncate ml-auto" style={{ color: '#1A0A12' }}>{f.v}</span>
              <Tick />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Hallie, card 02: the daily log ──────────────────────────────────────── */
export function LogMockup() {
  const rows = [
    { name: 'Even Tone Serum', done: true },
    { name: 'Glycerin Lotion', done: true },
    { name: 'SPF 50 Fluid', done: false },
  ]
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="px-4 pt-4 pb-2.5 flex items-center justify-between">
        <Label>Tonight</Label>
        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(193,122,71,0.16)', color: '#A85B2A' }}>+15 pts</span>
      </div>
      <div className="px-4 pb-4 flex flex-col gap-2 flex-1">
        {rows.map(r => (
          <div key={r.name} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: r.done ? '#F8F3EE' : '#FFFFFF', border: r.done ? '1px solid #EFE3D6' : '1px dashed #E8DDD0' }}>
            <span
              className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0"
              style={r.done ? { background: '#450F2A' } : { border: '1.5px solid #D9CFC4' }}
            >
              {r.done && <Tick color="#FAF6F0" />}
            </span>
            <span className="text-[11px] font-semibold truncate" style={{ color: r.done ? '#1A0A12' : '#8B6575' }}>{r.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-auto">
          <Label>How did it go</Label>
          <span className="flex gap-1 ml-auto">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i <= 4 ? '#C17A47' : '#E8DDD0' }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Hallie, card 03: she answers off the profile ────────────────────────── */
export function AskMockup() {
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="px-4 py-4 flex flex-col gap-2.5 flex-1">
        <div className="self-end max-w-[85%] rounded-2xl rounded-br-md px-3 py-2" style={{ background: '#450F2A' }}>
          <p className="text-[11px] leading-snug" style={{ color: '#FAF6F0' }}>What should I use tonight?</p>
        </div>
        <div className="flex gap-2 items-start">
          <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#C17A47' }}>
            <span className="font-display text-[10px] leading-none text-white">H</span>
          </span>
          <div className="rounded-2xl rounded-bl-md px-3 py-2" style={{ background: '#F8F3EE' }}>
            <p className="text-[11px] leading-snug" style={{ color: '#4A2A38' }}>
              Skip the serum — you flagged stinging on Tuesday. Cleanse, then the glycerin lotion.
            </p>
          </div>
        </div>
        <p className="text-[9.5px] mt-auto" style={{ color: '#C4B5BD' }}>Read your profile, 4 products and 38 logs first</p>
      </div>
    </div>
  )
}

/* ── Hallie, card 04: the quiz, the part that travels ────────────────────── */
export function QuizMockup() {
  const TONES = ['#F9E8D0', '#E8C99A', '#D9AE7E', '#C8976A', '#A0693A', '#7A4228', '#5C2E1C', '#4A2015']
  return (
    <div className={FRAME} style={{ height: HEIGHT, background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
      <div className="px-4 pt-4 pb-2.5 flex items-center justify-between">
        <Label>Skin quiz · 4 of 5</Label>
        <span className="text-[9.5px] font-semibold" style={{ color: '#8B6575' }}>Travels with you</span>
      </div>
      <div className="px-4 pb-4 flex flex-col gap-3 flex-1">
        <div className="h-[4px] rounded-full" style={{ background: '#F2EBE0' }}>
          <div className="h-full rounded-full" style={{ width: '80%', background: '#C17A47' }} />
        </div>
        <p className="text-[12px] font-semibold leading-snug" style={{ color: '#1A0A12' }}>Which tone is closest to yours?</p>
        <div className="flex gap-1.5">
          {TONES.map((c, i) => (
            <span
              key={c}
              className="flex-1 h-9 rounded-md"
              style={{ background: c, outline: i === 5 ? '2.5px solid #450F2A' : 'none', outlineOffset: 2 }}
            />
          ))}
        </div>
        <p className="text-[10px] mt-auto" style={{ color: '#8B6575' }}>Monk tone 06 · selected</p>
      </div>
    </div>
  )
}
