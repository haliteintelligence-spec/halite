import Image from 'next/image'
import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'

const PHOTOS = {
  routine:   'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85',
  tracking:  'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=900&q=85',
  dashboard: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85',
  widget:    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=900&q=85',
  inclusion: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=85',
}

const PLATFORM_MODULES = [
  { id: 'routine-engine',   label: 'Routine Engine' },
  { id: 'outcome-tracker',  label: 'Outcome Tracker' },
  { id: 'brand-dashboard',  label: 'Brand Dashboard' },
  { id: 'widget',           label: 'Embedded Widget' },
]

export const metadata = {
  title: 'Platform — Halite Intelligence',
  description: 'Routine Engine, Outcome Tracker, Brand Dashboard, and Embedded Widget — the complete Halite Intelligence platform.',
}

export default function Platform() {
  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-20 px-6 overflow-hidden"
        style={{ background: '#450F2A' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <a href="/" className="text-[12px] transition-opacity hover:opacity-70" style={{ color: 'rgba(250,246,240,0.45)' }}>
              Home
            </a>
            <span style={{ color: 'rgba(250,246,240,0.25)' }}>→</span>
            <span className="text-[12px]" style={{ color: 'rgba(250,246,240,0.7)' }}>Platform</span>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-5" style={{ color: 'rgba(193,122,71,0.9)' }}>
            The Platform
          </p>
          <h1 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05] mb-6" style={{ color: '#FAF6F0' }}>
            Every layer of consumer intelligence,<br />
            <span style={{ color: '#C17A47' }}>connected end-to-end.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.65)' }}>
            Four integrated modules. One continuous intelligence loop — from first quiz answer to long-term retention signal.
          </p>

          {/* Module jump links */}
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORM_MODULES.map(m => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.2)', color: '#FAF6F0' }}
              >
                {m.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW THE MODULES CONNECT ───────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch gap-0 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(250,246,240,0.08)' }}>
            {[
              { n: '01', label: 'Widget', sublabel: 'Captures data', icon: '◈', color: '#C17A47' },
              { n: '02', label: 'Routine Engine', sublabel: 'Generates recs', icon: '✦', color: '#C17A47' },
              { n: '03', label: 'Outcome Tracker', sublabel: 'Measures results', icon: '◉', color: '#C17A47' },
              { n: '04', label: 'Brand Dashboard', sublabel: 'Surfaces intelligence', icon: '▲', color: '#C17A47' },
            ].map((step, i) => (
              <div
                key={step.n}
                className="flex-1 p-6 flex flex-col gap-3"
                style={{
                  background: 'rgba(250,246,240,0.04)',
                  borderRight: i < 3 ? '1px solid rgba(250,246,240,0.08)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg" style={{ color: step.color }}>{step.icon}</span>
                  <span className="font-display text-[11px] font-semibold" style={{ color: 'rgba(193,122,71,0.6)' }}>{step.n}</span>
                </div>
                <p className="font-display text-base font-semibold" style={{ color: '#FAF6F0' }}>{step.label}</p>
                <p className="text-[12px]" style={{ color: 'rgba(250,246,240,0.4)' }}>{step.sublabel}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] mt-5" style={{ color: 'rgba(250,246,240,0.3)' }}>
            Each module feeds the next. Data compounds with every consumer interaction.
          </p>
        </div>
      </section>

      {/* ── ROUTINE ENGINE ────────────────────────────────────────────────── */}
      <section id="routine-engine" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex items-start gap-6 mb-16">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{ background: 'rgba(69,15,42,0.08)' }}
            >
              <span className="text-lg" style={{ color: '#450F2A' }}>✦</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: '#C17A47' }}>
                Module 01
              </p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
                Routine Engine
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: '#8B6575' }}>
                The brain behind your personalization. Claude generates bespoke regimens from your product catalogue — inclusive by design, ingredient-matched, and updated as the consumer's skin evolves.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.routine} alt="Routine Engine" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.12)' }} />
              {/* Overlay: routine card mock */}
              <div
                className="absolute bottom-6 left-6 right-6 rounded-2xl p-5"
                style={{ background: 'rgba(250,246,240,0.97)', backdropFilter: 'blur(12px)' }}
              >
                <p className="text-[10px] font-semibold tracking-wide uppercase mb-3" style={{ color: '#8B6575' }}>Generated routine — Tone 08, Dry + Hyperpigmentation</p>
                <div className="space-y-2">
                  {[
                    { step: 'AM Cleanser', product: 'Gentle Milk Cleanser', match: '98%' },
                    { step: 'Serum',       product: 'Niacinamide 10% Serum', match: '95%' },
                    { step: 'Moisturizer', product: 'Barrier Repair Cream',  match: '97%' },
                  ].map(r => (
                    <div key={r.step} className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold" style={{ color: '#8B6575' }}>{r.step}</p>
                        <p className="text-[12px] font-medium" style={{ color: '#1A0A12' }}>{r.product}</p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(69,15,42,0.08)', color: '#450F2A' }}>
                        {r.match} match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: 'Catalogue-native recommendations',
                  body: 'Every routine is built exclusively from your product catalogue — no generic picks, no competitor references. The AI learns your formulations and matches them to the right consumer profile.',
                },
                {
                  title: 'Monk Skin Tone Scale-aware',
                  body: 'All 10 Monk Skin Tone Scale tones are fully supported. Ingredient recommendations, formulation flags, and concern mapping are all calibrated per tone — because personalization has to be accurate for everyone.',
                },
                {
                  title: 'Multi-signal matching',
                  body: 'Skin type, primary concerns, climate zone, known sensitivities, budget range, and routine experience level all feed the recommendation. The more signals, the better the match.',
                },
                {
                  title: 'Routine refinement loop',
                  body: 'As a consumer\'s check-in data accumulates, their routine is automatically refined — swapping underperforming products, adjusting steps based on skin response, and escalating or de-escalating actives.',
                },
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-1 flex-shrink-0 rounded-full mt-1" style={{ background: '#450F2A', minHeight: 20 }} />
                  <div>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: '#1A0A12' }}>{item.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#8B6575' }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Routine Engine stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '<2 min', label: 'Quiz to first routine' },
              { n: '94%',   label: 'Consumer match accuracy' },
              { n: '100%',  label: 'Catalogue-native picks' },
              { n: '10',    label: 'Monk Skin Tone tones supported' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#450F2A' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#8B6575' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUTCOME TRACKER ───────────────────────────────────────────────── */}
      <section id="outcome-tracker" className="py-24 px-6" style={{ background: '#1A0A12' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{ background: 'rgba(193,122,71,0.15)' }}
            >
              <span className="text-lg" style={{ color: '#C17A47' }}>◉</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: '#C17A47' }}>
                Module 02
              </p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#FAF6F0' }}>
                Outcome Tracker
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: 'rgba(250,246,240,0.6)' }}>
                The real-world feedback loop. Weekly consumer check-ins capture skin progress, product reactions, and compliance — turning anecdotal results into structured, brand-level intelligence.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-5">
              {[
                {
                  icon: '◎',
                  title: 'Weekly skin check-ins',
                  body: 'Consumers rate their skin weekly across key dimensions — hydration, clarity, texture, and concern-specific metrics. Each response updates their profile and aggregates into your brand analytics.',
                },
                {
                  icon: '⬡',
                  title: 'Per-product reaction logging',
                  body: 'Good reactions and bad ones. Consumers log what worked and what didn\'t at the product level. This feeds your ingredient lab and future recommendation calibration.',
                },
                {
                  icon: '◈',
                  title: 'Compliance tracking',
                  body: 'Routine adherence is tracked automatically. Drops in compliance are a leading signal for churn — Halite surfaces them before they become cancellations.',
                },
                {
                  icon: '▲',
                  title: 'Skin progression narratives',
                  body: 'Halite generates an AI-written skin progress summary for each consumer — visible in the widget. They see their journey; you see the structured trend data behind it.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="flex gap-4 p-5 rounded-2xl"
                  style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(193,122,71,0.12)', color: '#C17A47' }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: '#FAF6F0' }}>{item.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.55)' }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.tracking} alt="Outcome tracking" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(26,10,18,0.5)' }} />
              {/* Check-in mock overlay */}
              <div
                className="absolute inset-6 rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: 'rgba(26,10,18,0.88)', border: '1px solid rgba(250,246,240,0.1)' }}
              >
                <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'rgba(193,122,71,0.8)' }}>Week 6 check-in</p>
                <div className="space-y-3">
                  {[
                    { label: 'Hydration', score: 8, prev: 5 },
                    { label: 'Clarity',   score: 7, prev: 4 },
                    { label: 'Texture',   score: 9, prev: 6 },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[12px] font-medium" style={{ color: 'rgba(250,246,240,0.7)' }}>{m.label}</span>
                        <span className="text-[12px] font-semibold" style={{ color: '#C17A47' }}>
                          {m.score}/10 <span className="text-[10px] font-normal" style={{ color: 'rgba(250,246,240,0.35)' }}>(was {m.prev})</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(250,246,240,0.1)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${m.score * 10}%`, background: 'linear-gradient(to right, #C17A47, #e8a870)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-xl p-3" style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.2)' }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.7)' }}>
                    "Your skin's hydration has improved significantly over the last 4 weeks. The Barrier Repair Cream appears to be driving the strongest response."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Outcome Tracker stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '83%',  label: 'Average routine compliance rate' },
              { n: 'Wk 1', label: 'When first outcome data appears' },
              { n: '↑64%', label: 'Skin score improvement avg, 8 weeks' },
              { n: '3×',   label: 'More reorder conversion with check-ins' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#C17A47' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAND DASHBOARD ───────────────────────────────────────────────── */}
      <section id="brand-dashboard" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{ background: 'rgba(69,15,42,0.08)' }}
            >
              <span className="text-lg" style={{ color: '#450F2A' }}>▲</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: '#C17A47' }}>
                Module 03
              </p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
                Brand Dashboard
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: '#8B6575' }}>
                Your aggregated intelligence layer. Every routine, check-in, and reaction feeds into a brand-level view of who your consumers are, what their skin needs, and what's actually working.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.dashboard} alt="Brand Dashboard" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.25)' }} />
              {/* Dashboard mock overlay */}
              <div
                className="absolute inset-4 rounded-2xl p-5 grid grid-cols-2 gap-3"
                style={{ background: 'rgba(250,246,240,0.97)', backdropFilter: 'blur(12px)' }}
              >
                {[
                  { label: 'Active consumers', value: '4,218', delta: '+12%', up: true },
                  { label: 'Avg skin score', value: '7.4 / 10', delta: '+0.8', up: true },
                  { label: 'Top concern', value: 'Dryness', delta: '38% of base', up: null },
                  { label: 'Churn risk', value: '6.2%', delta: '-1.4%', up: false },
                ].map(card => (
                  <div key={card.label} className="rounded-xl p-3" style={{ background: '#F2EBE0' }}>
                    <p className="text-[9px] font-semibold tracking-wide uppercase mb-1" style={{ color: '#8B6575' }}>{card.label}</p>
                    <p className="font-display text-lg font-semibold" style={{ color: '#1A0A12' }}>{card.value}</p>
                    {card.delta && (
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: card.up === true ? '#2D7A3A' : card.up === false ? '#C17A47' : '#8B6575' }}>
                        {card.up === true ? '↑' : card.up === false ? '↓' : ''} {card.delta}
                      </p>
                    )}
                  </div>
                ))}
                {/* Mini bar chart */}
                <div className="col-span-2 rounded-xl p-3" style={{ background: '#F2EBE0' }}>
                  <p className="text-[9px] font-semibold tracking-wide uppercase mb-2" style={{ color: '#8B6575' }}>Top skin concerns by tone group</p>
                  <div className="flex items-end gap-1.5 h-10">
                    {[62, 45, 38, 71, 55, 48, 65, 52].map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${(v / 71) * 100}%`, background: i === 3 ? '#450F2A' : '#C8B5BD' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {[
                {
                  title: 'Consumer intelligence overview',
                  body: 'Total active consumers, skin score averages, concern distributions, Monk tone breakdowns, and routine compliance — all in one command center. Updated in real time as consumers check in.',
                  tags: ['Active profiles', 'Skin score trends', 'Concern maps', 'Compliance rates'],
                },
                {
                  title: 'Ingredient lab & product performance',
                  body: 'See which active ingredients are driving the strongest outcomes across your consumer base. Identify what\'s working, what\'s causing reactions, and where your formulation gaps are — before a competitor fills them.',
                  tags: ['Ingredient efficacy', 'Reaction flags', 'Formulation gaps', 'Product rankings'],
                },
                {
                  title: 'Retention & churn intelligence',
                  body: 'Compliance drop-offs, declining skin scores, and reduced check-in frequency are early warning signs. Halite surfaces high-risk consumers so your team can re-engage with the right offer before they leave.',
                  tags: ['Churn risk scoring', 'Re-engagement list', 'Compliance alerts', 'Win-back timing'],
                },
                {
                  title: 'Market benchmarking',
                  body: 'Compare your consumer skin concern distribution against anonymized market-level trends. Understand where your product mix is well-matched and where you have white space.',
                  tags: ['Market trends', 'Concern benchmarks', 'Demographic gaps', 'Portfolio fit'],
                },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="font-display text-lg font-semibold mb-2" style={{ color: '#1A0A12' }}>{item.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#8B6575' }}>{item.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '10+',  label: 'Analytics charts, per-brand' },
              { n: 'Live',  label: 'Dashboard refresh cadence' },
              { n: 'CSV',   label: 'Data export for any chart' },
              { n: 'All',   label: 'Monk tones segmented separately' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#450F2A' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#8B6575' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMBEDDED WIDGET ───────────────────────────────────────────────── */}
      <section id="widget" className="py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{ background: 'rgba(193,122,71,0.15)' }}
            >
              <span className="text-lg" style={{ color: '#C17A47' }}>◈</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: '#C17A47' }}>
                Module 04
              </p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#FAF6F0' }}>
                Embedded Widget
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: 'rgba(250,246,240,0.6)' }}>
                One script tag. The consumer-facing layer that makes all of Halite's intelligence visible — without sending your customers anywhere but your own storefront.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            {/* Left: code + capabilities */}
            <div>
              {/* Code block */}
              <div className="rounded-2xl overflow-hidden mb-8">
                <div
                  className="flex items-center gap-2 px-5 py-3"
                  style={{ background: 'rgba(250,246,240,0.06)', borderBottom: '1px solid rgba(250,246,240,0.08)' }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                  <span className="text-[11px] ml-2" style={{ color: 'rgba(250,246,240,0.3)' }}>your-store/theme.liquid</span>
                </div>
                <div
                  className="p-6 font-mono text-[13px] leading-loose overflow-x-auto"
                  style={{ background: 'rgba(250,246,240,0.04)' }}
                >
                  <span style={{ color: 'rgba(250,246,240,0.4)' }}>{'<'}</span>
                  <span style={{ color: '#C17A47' }}>script</span>
                  <br />
                  <span className="ml-4" style={{ color: 'rgba(250,246,240,0.4)' }}> src=</span>
                  <span style={{ color: '#c8e6a0' }}>"https://cdn.haliteintelligence.com/widget.js"</span>
                  <br />
                  <span className="ml-4" style={{ color: 'rgba(250,246,240,0.4)' }}> data-api-key=</span>
                  <span style={{ color: '#c8e6a0' }}>"<span style={{ color: '#f0b27a' }}>your_api_key</span>"</span>
                  <br />
                  <span className="ml-4" style={{ color: 'rgba(250,246,240,0.4)' }}> data-accent=</span>
                  <span style={{ color: '#c8e6a0' }}>"#C17A47"</span>
                  <br />
                  <span className="ml-4" style={{ color: 'rgba(250,246,240,0.4)' }}> data-position=</span>
                  <span style={{ color: '#c8e6a0' }}>"bottom-right"</span>
                  <br />
                  <span style={{ color: 'rgba(250,246,240,0.4)' }}>{'/>'}</span>
                </div>
              </div>

              {/* Compatibility tags */}
              <div className="mb-8">
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-3" style={{ color: 'rgba(250,246,240,0.35)' }}>
                  Works with
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Shopify', 'Webflow', 'WordPress', 'Squarespace', 'Custom React', 'Any HTML'].map(p => (
                    <span
                      key={p}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(250,246,240,0.07)', color: 'rgba(250,246,240,0.65)', border: '1px solid rgba(250,246,240,0.1)' }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shopify callout */}
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.2)' }}
              >
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#C17A47' }}>✦ Shopify native integration</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>
                  Install directly from the Shopify App Store. Automatic product catalogue sync, no manual API key setup, and native checkout integration for reorder prompts.
                </p>
              </div>
            </div>

            {/* Right: widget features */}
            <div className="space-y-4">
              {[
                {
                  icon: '◎',
                  title: 'Skin quiz & routine generation',
                  body: 'Consumers complete a 2-minute skin quiz directly on your storefront. Halite instantly generates a personalized routine from your catalogue, displayed in the widget. Zero redirects.',
                  detail: '2 min quiz · Catalogue-native · Monk Skin Tone-aware',
                },
                {
                  icon: '⬡',
                  title: 'Weekly check-in prompts',
                  body: 'Smart cadence-based nudges prompt returning consumers to log their skin progress. Ratings and reactions are captured and pushed to the Outcome Tracker automatically.',
                  detail: 'Smart timing · No app needed · Feeds outcome data',
                },
                {
                  icon: '◈',
                  title: 'Smart reorder prompts',
                  body: 'Halite calculates each product\'s expected run-rate based on routine steps and compliance frequency, then surfaces a reorder prompt timed to actual usage — not arbitrary 30-day cycles.',
                  detail: 'Usage-based timing · Checkout-integrated · Reduces stockouts',
                },
                {
                  icon: '▲',
                  title: 'Progress view & skin narrative',
                  body: 'Returning consumers see a visual summary of their skin journey — scores over time, milestone alerts, and an AI-generated progress narrative. Drives engagement and reinforces product value.',
                  detail: 'AI-written · Personalised milestones · Drives repeat visits',
                },
                {
                  icon: '✦',
                  title: 'White-label theming',
                  body: 'Fully themeable to match your brand — accent colour, font weight, corner radius, and widget position. Available in all plans. Full white-label (your domain, no Halite branding) on Enterprise.',
                  detail: 'CSS theming · Your brand · No Halite badge on Enterprise',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}
                >
                  <div className="flex gap-4 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(193,122,71,0.12)', color: '#C17A47' }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: '#FAF6F0' }}>{item.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(193,122,71,0.7)' }}>{item.detail}</p>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed ml-13" style={{ color: 'rgba(250,246,240,0.55)', marginLeft: '3.25rem' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Widget stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '5 min', label: 'From signup to live widget' },
              { n: '0',     label: 'Backend setup required' },
              { n: '64%',   label: 'Consumer routine adoption rate' },
              { n: '3×',    label: 'Reorder conversion vs baseline' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#C17A47' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTELLIGENCE LOOP RECAP ───────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
            The intelligence loop
          </p>
          <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
            Every module makes the others smarter.
          </h2>
          <p className="text-base leading-relaxed mb-16 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.6)' }}>
            The widget captures data. The Routine Engine uses it. The Outcome Tracker validates it. The Brand Dashboard compounds it. The longer your brand runs on Halite, the sharper your consumer intelligence becomes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 text-left">
            {[
              { from: 'Widget', to: 'Routine Engine', signal: 'Skin profile data feeds recommendation calibration' },
              { from: 'Outcome Tracker', to: 'Routine Engine', signal: 'Product reactions refine future routine generation' },
              { from: 'Outcome Tracker', to: 'Brand Dashboard', signal: 'Check-in data builds brand-level analytics' },
              { from: 'Brand Dashboard', to: 'Everything', signal: 'Intelligence insights inform catalogue and CRM strategy' },
            ].map((flow, i) => (
              <div
                key={i}
                className="rounded-2xl p-5"
                style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(193,122,71,0.2)', color: '#C17A47' }}>{flow.from}</span>
                  <span style={{ color: 'rgba(250,246,240,0.3)' }}>→</span>
                  <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(250,246,240,0.08)', color: 'rgba(250,246,240,0.7)' }}>{flow.to}</span>
                </div>
                <p className="text-[13px]" style={{ color: 'rgba(250,246,240,0.5)' }}>{flow.signal}</p>
              </div>
            ))}
          </div>

          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#FAF6F0', color: '#450F2A' }}
          >
            See it in action — book a demo
          </a>
        </div>
      </section>

      {/* ── DEMO CTA ─────────────────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Get a demo
            </p>
            <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
              Walk through the platform with your catalogue.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes. We cover all four modules with your actual product catalogue and consumer use case — so you leave with a clear picture of what the intelligence loop looks like for your brand.
            </p>
            <div className="space-y-4">
              {[
                'Live Routine Engine demo with your catalogue',
                'Outcome Tracker and compliance walkthrough',
                'Brand Dashboard analytics preview',
                'Widget integration on your storefront',
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(193,122,71,0.25)' }}>
                    <span className="text-[10px]" style={{ color: '#C17A47' }}>✓</span>
                  </div>
                  <p className="text-[14px]" style={{ color: 'rgba(250,246,240,0.75)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <DemoForm />
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-14 px-6" style={{ background: '#2D0A1C', borderTop: '1px solid rgba(250,246,240,0.08)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-display text-lg font-semibold" style={{ color: '#FAF6F0' }}>Halite</span>
                <span className="text-[10px] font-medium tracking-[0.18em] uppercase mt-0.5" style={{ color: 'rgba(250,246,240,0.4)' }}>Intelligence</span>
              </div>
              <p className="text-[13px] leading-relaxed max-w-xs" style={{ color: 'rgba(250,246,240,0.45)' }}>
                Predictive consumer intelligence for modern beauty brands. Know your customer. Personalize deeper. Retain longer.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: 'rgba(250,246,240,0.3)' }}>
                Platform
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'Routine Engine', href: '#routine-engine' },
                  { label: 'Outcome Tracker', href: '#outcome-tracker' },
                  { label: 'Brand Dashboard', href: '#brand-dashboard' },
                  { label: 'Embeddable Widget', href: '#widget' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: 'rgba(250,246,240,0.3)' }}>
                Company
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'About', href: '#' },
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Contact', href: '#' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(250,246,240,0.08)' }} className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px]" style={{ color: 'rgba(250,246,240,0.3)' }}>
              © 2026 Halite Intelligence. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
