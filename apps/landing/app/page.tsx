import Image from 'next/image'
import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'

const PHOTOS = {
  hero:       'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85',
  routine:    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=85',
  tracking:   'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=85',
  dashboard:  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=85',
  inclusion:  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&q=85',
  data:       'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=85',
}

function Check() {
  return <span className="text-[15px]" style={{ color: '#450F2A' }}>✓</span>
}
function Cross() {
  return <span className="text-[15px]" style={{ color: '#C4B5BD' }}>✕</span>
}
function Partial() {
  return <span className="text-[11px] font-medium" style={{ color: '#8B6575' }}>Partial</span>
}

const COMPARE_ROWS = [
  { feature: 'Predictive consumer intelligence',  halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'Closed-loop outcome tracking',       halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'Brand intelligence dashboard',       halite: 'check', revieve: 'partial', haut: 'cross', proven: 'cross' },
  { feature: 'Retention & churn signals',          halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'Embeddable on any platform',         halite: 'check', revieve: 'partial', haut: 'check', proven: 'cross' },
  { feature: 'Shopify native integration',         halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'Monk Skin Tone-inclusive AI',        halite: 'check', revieve: 'partial', haut: 'check', proven: 'cross' },
  { feature: 'Weekly check-in tracking',           halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'Per-product reaction data',          halite: 'check', revieve: 'cross', haut: 'cross', proven: 'cross' },
  { feature: 'AI routine generation',              halite: 'check', revieve: 'check', haut: 'partial', proven: 'check' },
] as const

type Cell = 'check' | 'cross' | 'partial'
function Cell({ v }: { v: Cell }) {
  if (v === 'check')   return <Check />
  if (v === 'partial') return <Partial />
  return <Cross />
}

const MONK_TONES = [
  { hex: '#f6ede4', label: '01' },
  { hex: '#f3e7db', label: '02' },
  { hex: '#f7ead0', label: '03' },
  { hex: '#eadaba', label: '04' },
  { hex: '#d7bd96', label: '05' },
  { hex: '#a07d52', label: '06' },
  { hex: '#825c43', label: '07' },
  { hex: '#604134', label: '08' },
  { hex: '#3a312a', label: '09' },
  { hex: '#292420', label: '10' },
]

export default function Landing() {
  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: '#450F2A' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-6"
              style={{ color: 'rgba(250,246,240,0.5)' }}
            >
              Predictive Consumer Intelligence
            </p>
            <h1
              className="font-display text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05] mb-6"
              style={{ color: '#FAF6F0' }}
            >
              Know your
              <br />
              customer.
              <br />
              <span style={{ color: '#C17A47' }}>Keep them</span>
              <br />
              longer.
            </h1>
            <p
              className="text-lg leading-relaxed mb-10 max-w-md"
              style={{ color: 'rgba(250,246,240,0.72)' }}
            >
              Halite turns every skin interaction into a signal — building a living consumer profile that gets smarter with every check-in, so your brand can personalize deeper and retain longer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
                style={{ background: '#FAF6F0', color: '#450F2A' }}
              >
                Book a demo
              </a>
              <a
                href="/platform"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.3)', color: '#FAF6F0' }}
              >
                Explore the platform ↗
              </a>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ aspectRatio: '4/5', maxHeight: 580 }}
            >
              <Image
                src={PHOTOS.hero}
                alt="Editorial beauty portrait"
                fill
                sizes="(max-width: 1024px) 0vw, 45vw"
                className="object-cover object-top"
                priority
              />
              <div
                className="absolute inset-x-0 bottom-0 h-32"
                style={{ background: 'linear-gradient(to top, #450F2A, transparent)' }}
              />
            </div>
            {/* Floating stat cards */}
            <div
              className="absolute -bottom-4 -left-6 rounded-2xl px-5 py-4 shadow-xl"
              style={{ background: '#FAF6F0' }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: '#8B6575' }}>
                Avg retention lift
              </p>
              <p className="font-display text-2xl font-semibold" style={{ color: '#450F2A' }}>30%</p>
            </div>
            <div
              className="absolute -top-4 -right-4 rounded-2xl px-5 py-4 shadow-xl"
              style={{ background: '#C17A47' }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1 text-white/70">
                Personalization accuracy
              </p>
              <p className="font-display text-2xl font-semibold text-white">94%</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <section style={{ background: '#FAF6F0', borderBottom: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { n: '30%',    label: 'Increase in customer retention via personalized routines' },
            { n: '15–18%', label: 'Higher conversion driven by predictive AI personalization' },
            { n: '39%',    label: 'Higher basket value from AI-matched recommendations' },
            { n: '50%',    label: 'Reduction in customer acquisition costs over time' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="font-display text-3xl md:text-4xl font-semibold" style={{ color: '#450F2A' }}>
                {item.n}
              </p>
              <p className="text-[12px] mt-2 leading-relaxed" style={{ color: '#8B6575' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE INTELLIGENCE GAP (Problem) ────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              The intelligence gap
            </p>
            <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
              You know what you sold.<br />You don't know your customer.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '◎',
                title: 'Profiles frozen at purchase.',
                body: 'A customer buys once. Their skin changes. Their concerns evolve. But your data stays exactly where it started — a snapshot, not a story.',
              },
              {
                icon: '⬡',
                title: 'Personalization with no feedback loop.',
                body: 'You recommend. They close the tab. You never know if it worked, if their skin changed, or why they didn\'t reorder.',
              },
              {
                icon: '◈',
                title: 'Retention guesswork.',
                body: 'You can\'t predict who\'s about to churn without knowing how their routine is going. Real signals require real check-ins.',
              },
            ].map(p => (
              <div
                key={p.title}
                className="rounded-2xl p-8"
                style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}
              >
                <div className="text-2xl mb-5" style={{ color: '#450F2A' }}>{p.icon}</div>
                <h3 className="font-display text-lg font-semibold mb-3" style={{ color: '#1A0A12' }}>
                  {p.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: '#8B6575' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW HALITE BUILDS INTELLIGENCE ────────────────────────────────── */}
      <section id="how" className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(193,122,71,0.9)' }}>
              How it works
            </p>
            <h2 className="font-display text-4xl font-semibold" style={{ color: '#FAF6F0' }}>
              Every touchpoint becomes a signal.
            </h2>
            <p className="text-base mt-4 max-w-lg mx-auto" style={{ color: 'rgba(250,246,240,0.55)' }}>
              Halite layers consumer data over time — turning each quiz, check-in, and product reaction into a richer profile that makes your next recommendation sharper.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                n: '01',
                title: 'Profile',
                body: 'AI-powered quiz builds a complete skin profile in under 2 minutes. Skin type, concerns, climate, Monk tone, budget — everything your recommendation engine needs.',
              },
              {
                n: '02',
                title: 'Personalize',
                body: 'Claude generates a bespoke routine from your catalogue — inclusive by design, ingredient-matched, and price-filtered. No generic picks, ever.',
              },
              {
                n: '03',
                title: 'Track',
                body: 'Weekly check-ins capture skin ratings, product reactions, and compliance. Each response updates the consumer\'s profile and your brand analytics.',
              },
              {
                n: '04',
                title: 'Predict',
                body: 'Halite surfaces churn risk, reorder intent, and skin progression trends — giving your team the signals to act before a customer leaves.',
              },
            ].map(step => (
              <div
                key={step.n}
                className="rounded-2xl p-8"
                style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}
              >
                <p
                  className="font-display text-4xl font-semibold mb-5"
                  style={{ color: 'rgba(193,122,71,0.6)' }}
                >
                  {step.n}
                </p>
                <h3 className="font-display text-xl font-semibold mb-3" style={{ color: '#FAF6F0' }}>
                  {step.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a
              href="/platform"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
              style={{ background: '#FAF6F0', color: '#450F2A' }}
            >
              Explore the full platform ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Platform
            </p>
            <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
              Built to know your customer deeper every day.
            </h2>
          </div>

          {/* Feature 1: Living Consumer Profiles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.data} alt="Consumer intelligence data" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.15)' }} />
              {/* Overlay card */}
              <div
                className="absolute bottom-6 left-6 right-6 rounded-2xl p-4"
                style={{ background: 'rgba(250,246,240,0.96)', backdropFilter: 'blur(8px)' }}
              >
                <p className="text-[10px] font-semibold tracking-wide uppercase mb-2" style={{ color: '#8B6575' }}>Consumer profile depth</p>
                <div className="flex items-center gap-3">
                  {[
                    { label: 'Skin data', pct: 94 },
                    { label: 'Routine compliance', pct: 83 },
                    { label: 'Product reactions', pct: 71 },
                  ].map(s => (
                    <div key={s.label} className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px]" style={{ color: '#8B6575' }}>{s.label}</span>
                        <span className="text-[10px] font-semibold" style={{ color: '#450F2A' }}>{s.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#E8DDD0' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: '#450F2A' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                Living Consumer Profiles
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Profiles that evolve with your customer.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Every quiz answer, weekly check-in, and product reaction updates the consumer's profile in real time. Halite builds a longitudinal picture of each customer — their skin journey, concerns over time, and what's actually working — so you're never personalizing from stale data.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Longitudinal skin data', 'Routine compliance', 'Product reactions', 'Churn risk signals'].map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: Predictive Retention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 lg:order-1">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                Predictive Retention
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Know who's at risk before they leave.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Routine compliance drops. Check-in frequency falls. Skin ratings decline. Halite reads these signals and surfaces retention risk so your team can intervene with the right offer at the right moment — before the customer cancels or ghosts.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Churn prediction', 'Re-engagement triggers', 'Compliance monitoring', 'Smart reorder timing'].map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.tracking} alt="Outcome tracking on mobile" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.1)' }} />
            </div>
          </div>

          {/* Feature 3: Brand Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.dashboard} alt="Brand intelligence dashboard" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.2)' }} />
              <div
                className="absolute bottom-6 left-6 right-6 rounded-2xl p-4"
                style={{ background: 'rgba(250,246,240,0.95)', backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wide uppercase mb-0.5" style={{ color: '#8B6575' }}>Hyperpigmentation prevalence</p>
                    <p className="font-display text-xl font-semibold" style={{ color: '#450F2A' }}>65% of tones 07–10</p>
                  </div>
                  <div className="h-12 w-24 flex items-end gap-0.5">
                    {[30, 45, 38, 55, 67, 58, 72].map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${(v / 72) * 100}%`, background: i === 6 ? '#450F2A' : '#E8DDD0' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                Brand Intelligence Dashboard
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Consumer intelligence that compounds.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Aggregate skin concern trends, ingredient performance, and demographic breakdowns — across your entire consumer base. The more routines run, the more precisely you know what's working, who it's working for, and what to build next.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Concern trend maps', 'Ingredient efficacy', 'Product performance', 'Demographic insights'].map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 4: Routine Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                Routine Engine
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Personalization that actually fits.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Claude generates a bespoke regimen from your catalogue — Monk Skin Tone-aware, ingredient-matched, climate-adjusted, and budget-filtered. Every routine is a data point that makes the next one better.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Inclusive AI', 'Catalogue-native', 'Climate-aware', 'Budget-filtered'].map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 relative rounded-3xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image src={PHOTOS.routine} alt="Personalized skin routine" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.1)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM CTA BANNER ───────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: '#F2EBE0', borderTop: '1px solid #E8DDD0', borderBottom: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display text-2xl font-semibold mb-1" style={{ color: '#1A0A12' }}>
              Want the full product walkthrough?
            </p>
            <p className="text-[14px]" style={{ color: '#8B6575' }}>
              Routine Engine, Outcome Tracker, Brand Dashboard, and Embedded Widget — all in one place.
            </p>
          </div>
          <a
            href="/platform"
            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#450F2A', color: '#FAF6F0' }}
          >
            Explore the platform ↗
          </a>
        </div>
      </section>

      {/* ── WIDGET INTEGRATION ───────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#1A0A12' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Embedded widget
            </p>
            <h2 className="font-display text-4xl font-semibold mb-4" style={{ color: '#FAF6F0' }}>
              Live in 5 minutes.
            </h2>
            <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(250,246,240,0.6)' }}>
              One script tag. Works with Shopify, Webflow, custom storefronts — any platform. Consumers never leave your site. Every interaction feeds your brand intelligence layer.
            </p>

            <div className="rounded-2xl overflow-hidden">
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ background: 'rgba(250,246,240,0.06)', borderBottom: '1px solid rgba(250,246,240,0.08)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B6575' }} />
                <span className="text-[11px] ml-2" style={{ color: 'rgba(250,246,240,0.3)' }}>index.html</span>
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
                <span style={{ color: 'rgba(250,246,240,0.4)' }}>{'/>'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: '✦', title: 'Quiz + routine', body: 'Embedded skin quiz builds a profile and generates a personalized routine in real time. Every answer is a new data point.' },
              { icon: '◉', title: 'Weekly check-ins', body: 'Consumers log skin ratings and product reactions directly from the widget. Each response sharpens their profile.' },
              { icon: '⟳', title: 'Smart reorder nudges', body: 'Reorder prompts timed to each product\'s run-rate — triggered by compliance data, not arbitrary schedules.' },
              { icon: '▲', title: 'Progress narrative', body: 'AI-generated skin progress summary. Consumers see their journey; your brand gets the trend data behind it.' },
            ].map(item => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}
              >
                <div
                  className="text-lg mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(193,122,71,0.15)', color: '#C17A47' }}
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
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <section id="compare" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Why Halite
            </p>
            <h2 className="font-display text-4xl font-semibold" style={{ color: '#1A0A12' }}>
              The only platform built for predictive intelligence.
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: '#8B6575' }}>
              Others stop at the recommendation. Halite turns every interaction into retention leverage.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid #E8DDD0' }}>
            <div className="grid grid-cols-6 text-[12px] font-semibold">
              <div className="col-span-2 px-6 py-5" style={{ background: '#F2EBE0' }} />
              <div className="px-4 py-5 text-center" style={{ background: '#450F2A', color: '#FAF6F0' }}>Halite ✦</div>
              <div className="px-4 py-5 text-center" style={{ background: '#F2EBE0', color: '#4A2A38' }}>Revieve</div>
              <div className="px-4 py-5 text-center" style={{ background: '#F2EBE0', color: '#4A2A38' }}>Haut.AI</div>
              <div className="px-4 py-5 text-center" style={{ background: '#F2EBE0', color: '#4A2A38' }}>Proven</div>
            </div>

            {COMPARE_ROWS.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-6 text-[13px]"
                style={{ borderTop: '1px solid #E8DDD0' }}
              >
                <div
                  className="col-span-2 px-6 py-4 font-medium"
                  style={{ color: '#4A2A38', background: i % 2 === 0 ? '#FAF6F0' : '#F8F3EE' }}
                >
                  {row.feature}
                </div>
                <div
                  className="px-4 py-4 text-center"
                  style={{ background: i % 2 === 0 ? 'rgba(69,15,42,0.04)' : 'rgba(69,15,42,0.07)' }}
                >
                  <Cell v={row.halite} />
                </div>
                <div className="px-4 py-4 text-center" style={{ background: i % 2 === 0 ? '#FAF6F0' : '#F8F3EE' }}>
                  <Cell v={row.revieve} />
                </div>
                <div className="px-4 py-4 text-center" style={{ background: i % 2 === 0 ? '#FAF6F0' : '#F8F3EE' }}>
                  <Cell v={row.haut} />
                </div>
                <div className="px-4 py-4 text-center" style={{ background: i % 2 === 0 ? '#FAF6F0' : '#F8F3EE' }}>
                  <Cell v={row.proven} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] mt-4" style={{ color: '#C4B5BD' }}>
            Partial = feature exists but limited in scope or availability tier
          </p>
        </div>
      </section>

      {/* ── SKIN INCLUSION ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-0" style={{ minHeight: 520 }}>
        <div className="absolute inset-0">
          <Image
            src={PHOTOS.inclusion}
            alt="Diverse skin tones"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(69,15,42,0.78)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Inclusive by design
            </p>
            <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
              Intelligence built for every skin.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(250,246,240,0.72)' }}>
              Most beauty AI was trained on narrow datasets. Halite uses the Monk Skin Tone Scale — all 10 tones — so your personalization is accurate for every one of your customers, not just some of them. Better data. Better recommendations. Better retention.
            </p>
          </div>

          <div>
            <div className="mb-8">
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {MONK_TONES.map((tone) => (
                  <div
                    key={tone.label}
                    className="flex flex-col items-center gap-2 py-2 px-1 rounded-xl"
                    style={{ background: 'rgba(250,246,240,0.08)', minWidth: 36 }}
                  >
                    <div className="w-7 h-7 rounded-full" style={{ background: tone.hex }} />
                    <span className="text-[9px] font-semibold" style={{ color: 'rgba(250,246,240,0.5)' }}>
                      {tone.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(250,246,240,0.4)' }}>
                Monk Skin Tone Scale — all 10 tones, fully supported
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { n: '10', label: 'Monk tones supported' },
                { n: '100%', label: 'Catalogue-matched routines' },
                { n: '0', label: 'One-size-fits-all recs' },
                { n: '✓', label: 'Melanin-aware formulation' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(250,246,240,0.07)', border: '1px solid rgba(250,246,240,0.1)' }}
                >
                  <p className="font-display text-2xl font-semibold mb-1" style={{ color: '#C17A47' }}>{s.n}</p>
                  <p className="text-[12px]" style={{ color: 'rgba(250,246,240,0.55)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Pricing
            </p>
            <h2 className="font-display text-4xl font-semibold" style={{ color: '#1A0A12' }}>
              Simple, brand-friendly pricing.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: 'Custom',
                period: '',
                desc: 'For brands getting started with personalization intelligence.',
                features: ['Up to 1,000 consumer profiles', 'Full widget (quiz, check-in, progress)', 'Brand intelligence dashboard', 'Email support'],
                cta: 'Get started',
                highlight: false,
              },
              {
                name: 'Growth',
                price: 'Custom',
                period: '',
                desc: 'For brands scaling their consumer intelligence layer.',
                features: ['Up to 10,000 consumer profiles', 'Everything in Starter', 'Predictive churn signals', 'Shopify native sync', 'Advanced analytics & ingredient lab', 'Priority support'],
                cta: 'Book a demo',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For large teams with complex intelligence requirements.',
                features: ['Unlimited consumer profiles', 'White-label widget', 'Dedicated customer success', 'SLA + data residency options', 'API access'],
                cta: 'Talk to us',
                highlight: false,
              },
            ].map(tier => (
              <div
                key={tier.name}
                className="rounded-3xl p-8 flex flex-col"
                style={{
                  background: tier.highlight ? '#450F2A' : '#FAF6F0',
                  border: tier.highlight ? 'none' : '1px solid #E8DDD0',
                  boxShadow: tier.highlight ? '0 20px 60px rgba(69,15,42,0.25)' : 'none',
                }}
              >
                <div className="mb-6">
                  <p
                    className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3"
                    style={{ color: tier.highlight ? 'rgba(193,122,71,0.9)' : '#8B6575' }}
                  >
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="font-display text-4xl font-semibold" style={{ color: tier.highlight ? '#FAF6F0' : '#1A0A12' }}>
                      {tier.price}
                    </span>
                  </div>
                  <p className="text-[13px]" style={{ color: tier.highlight ? 'rgba(250,246,240,0.6)' : '#8B6575' }}>
                    {tier.desc}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px]">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: tier.highlight ? '#C17A47' : '#450F2A' }}>✓</span>
                      <span style={{ color: tier.highlight ? 'rgba(250,246,240,0.8)' : '#4A2A38' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#demo"
                  className="block text-center rounded-full py-3 text-[13px] font-semibold transition-all hover:opacity-90"
                  style={{
                    background: tier.highlight ? '#FAF6F0' : '#450F2A',
                    color: tier.highlight ? '#450F2A' : '#FAF6F0',
                  }}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
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
              See Halite in your brand's context.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes. No slides — we walk through the platform with your catalogue and your use case. You'll leave with a clear picture of what predictive consumer intelligence looks like for your brand.
            </p>
            <div className="space-y-4">
              {[
                'Live product demo with your catalogue',
                'Consumer intelligence walkthrough',
                'Retention & churn signal preview',
                'Technical integration Q&A',
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
                  { label: 'Routine Engine', href: '/platform#routine-engine' },
                  { label: 'Outcome Tracker', href: '/platform#outcome-tracker' },
                  { label: 'Brand Dashboard', href: '/platform#brand-dashboard' },
                  { label: 'Embeddable Widget', href: '/platform#widget' },
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
                {['About', 'Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
                  <p key={l} className="text-[13px]" style={{ color: 'rgba(250,246,240,0.5)' }}>{l}</p>
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
