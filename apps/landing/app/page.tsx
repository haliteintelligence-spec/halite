import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'

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

type Cell = 'yes' | 'partial' | 'no'
const COMPARE_ROWS: { feature: string; halite: Cell; revieve: Cell; klaviyo: Cell; outersignal: Cell }[] = [
  { feature: 'Personalized recs from your real catalog',                halite: 'yes', revieve: 'yes',     klaviyo: 'partial', outersignal: 'no' },
  { feature: 'Learns and gets sharper with every check-in',              halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no' },
  { feature: 'Warns you before a customer leaves',                       halite: 'yes', revieve: 'no',      klaviyo: 'partial', outersignal: 'no' },
  { feature: 'Easy-to-read dashboard, no data team needed',              halite: 'yes', revieve: 'partial', klaviyo: 'partial', outersignal: 'no' },
  { feature: 'Built to work well for every skin tone',                   halite: 'yes', revieve: 'partial', klaviyo: 'no',      outersignal: 'no' },
  { feature: 'One-click Shopify setup',                                  halite: 'yes', revieve: 'no',      klaviyo: 'yes',     outersignal: 'no' },
  { feature: 'Works on any website — no developer needed',               halite: 'yes', revieve: 'partial', klaviyo: 'partial', outersignal: 'partial' },
  { feature: "Know which products customers love (and which they don't)", halite: 'yes', revieve: 'no',      klaviyo: 'partial', outersignal: 'no' },
  { feature: 'Regular, automatic check-ins with customers',              halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no' },
]

function Mark({ v, lead }: { v: Cell; lead?: boolean }) {
  if (v === 'yes') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-bold"
        style={
          lead
            ? { width: 22, height: 22, fontSize: 12, background: '#450F2A', color: '#FAF6F0', boxShadow: '0 1px 3px rgba(69,15,42,0.35)' }
            : { width: 20, height: 20, fontSize: 11, background: 'rgba(45,122,58,0.14)', color: '#2D7A3A' }
        }
      >
        ✓
      </span>
    )
  }
  if (v === 'partial') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-bold px-2"
        style={
          lead
            ? { height: 20, fontSize: 9, background: '#C17A47', color: '#2A1206' }
            : { height: 20, fontSize: 9, background: 'rgba(193,122,71,0.14)', color: '#C17A47' }
        }
      >
        Some
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold"
      style={
        lead
          ? { width: 20, height: 20, fontSize: 11, background: 'rgba(69,15,42,0.12)', color: '#450F2A', opacity: 0.7 }
          : { width: 20, height: 20, fontSize: 11, background: '#E8DDD0', color: '#8B6575', opacity: 0.55 }
      }
    >
      ✕
    </span>
  )
}

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
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(560px 420px at 88% -8%, rgba(193,122,71,0.18), transparent 60%), radial-gradient(420px 420px at 6% 110%, rgba(193,122,71,0.12), transparent 60%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-6"
              style={{ color: 'rgba(250,246,240,0.5)' }}
            >
              Built for beauty &amp; CPG brands
            </p>
            <h1
              className="font-display text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05] mb-6"
              style={{ color: '#FAF6F0' }}
            >
              Know your
              <br />
              customers.
              <br />
              <span style={{ color: '#C17A47' }}>Keep them</span>
              <br />
              coming back.
            </h1>
            <p
              className="text-lg leading-relaxed mb-10 max-w-md"
              style={{ color: 'rgba(250,246,240,0.72)' }}
            >
              Every quiz, check-in, and review your customers give you turns into one simple, up-to-date picture of what they need — so you can recommend the right product, catch problems early, and stop losing customers to guesswork.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
                style={{ background: '#FAF6F0', color: '#450F2A' }}
              >
                Book a free demo
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.3)', color: '#FAF6F0' }}
              >
                See how it works ↓
              </a>
            </div>
          </div>

          {/* Customer profile card illustration */}
          <div className="relative hidden lg:block">
            <div
              className="relative rounded-3xl p-7 mx-auto"
              style={{ background: '#FAF6F0', maxWidth: 400, boxShadow: '0 24px 60px -20px rgba(26,10,18,0.35)' }}
            >
              <div className="flex items-center gap-3.5 mb-5">
                <div
                  className="w-13 h-13 rounded-full flex-shrink-0"
                  style={{ width: 52, height: 52, background: 'conic-gradient(from 210deg, #D7BD96, #A07D52, #604134, #D7BD96)' }}
                />
                <div>
                  <p className="font-display text-[17px] font-semibold" style={{ color: '#1A0A12' }}>Jamie&rsquo;s profile</p>
                  <p className="text-[12.5px]" style={{ color: '#8B6575' }}>Customer since March · 3 orders</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['Combination skin', 'Loves lightweight textures', 'Sensitive to fragrance'].map(tag => (
                  <span key={tag} className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(193,122,71,0.14)', color: '#450F2A' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[12px]" style={{ color: '#8B6575' }}>How well we know Jamie</span>
                <span className="text-[12px] font-bold" style={{ color: '#1A0A12' }}>92%</span>
              </div>
              <div className="h-[7px] rounded-full mb-5 overflow-hidden" style={{ background: '#E8DDD0' }}>
                <div className="h-full rounded-full" style={{ width: '92%', background: 'linear-gradient(90deg, #450F2A, #C17A47)' }} />
              </div>
              <div className="rounded-2xl p-3.5 flex items-center justify-between" style={{ background: '#F2EBE0' }}>
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: '#8B6575' }}>Next recommendation</p>
                  <p className="font-display text-[15px] font-semibold" style={{ color: '#1A0A12' }}>Barrier Repair Cream</p>
                </div>
                <span className="text-[13px] font-bold" style={{ color: '#2D7A3A' }}>97% match</span>
              </div>
            </div>
            {/* Floating stat tags */}
            <div
              className="absolute -bottom-4 -left-6 rounded-2xl px-5 py-4 shadow-xl"
              style={{ background: '#450F2A' }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(250,246,240,0.6)' }}>
                More customers stay
              </p>
              <p className="font-display text-2xl font-semibold" style={{ color: '#FAF6F0' }}>30%</p>
            </div>
            <div
              className="absolute -top-4 -right-4 rounded-2xl px-5 py-4 shadow-xl"
              style={{ background: '#C17A47' }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1 text-white/70">
                Recommendation accuracy
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
            { n: '30%',    label: 'More customers come back and buy again after a personalized recommendation.' },
            { n: '15–18%', label: 'More people buy when they get a match built for them, instead of browsing alone.' },
            { n: '39%',    label: 'Bigger orders when the recommendation actually fits what someone needs.' },
            { n: '50%',    label: "Lower cost to win new customers — because you're keeping more of the ones you have." },
          ].map(item => (
            <div key={item.label}>
              <p className="font-display text-3xl md:text-4xl font-semibold" style={{ color: '#450F2A' }}>
                {item.n}
              </p>
              <p className="text-[12px] mt-2 leading-relaxed max-w-[24ch]" style={{ color: '#8B6575' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Where most beauty &amp; CPG brands get stuck
            </p>
            <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
              You know what you sold.<br />You don&rsquo;t know who bought it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '◎',
                title: 'You only know them on day one.',
                body: "A customer takes your quiz or makes a purchase, and that's the last real information you get. Their needs change, but your picture of them never does.",
              },
              {
                icon: '⬡',
                title: "You recommend, then you're in the dark.",
                body: "You suggest a product. They buy it, or they don't. Either way, you rarely find out if it worked for them — or why they never came back for more.",
              },
              {
                icon: '◈',
                title: 'You find out too late.',
                body: "By the time a customer stops ordering, they've usually been unhappy for weeks. Without regular check-ins, there's no early warning — just a lost customer.",
              },
            ].map(p => (
              <div
                key={p.title}
                className="rounded-2xl p-8"
                style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                  style={{ background: 'rgba(193,122,71,0.14)', color: '#450F2A' }}
                >
                  {p.icon}
                </div>
                <h3 className="font-display text-lg font-semibold mb-3" style={{ color: '#1A0A12' }}>
                  {p.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: '#8B6575' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW HALITE WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(193,122,71,0.9)' }}>
              How Halite works
            </p>
            <h2 className="font-display text-4xl font-semibold" style={{ color: '#FAF6F0' }}>
              Four simple steps. No spreadsheets, no guesswork.
            </h2>
            <p className="text-base mt-4 max-w-lg mx-auto" style={{ color: 'rgba(250,246,240,0.55)' }}>
              Every quiz, check-in, and product reaction builds a fuller picture of each customer — so your next recommendation is a little sharper than the last.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '1', title: 'Get to know them', body: 'A short, friendly quiz — under 2 minutes — learns what each customer needs, prefers, and can afford. No forms, no friction.' },
              { n: '2', title: 'Recommend the right fit', body: "We match them to real products from your own catalog. Never a generic pick, never something you don't actually sell." },
              { n: '3', title: 'Check in, automatically', body: "We follow up on a regular cadence to ask how it's going. Customers tell us what's working, right from your site." },
              { n: '4', title: 'Catch problems early', body: "When satisfaction drops or someone goes quiet, you'll know — in time to actually do something about it." },
            ].map(step => (
              <div
                key={step.n}
                className="rounded-2xl p-8"
                style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold mb-5"
                  style={{ background: '#C17A47', color: '#2A1206' }}
                >
                  {step.n}
                </div>
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
              See the full picture ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU ACTUALLY GET ────────────────────────────────────────── */}
      <section id="get" className="py-24" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              What you actually get
            </p>
            <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
              Everything you need to actually know your customers.
            </h2>
          </div>

          {/* Feature 1: A profile that keeps learning */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="rounded-3xl p-8 flex flex-col justify-center gap-4" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0', minHeight: 280 }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#8B6575' }}>How well we know each customer</p>
              {[
                { label: 'Purchase & usage history', pct: 94 },
                { label: 'How engaged they are', pct: 83 },
                { label: "What they've told us about products", pct: 71 },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px]" style={{ color: '#8B6575' }}>{s.label}</span>
                    <span className="text-[12px] font-bold" style={{ color: '#1A0A12' }}>{s.pct}%</span>
                  </div>
                  <div className="h-[7px] rounded-full" style={{ background: '#E8DDD0' }}>
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: 'linear-gradient(90deg, #450F2A, #C17A47)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                A profile that keeps learning
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                The picture of your customer never goes stale.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Every quiz answer, check-in, and product reaction adds to a simple, current picture of each customer — what they like, what&rsquo;s working, and what they might need next. You&rsquo;re never personalizing off information from six months ago.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Grows over time', 'Always current', 'One view per customer', 'No manual data entry'].map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: A heads-up before someone leaves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 lg:order-1">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                A heads-up before someone leaves
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Know who&rsquo;s about to go quiet — before they do.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                When a customer&rsquo;s check-ins slow down, satisfaction drops, or they simply go quiet, we flag it. Your team gets a heads-up in time to reach out with the right offer — before they cancel or just stop ordering.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Early warning flags', 'Know who to reach out to', 'Fewer surprise cancellations'].map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-3xl p-8 flex flex-col justify-center gap-2.5" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0', minHeight: 280 }}>
              {[
                { who: 'Alicia M.', status: 'Reach out soon', risk: true },
                { who: 'Devon P.', status: 'Doing great', risk: false },
                { who: 'Sam R.', status: 'Going quiet', risk: true },
                { who: 'Priya K.', status: 'Doing great', risk: false },
              ].map(r => (
                <div key={r.who} className="flex items-center justify-between rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                  <span className="text-[14px] font-semibold" style={{ color: '#1A0A12' }}>{r.who}</span>
                  <span
                    className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
                    style={r.risk ? { background: 'rgba(193,122,71,0.18)', color: '#A85B2A' } : { background: 'rgba(45,122,58,0.14)', color: '#2D7A3A' }}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 3: One dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="rounded-3xl p-6" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                {[
                  { l: 'Active customers', v: '4,218', d: '↑ 12%', up: true },
                  { l: 'Happiness score', v: '7.4 / 10', d: '↑ 0.8', up: true },
                  { l: 'Top concern', v: 'Dryness', d: '38% of customers', up: null },
                  { l: 'At risk of leaving', v: '6.2%', d: '↓ 1.4%', up: true },
                ].map(t => (
                  <div key={t.l} className="rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                    <p className="text-[10.5px] uppercase tracking-wide font-bold mb-1" style={{ color: '#8B6575' }}>{t.l}</p>
                    <p className="font-display text-lg font-semibold" style={{ color: '#1A0A12' }}>{t.v}</p>
                    <p className="text-[11px] mt-0.5 font-semibold" style={{ color: t.up === true ? '#2D7A3A' : '#C17A47' }}>{t.d}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                <p className="text-[10.5px] uppercase tracking-wide font-bold mb-2.5" style={{ color: '#8B6575' }}>What customers care about most</p>
                <div className="flex items-end gap-1" style={{ height: 44 }}>
                  {[62, 45, 38, 80, 55, 48, 65, 58].map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${v}%`, background: i === 3 ? '#450F2A' : '#E8DDD0' }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                One dashboard, the whole picture
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                See what&rsquo;s working, without needing a data team.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                See what your customers care about most, which products are winning, and where you&rsquo;re missing the mark — all in one place, in plain language. Built for a marketing or ops team to read in five minutes, not a data analyst.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Plain-language reports', "See what's working", 'Spot trends early'].map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 4: Recommendations that actually fit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#C17A47' }}>
                Recommendations that actually fit
              </p>
              <h3 className="font-display text-3xl font-semibold leading-snug mb-4" style={{ color: '#1A0A12' }}>
                Never a generic pick. Never something you don&rsquo;t sell.
              </h3>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#8B6575' }}>
                Every recommendation comes from your own product catalog — matched to what each customer actually needs and can afford. The more we hear from a customer, the better the next recommendation gets.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Only your products', 'Matched to real needs', 'Fits their budget'].map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-3xl p-8 flex flex-col justify-center gap-2.5" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0', minHeight: 280 }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#8B6575' }}>Recommended for Tone 08 · dry &amp; uneven tone</p>
              {[
                { step: 'AM Cleanser — Gentle Milk Cleanser', match: '98%' },
                { step: 'Serum — Niacinamide 10%', match: '95%' },
                { step: 'Moisturizer — Barrier Repair Cream', match: '97%' },
              ].map(r => (
                <div key={r.step} className="flex items-center justify-between rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                  <span className="text-[13.5px] font-semibold" style={{ color: '#1A0A12' }}>{r.step}</span>
                  <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(45,122,58,0.14)', color: '#2D7A3A' }}>{r.match} match</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: '#F2EBE0', borderTop: '1px solid #E8DDD0', borderBottom: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display text-2xl font-semibold mb-1" style={{ color: '#1A0A12' }}>
              Want to see it all in action?
            </p>
            <p className="text-[14px]" style={{ color: '#8B6575' }}>
              We&rsquo;ll walk you through the whole thing — using your own products, not a generic demo.
            </p>
          </div>
          <a
            href="/platform"
            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#450F2A', color: '#FAF6F0' }}
          >
            See how it works ↗
          </a>
        </div>
      </section>

      {/* ── GETTING STARTED (setup, no code required) ───────────────────── */}
      <section className="py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Getting started
            </p>
            <h2 className="font-display text-4xl font-semibold mb-4" style={{ color: '#FAF6F0' }}>
              Live on your site in about a week. We do the setup.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.6)' }}>
              No developers, no code, no IT ticket. Send us your product list, tell us about your brand, and we build and install everything for you. On Shopify, it&rsquo;s even faster.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { n: '1', title: 'Send us your product list', body: 'A spreadsheet works just fine — no special format required.' },
                { n: '2', title: 'We build and install your quiz', body: "Matched to your brand's look and feel. You review it before it goes live." },
                { n: '3', title: 'Customers start checking in', body: "You start seeing real answers — what's working, and what isn't." },
              ].map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: '#C17A47', color: '#2A1206' }}>
                    {s.n}
                  </div>
                  <div>
                    <p className="text-[14.5px] font-semibold mb-0.5" style={{ color: '#FAF6F0' }}>{s.title}</p>
                    <p className="text-[13px]" style={{ color: 'rgba(250,246,240,0.55)' }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {['Works with Shopify', 'Works with Webflow', 'Works with WordPress', 'Works with any website'].map(p => (
                <span key={p} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(250,246,240,0.07)', color: 'rgba(250,246,240,0.65)', border: '1px solid rgba(250,246,240,0.1)' }}>
                  {p}
                </span>
              ))}
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.2)' }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: '#C17A47' }}>✦ One-click Shopify setup</p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>
                Already on Shopify? Install from the App Store and your product catalog syncs automatically — nothing to configure by hand.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: '◎', title: 'A quiz customers actually finish', detail: 'Under 2 minutes · feels like a conversation', body: 'A friendly, short quiz builds a real profile and hands back a personal recommendation instantly — right on your site.' },
              { icon: '⬡', title: 'Check-ins that happen on their own', detail: 'Automatic · no extra work for your team', body: "Customers get a gentle nudge to share how a product is working out. Every answer sharpens their profile." },
              { icon: '⟳', title: 'Reorder reminders, timed right', detail: 'Based on real usage · not a guess', body: 'Instead of a generic "reorder in 30 days" email, reminders are timed to how a customer is actually using the product.' },
              { icon: '▲', title: 'A progress update customers love', detail: 'Written for them · builds loyalty', body: 'Customers see a simple summary of their own progress. You get the trend data behind it.' },
            ].map(item => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}
              >
                <div
                  className="text-lg mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(193,122,71,0.15)', color: '#C17A47' }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#FAF6F0' }}>{item.title}</p>
                  <p className="text-[11px] mt-0.5 mb-1.5 font-semibold" style={{ color: 'rgba(193,122,71,0.8)' }}>{item.detail}</p>
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
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Why brands choose Halite
            </p>
            <h2 className="font-display text-4xl font-semibold" style={{ color: '#1A0A12' }}>
              The only platform that follows through after the recommendation.
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: '#8B6575' }}>
              Other tools stop once they&rsquo;ve suggested a product. Halite keeps listening — and helps you act on what it hears.
            </p>
          </div>

          <p className="text-center text-[11.5px] mb-3.5 sm:hidden" style={{ color: '#8B6575' }}>← Scroll sideways to see every brand →</p>

          <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid #E8DDD0' }}>
            <div className="overflow-x-auto">
              <table className="border-collapse w-full" style={{ minWidth: 660 }}>
                <colgroup>
                  <col style={{ width: 240 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 120 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-[2] text-left px-6 py-5 text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{ background: '#F2EBE0', color: '#8B6575', borderBottom: '1px solid #E8DDD0' }}
                    >
                      Compare features
                    </th>
                    <th
                      className="sticky z-[2] text-center px-4 py-5"
                      style={{ left: 240, background: '#450F2A', borderBottom: '1px solid #E8DDD0' }}
                    >
                      <span className="font-display text-[16px] font-semibold block" style={{ color: '#FAF6F0' }}>Halite ✦</span>
                      <span className="text-[11.5px] block mt-0.5" style={{ color: 'rgba(250,246,240,0.68)' }}>Built for the whole customer journey</span>
                    </th>
                    <th className="text-center px-4 py-5" style={{ background: '#F2EBE0', borderBottom: '1px solid #E8DDD0' }}>
                      <span className="font-display text-[16px] font-semibold block" style={{ color: '#1A0A12' }}>Revieve</span>
                      <span className="text-[11.5px] block mt-0.5" style={{ color: '#8B6575' }}>Quiz &amp; recommendation tools</span>
                    </th>
                    <th className="text-center px-4 py-5" style={{ background: '#F2EBE0', borderBottom: '1px solid #E8DDD0' }}>
                      <span className="font-display text-[16px] font-semibold block" style={{ color: '#1A0A12' }}>Klaviyo</span>
                      <span className="text-[11.5px] block mt-0.5" style={{ color: '#8B6575' }}>Email &amp; SMS marketing platform</span>
                    </th>
                    <th className="text-center px-4 py-5" style={{ background: '#F2EBE0', borderBottom: '1px solid #E8DDD0' }}>
                      <span className="font-display text-[16px] font-semibold block" style={{ color: '#1A0A12' }}>Outersignal</span>
                      <span className="text-[11.5px] block mt-0.5" style={{ color: '#8B6575' }}>Customer data &amp; analytics tool</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => {
                    const stripe = i % 2 === 0 ? '#FAF6F0' : '#F2EBE0'
                    return (
                      <tr key={row.feature}>
                        <td
                          className="sticky left-0 z-[2] text-left px-6 py-3.5 text-[13.5px] font-semibold"
                          style={{ background: stripe, color: '#1A0A12', borderBottom: '1px solid #E8DDD0' }}
                        >
                          {row.feature}
                        </td>
                        <td
                          className="sticky z-[2] text-center px-4 py-3.5"
                          style={{ left: 240, background: 'rgba(69,15,42,0.06)', borderBottom: '1px solid #E8DDD0', boxShadow: '6px 0 10px -6px rgba(26,10,18,0.18)' }}
                        >
                          <Mark v={row.halite} lead />
                        </td>
                        <td className="text-center px-4 py-3.5" style={{ background: stripe, borderBottom: '1px solid #E8DDD0' }}>
                          <Mark v={row.revieve} />
                        </td>
                        <td className="text-center px-4 py-3.5" style={{ background: stripe, borderBottom: '1px solid #E8DDD0' }}>
                          <Mark v={row.klaviyo} />
                        </td>
                        <td className="text-center px-4 py-3.5" style={{ background: stripe, borderBottom: '1px solid #E8DDD0' }}>
                          <Mark v={row.outersignal} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-[11px] mt-4" style={{ color: '#C4B5BD' }}>
            &ldquo;Some&rdquo; means the feature exists in a limited form, is bolted on from a different part of the product, or is only on higher-priced plans.
          </p>
        </div>
      </section>

      {/* ── INCLUSIVE BY DESIGN ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(700px 500px at 100% 0%, rgba(193,122,71,0.16), transparent 60%)' }}
        />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Built for every customer
            </p>
            <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
              Personalization that actually works for everyone.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(250,246,240,0.72)' }}>
              A lot of beauty AI was built and tested mostly on lighter skin tones — so recommendations quietly work worse for everyone else. Halite is built on the Monk Skin Tone Scale, an industry-standard set of 10 tones used by dermatologists and researchers, so the match is just as accurate no matter who&rsquo;s asking.
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
                The Monk Skin Tone Scale — all 10 tones, fully supported.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { n: '10', label: 'Skin tones fully supported' },
                { n: '100%', label: 'Recommendations from your real catalog' },
                { n: '0', label: 'One-size-fits-all picks' },
                { n: '✓', label: 'Same accuracy, every skin tone' },
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

      {/* ── DEMO CTA ─────────────────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Get a demo
            </p>
            <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
              See Halite with your own products.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes. No slides — we&rsquo;ll walk through exactly how it would work for your brand and your customers. You&rsquo;ll leave knowing exactly what to expect.
            </p>
            <div className="space-y-4">
              {[
                'A live walkthrough using your own products',
                'How the customer quiz looks and feels',
                'How we’d flag customers at risk of leaving',
                'Answers to any question you have — no pressure',
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
                Real customer intelligence for beauty &amp; CPG brands, in plain language. Know them. Personalize for them. Keep them.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: 'rgba(250,246,240,0.3)' }}>
                What you get
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'The customer quiz', href: '/platform#quiz' },
                  { label: 'Regular check-ins', href: '/platform#checkins' },
                  { label: 'Your dashboard', href: '/platform#dashboard' },
                  { label: 'Getting set up', href: '/platform#setup' },
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
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <p className="text-[11px]" style={{ color: 'rgba(250,246,240,0.3)' }}>
                © 2026 Halite Intelligence. All rights reserved.
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(250,246,240,0.3)' }}>
                Halite Intelligence is a subsidiary of Lodestar Procurement Advisory LLC, registered in Atlanta, GA.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
