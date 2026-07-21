import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'

export const metadata = {
  title: 'How It Works',
  description: "How Halite works for beauty & CPG brands: a customer quiz that builds real recommendations, automatic check-ins, a plain-language dashboard, and white-glove setup — no developer required.",
  alternates: {
    canonical: 'https://haliteintelligence.com/platform',
  },
  openGraph: {
    url: 'https://haliteintelligence.com/platform',
    title: 'How It Works — Halite Intelligence',
    description: 'Four simple pieces, working together — from the first quiz answer to knowing exactly when to check in on someone.',
  },
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
            <span className="text-[12px]" style={{ color: 'rgba(250,246,240,0.7)' }}>How it works</span>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-5" style={{ color: 'rgba(193,122,71,0.9)' }}>
            How it works, for beauty &amp; CPG brands
          </p>
          <h1 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05] mb-6" style={{ color: '#FAF6F0' }}>
            Everything that goes into<br />
            <span style={{ color: '#C17A47' }}>knowing your customer.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.65)' }}>
            Four simple pieces, working together — from the first quiz answer to knowing exactly when to check in on someone.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { id: 'quiz', label: 'The Quiz' },
              { id: 'checkins', label: 'Check-Ins' },
              { id: 'dashboard', label: 'Your Dashboard' },
              { id: 'setup', label: 'Getting Set Up' },
            ].map(m => (
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

      {/* ── HOW THE PIECES CONNECT ───────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch gap-0 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(250,246,240,0.08)' }}>
            {[
              { label: 'The Quiz', sublabel: 'Learns what a customer needs', icon: '◈' },
              { label: 'Recommendations', sublabel: 'Matches them to real products', icon: '✦' },
              { label: 'Check-Ins', sublabel: 'Tells you if it actually worked', icon: '◉' },
              { label: 'Your Dashboard', sublabel: 'Shows you everything at once', icon: '▲' },
            ].map((step, i) => (
              <div
                key={step.label}
                className="flex-1 p-6 flex flex-col gap-3"
                style={{
                  background: 'rgba(250,246,240,0.04)',
                  borderRight: i < 3 ? '1px solid rgba(250,246,240,0.08)' : 'none',
                }}
              >
                <span className="text-lg" style={{ color: '#C17A47' }}>{step.icon}</span>
                <p className="font-display text-base font-semibold" style={{ color: '#FAF6F0' }}>{step.label}</p>
                <p className="text-[12px]" style={{ color: 'rgba(250,246,240,0.4)' }}>{step.sublabel}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] mt-5" style={{ color: 'rgba(250,246,240,0.3)' }}>
            Each piece feeds the next — the longer a customer sticks around, the sharper their profile gets.
          </p>
        </div>
      </section>

      {/* ── MODULE 1: THE QUIZ ───────────────────────────────────────────── */}
      <section id="quiz" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'rgba(69,15,42,0.08)' }}>
              <span className="text-lg" style={{ color: '#450F2A' }}>✦</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#8B6575' }}>Also known internally as the Routine Engine</p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
                The quiz that builds real recommendations.
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: '#8B6575' }}>
                A short, friendly quiz learns what a customer needs — then our system matches them to real products from your own catalog. Not a generic pick. Not a guess.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="rounded-3xl p-8 flex flex-col justify-center gap-2.5" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0', minHeight: 260 }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#8B6575' }}>A recommendation, right after the quiz</p>
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

            <div className="space-y-6">
              {[
                { title: 'Only your products, never generic advice', body: "Every recommendation is built exclusively from your catalog — nothing you don't actually sell, ever." },
                { title: 'Works well for every skin tone', body: 'Built on all 10 tones of the Monk Skin Tone Scale, so the match is accurate for every customer, not just some.' },
                { title: 'Takes everything into account', body: 'Skin type, concerns, climate, sensitivities, budget, and experience level all shape the match.' },
                { title: 'Gets better as check-ins come in', body: "As a customer shares more, their recommendation is automatically refined — swapping out anything that isn't working." },
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '<2 min', label: 'From quiz to first recommendation' },
              { n: '94%', label: 'Customers say the match was right' },
              { n: '100%', label: 'Picks are from your real catalog' },
              { n: '10', label: 'Skin tones fully supported' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#450F2A' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#8B6575' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULE 2: CHECK-INS ──────────────────────────────────────────── */}
      <section id="checkins" className="py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'rgba(193,122,71,0.15)' }}>
              <span className="text-lg" style={{ color: '#C17A47' }}>◉</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: 'rgba(250,246,240,0.45)' }}>Also known internally as the Outcome Tracker</p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#FAF6F0' }}>
                Regular check-ins that tell you what&rsquo;s actually happening.
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: 'rgba(250,246,240,0.6)' }}>
                Instead of waiting for a review or a return, Halite checks in with customers on a regular cadence — turning &ldquo;I think it&rsquo;s working&rdquo; into real, structured feedback.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-4">
              {[
                { icon: '◎', title: 'Simple, regular check-ins', body: 'Customers rate how a product is working across a few key measures. Every answer updates their profile and your reports.' },
                { icon: '⬡', title: "What worked, what didn't", body: 'Good reactions and bad ones — both get logged at the product level, so you know exactly what to fix or double down on.' },
                { icon: '◈', title: 'Are they actually using it?', body: "We track whether customers are sticking with their routine. A drop-off is one of the earliest signs someone's about to leave." },
                { icon: '▲', title: 'A progress update, written for them', body: 'Customers see a simple summary of their own progress. You see the trend data behind it.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-5 rounded-2xl" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(193,122,71,0.12)', color: '#C17A47' }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: '#FAF6F0' }}>{item.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.55)' }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgba(250,246,240,0.4)' }}>Week 6 check-in</p>
              {[
                { label: 'Hydration', score: 8, prev: 5 },
                { label: 'Clarity', score: 7, prev: 4 },
                { label: 'Texture', score: 9, prev: 6 },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] font-medium" style={{ color: 'rgba(250,246,240,0.7)' }}>{m.label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: '#C17A47' }}>
                      {m.score}/10 <span className="text-[10px] font-normal" style={{ color: 'rgba(250,246,240,0.35)' }}>(was {m.prev})</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(250,246,240,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.score * 10}%`, background: 'linear-gradient(to right, #C17A47, #e8a870)' }} />
                  </div>
                </div>
              ))}
              <div className="mt-2 rounded-xl p-3" style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.2)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.75)' }}>
                  &ldquo;Jamie&rsquo;s hydration has improved a lot over the last 4 weeks — the Barrier Repair Cream looks like the strongest driver.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '83%', label: 'Average check-in response rate' },
              { n: 'Week 1', label: 'When you first see real outcome data' },
              { n: '↑64%', label: 'Average improvement customers report, 8 weeks in' },
              { n: '3×', label: 'More likely to reorder after checking in' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#C17A47' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULE 3: YOUR DASHBOARD ─────────────────────────────────────── */}
      <section id="dashboard" className="py-24 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'rgba(69,15,42,0.08)' }}>
              <span className="text-lg" style={{ color: '#450F2A' }}>▲</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: '#8B6575' }}>Also known internally as the Brand Dashboard</p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#1A0A12' }}>
                One dashboard, in plain language.
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: '#8B6575' }}>
                Every recommendation, check-in, and reaction rolls up into one view of who your customers are, what they need, and what&rsquo;s actually working — built to be read by your team, not a data analyst.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            <div className="rounded-3xl p-6" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                {[
                  { l: 'Active customers', v: '4,218', d: '↑ 12%' },
                  { l: 'Happiness score', v: '7.4 / 10', d: '↑ 0.8' },
                  { l: 'Top concern', v: 'Dryness', d: '38% of customers' },
                  { l: 'At risk of leaving', v: '6.2%', d: '↓ 1.4%' },
                ].map(card => (
                  <div key={card.l} className="rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                    <p className="text-[10.5px] uppercase tracking-wide font-bold mb-1" style={{ color: '#8B6575' }}>{card.l}</p>
                    <p className="font-display text-lg font-semibold" style={{ color: '#1A0A12' }}>{card.v}</p>
                    <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#2D7A3A' }}>{card.d}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl px-4 py-3.5" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                <p className="text-[10.5px] uppercase tracking-wide font-bold mb-2.5" style={{ color: '#8B6575' }}>Top concerns, by customer group</p>
                <div className="flex items-end gap-1.5" style={{ height: 40 }}>
                  {[62, 45, 38, 71, 55, 48, 65, 52].map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${(v / 71) * 100}%`, background: i === 3 ? '#450F2A' : '#C8B5BD' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {[
                { title: 'A single view of your customers', body: 'Total active customers, happiness scores, top concerns, and how engaged people are — all updated automatically as customers check in.', tags: ['Active customers', 'Happiness trends', 'Top concerns', 'Engagement rates'] },
                { title: "See what's actually working", body: 'Which products and ingredients are driving the best results across your customer base — and where you have a gap in your lineup, before a competitor fills it.', tags: ['Product performance', 'Reaction flags', 'Formulation gaps', 'Product rankings'] },
                { title: 'A heads-up before customers leave', body: 'Dropping engagement and satisfaction are early warning signs. We surface who&rsquo;s at risk so your team can reach out first.', tags: ['Risk scoring', 'Who to reach out to', 'Compliance alerts', 'Win-back timing'] },
                { title: 'How you compare to the market', body: 'See your concern distribution against anonymized market-level trends, so you know where your lineup fits and where you have white space.', tags: ['Market trends', 'Concern benchmarks', 'Portfolio fit'] },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="font-display text-lg font-semibold mb-2" style={{ color: '#1A0A12' }}>{item.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#8B6575' }}>{item.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '10+', label: 'Easy-to-read reports, built for your brand' },
              { n: 'Live', label: 'Updates as check-ins come in' },
              { n: 'CSV', label: 'Export any report, anytime' },
              { n: 'All', label: 'Skin tones reported on separately' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#450F2A' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: '#8B6575' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULE 4: GETTING SET UP ─────────────────────────────────────── */}
      <section id="setup" className="py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-6 mb-16">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'rgba(193,122,71,0.15)' }}>
              <span className="text-lg" style={{ color: '#C17A47' }}>◈</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: 'rgba(250,246,240,0.45)' }}>Also known internally as the Embedded Widget</p>
              <h2 className="font-display text-4xl font-semibold leading-snug" style={{ color: '#FAF6F0' }}>
                We set it up. No developer needed.
              </h2>
              <p className="text-base mt-3 max-w-2xl" style={{ color: 'rgba(250,246,240,0.6)' }}>
                Everything above lives directly on your site — the quiz, the check-ins, the progress updates. Customers never leave your store, and you never touch a line of code.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
            <div>
              <div className="space-y-4 mb-8">
                {[
                  { n: '1', title: 'Send us your product list', body: 'A spreadsheet works just fine.' },
                  { n: '2', title: 'We build & install it for you', body: "Matched to your brand's colors and voice — you approve it before launch." },
                  { n: '3', title: "You're live", body: 'Typically about a week from your first call. Shopify brands can go live even faster.' },
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
                {['Works with Shopify', 'Works with Webflow', 'Works with WordPress', 'Works with Squarespace', 'Works with any website'].map(p => (
                  <span key={p} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(250,246,240,0.07)', color: 'rgba(250,246,240,0.65)', border: '1px solid rgba(250,246,240,0.1)' }}>
                    {p}
                  </span>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.2)' }}>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#C17A47' }}>✦ One-click Shopify setup</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>
                  Install from the Shopify App Store. Your product catalog syncs automatically, and reorder prompts connect right to checkout.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { icon: '◎', title: 'Quiz & instant recommendation', detail: 'Under 2 min · no page redirects', body: 'Customers complete the quiz on your storefront and get a personalized recommendation immediately.' },
                { icon: '⬡', title: 'Automatic check-in prompts', detail: 'Timed well · no app required', body: 'Smart, well-timed nudges bring customers back to share how a product is working.' },
                { icon: '◈', title: 'Smart reorder reminders', detail: 'Based on real usage', body: "Timed to how a product is actually being used — not an arbitrary 30-day cycle." },
                { icon: '✦', title: 'Looks like your brand', detail: 'Fully customizable · your colors, your voice', body: 'Accent color, font weight, and placement all match your site. Full white-label available on Enterprise.' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl p-5" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                  <div className="flex gap-4 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(193,122,71,0.12)', color: '#C17A47' }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: '#FAF6F0' }}>{item.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(193,122,71,0.7)' }}>{item.detail}</p>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.55)', marginLeft: '3.25rem' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '~1 wk', label: 'From signup to live on your site' },
              { n: '0', label: 'Lines of code required from you' },
              { n: '64%', label: 'Of customers complete the quiz' },
              { n: '3×', label: 'More reorders vs. no check-ins' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.08)' }}>
                <p className="font-display text-3xl font-semibold mb-2" style={{ color: '#C17A47' }}>{s.n}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.45)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT ALL FITS TOGETHER ─────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
            How it all fits together
          </p>
          <h2 className="font-display text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
            Every piece makes the others smarter.
          </h2>
          <p className="text-base leading-relaxed mb-16 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.6)' }}>
            The quiz captures what a customer needs. Check-ins tell you if the recommendation worked. Your dashboard rolls it all up. The longer a customer sticks around, the sharper their profile gets — automatically.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
            {[
              { from: 'Quiz', to: 'Recommendation', signal: 'What a customer tells us shapes what we recommend.' },
              { from: 'Check-Ins', to: 'Recommendation', signal: 'Real reactions refine future recommendations automatically.' },
              { from: 'Check-Ins', to: 'Dashboard', signal: 'Every check-in becomes a data point in your brand-level reports.' },
            ].map((flow, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              Walk through it with your own catalog.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes. We&rsquo;ll cover all four pieces using your actual products and customers, so you leave knowing exactly what this would look like for your brand.
            </p>
            <div className="space-y-4">
              {[
                'A live look at the quiz with your products',
                'How check-ins and reminders work',
                'A preview of your dashboard',
                'What setup on your site would look like',
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
                How it works
              </p>
              <div className="space-y-2.5">
                {[
                  { label: 'The Quiz', href: '#quiz' },
                  { label: 'Check-Ins', href: '#checkins' },
                  { label: 'Your Dashboard', href: '#dashboard' },
                  { label: 'Getting Set Up', href: '#setup' },
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
