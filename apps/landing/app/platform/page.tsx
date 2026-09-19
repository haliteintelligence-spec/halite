import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'
import { Footer } from '@/components/Footer'
import { ConnectedStorefront } from '@/components/ConnectedStorefront'

export const metadata = {
  title: 'How It Works',
  description:
    'How Halite works for beauty & fragrance brands: a profile that arrives already built, your own catalog ranked against it with a reason under every pick, outcomes flowing back, and a plain-language dashboard. One link on your site, no quiz to build.',
  alternates: {
    canonical: 'https://haliteintelligence.com/platform',
  },
  openGraph: {
    url: 'https://haliteintelligence.com/platform',
    title: 'How It Works — Halite Intelligence',
    description:
      'Everything that happens before a shopper answers a single question — from a pre-built profile landing on your product page to knowing which of your products actually worked.',
  },
}

// The four pieces, in the order a shopper meets them. Setup is deliberately not
// one of them: it is what we do before any of this runs, and it has its own
// section further down.
const PILLARS = [
  { id: 'profile',   label: 'The profile',   sublabel: 'Arrives already built',       icon: '◈' },
  { id: 'ranking',   label: 'The ranking',   sublabel: 'Your catalog, scored to fit', icon: '✦' },
  { id: 'outcomes',  label: 'The outcomes',  sublabel: 'You learn what worked',       icon: '◉' },
  { id: 'dashboard', label: 'Your dashboard', sublabel: 'The whole picture, plainly', icon: '▲' },
]

function StatRow({ stats, dark }: { stats: { n: string; label: string }[]; dark?: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <div
          key={s.label}
          className="rounded-2xl p-6 text-center"
          style={
            dark
              ? { background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.1)' }
              : { background: '#F2EBE0', border: '1px solid #E8DDD0' }
          }
        >
          <p className="font-display text-3xl font-semibold mb-2" style={{ color: dark ? '#C17A47' : '#450F2A' }}>
            {s.n}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: dark ? 'rgba(250,246,240,0.55)' : '#8B6575' }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function ModuleHead({
  icon, title, body, dark,
}: { icon: string; title: string; body: string; dark?: boolean }) {
  return (
    <div className="flex items-start gap-6 mb-12 md:mb-16">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
        style={{ background: dark ? 'rgba(193,122,71,0.15)' : 'rgba(69,15,42,0.08)' }}
      >
        <span className="text-lg" style={{ color: dark ? '#C17A47' : '#450F2A' }}>{icon}</span>
      </div>
      <div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold leading-snug" style={{ color: dark ? '#FAF6F0' : '#1A0A12' }}>
          {title}
        </h2>
        <p className="text-base mt-3 max-w-2xl" style={{ color: dark ? 'rgba(250,246,240,0.6)' : '#8B6575' }}>
          {body}
        </p>
      </div>
    </div>
  )
}

export default function Platform() {
  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-[1.875rem] px-6 overflow-hidden" style={{ background: '#450F2A' }}>
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
            How it works, for beauty &amp; fragrance brands
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.06] mb-6" style={{ color: '#FAF6F0' }}>
            Everything that happens{' '}
            <span style={{ color: '#C17A47' }}>before they answer a question.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.65)' }}>
            Four pieces, working together — from a profile landing on your product page already built,
            to knowing which of your products actually worked.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[...PILLARS, { id: 'setup', label: 'Getting set up' }].map(m => (
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

      {/* ── THE FOUR PIECES ──────────────────────────────────────────────── */}
      <section className="py-6 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch gap-0 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(250,246,240,0.08)' }}>
            {PILLARS.map((step, i) => (
              <a
                key={step.label}
                href={`#${step.id}`}
                className="flex-1 p-6 flex flex-col gap-3 transition-colors hover:bg-white/[0.03]"
                style={{
                  background: 'rgba(250,246,240,0.04)',
                  borderRight: i < PILLARS.length - 1 ? '1px solid rgba(250,246,240,0.08)' : 'none',
                }}
              >
                <span className="text-lg" style={{ color: '#C17A47' }}>{step.icon}</span>
                <p className="font-display text-base font-semibold" style={{ color: '#FAF6F0' }}>{step.label}</p>
                <p className="text-[12px]" style={{ color: 'rgba(250,246,240,0.4)' }}>{step.sublabel}</p>
              </a>
            ))}
          </div>
          <p className="text-center text-[12px] mt-5" style={{ color: 'rgba(250,246,240,0.3)' }}>
            Each piece feeds the next — and the profile the shopper owns gets sharper with every pass.
          </p>
        </div>
      </section>

      {/* ── 1: THE PROFILE ───────────────────────────────────────────────── */}
      <section id="profile" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <ModuleHead
            icon="◈"
            title="The profile arrives before they do."
            body="A connected shopper lands on your product page already known. There is no form to fill in, no account to create on your side, and no twenty questions asked before you have given them anything."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12 md:mb-16">
            <div className="rounded-3xl p-6 md:p-8" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#8B6575' }}>
                  What lands on your site
                </p>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(45,122,58,0.14)', color: '#2D7A3A' }}>
                  0 questions asked
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  'Skin type & concerns',
                  'Routine length they keep',
                  'Textures they reach for',
                  'Sensitivities & what to avoid',
                  'What they usually spend',
                  'Shade, on the 10-tone Monk scale',
                ].map(field => (
                  <div key={field} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
                    <span className="text-[13.5px] font-semibold" style={{ color: '#1A0A12' }}>{field}</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'rgba(69,15,42,0.07)', color: '#450F2A' }}>
                      Already known
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {[
                { title: 'One tap, not a funnel', body: 'They connect the profile they already built in Hallie. It is on your page before they finish scrolling.' },
                { title: 'Scoped to what you sell', body: 'A skincare brand sees the skincare profile. Not their hair, makeup or fragrance answers, and never another brand’s customers.' },
                { title: 'New to Halite? They onboard in place', body: 'A shopper without a profile takes the Halite onboarding quiz inside the plug-in on your site, which builds it as they answer. They still get personalized picks on that first visit.' },
                { title: 'Theirs to switch off', body: 'Every connection is an explicit permission from the person, recorded against your brand, and revocable from either side at any time.' },
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

          <StatRow
            stats={[
              { n: '0', label: 'Questions a connected shopper has to answer' },
              { n: '1 tap', label: 'From landing on your page to being known' },
              { n: '10', label: 'Skin tones supported, on the Monk scale' },
              { n: 'Per category', label: 'How far a brand can see, and no further' },
            ]}
          />
        </div>
      </section>

      {/* ── 2: THE RANKING ───────────────────────────────────────────────── */}
      <section id="ranking" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto">
          <ModuleHead
            dark
            icon="✦"
            title="Your catalog, ranked against that profile."
            body="Every product you sell, scored against what this person actually needs — with a plain-English reason under each pick, including the ones that got pushed down."
          />

          <div className="mb-12 md:mb-16">
            <ConnectedStorefront />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12 md:mb-16">
            {[
              { title: 'Only your products', body: "Every pick comes from your own catalog. Never a generic recommendation, never something you don't sell." },
              { title: 'A reason under every pick', body: 'Written in the shopper’s own terms — the concern they named, the texture they prefer, the budget they keep to.' },
              { title: 'It says why not, too', body: 'A product that scores badly shows what pushed it down, so a recommendation reads as advice rather than advertising.' },
              { title: 'Sharper every visit', body: 'What they buy and how it goes feeds back in, so the second visit starts from a better place than the first.' },
            ].map(item => (
              <div key={item.title} className="rounded-2xl p-6" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.1)' }}>
                <h3 className="font-display text-lg font-semibold mb-2.5" style={{ color: '#FAF6F0' }}>{item.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.55)' }}>{item.body}</p>
              </div>
            ))}
          </div>

          <StatRow
            dark
            stats={[
              { n: '100%', label: 'Of picks come from your own catalog' },
              { n: '94%', label: 'Customers say the match was right' },
              { n: 'Every', label: 'Product carries a reason, ranked or not' },
              { n: '10', label: 'Skin tones reported on separately' },
            ]}
          />
        </div>
      </section>

      {/* ── 3: THE OUTCOMES ──────────────────────────────────────────────── */}
      <section id="outcomes" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <ModuleHead
            icon="◉"
            title="Then you find out whether it worked."
            body="Instead of waiting for a return or a review, Halite asks how it is going on a regular cadence. Every answer updates the profile the shopper owns — and tells you, at the product level, what is landing."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12 md:mb-16">
            <div className="space-y-4">
              {[
                { icon: '◎', title: 'Outcomes at the product level', body: 'Customers rate how a product is working across a few key measures. Every answer updates their profile and your reports.' },
                { icon: '⬡', title: "What worked, and what didn't", body: 'Good reactions and bad ones both get logged against the specific product, so you know what to fix and what to double down on.' },
                { icon: '◈', title: 'Are they still using it?', body: "We track whether people stick with what they bought. A drop-off is one of the earliest signs someone is about to leave." },
                { icon: '▲', title: 'A progress update, written for them', body: 'Customers see a simple summary of their own progress. You see the trend data behind it.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-5 rounded-2xl" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(69,15,42,0.08)', color: '#450F2A' }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: '#1A0A12' }}>{item.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#8B6575' }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl p-6 md:p-8 flex flex-col gap-4" style={{ background: '#450F2A' }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgba(250,246,240,0.5)' }}>Week 6 check-in</p>
              {[
                { label: 'Hydration', score: 8, prev: 5 },
                { label: 'Clarity', score: 7, prev: 4 },
                { label: 'Texture', score: 9, prev: 6 },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] font-medium" style={{ color: 'rgba(250,246,240,0.8)' }}>{m.label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: '#FAF6F0' }}>
                      {m.score}/10{' '}
                      <span className="text-[10px] font-normal" style={{ color: 'rgba(250,246,240,0.45)' }}>(was {m.prev})</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(250,246,240,0.12)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.score * 10}%`, background: 'linear-gradient(to right, #C17A47, #e8a870)' }} />
                  </div>
                </div>
              ))}
              <div className="mt-2 rounded-xl p-3.5" style={{ background: 'rgba(250,246,240,0.06)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.75)' }}>
                  &ldquo;Jamie&rsquo;s hydration has improved a lot over the last 4 weeks — the Barrier
                  Repair Cream looks like the strongest driver.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <StatRow
            stats={[
              { n: '83%', label: 'Average check-in response rate' },
              { n: 'Week 1', label: 'When you first see real outcome data' },
              { n: '↑64%', label: 'Average improvement customers report, 8 weeks in' },
              { n: '3×', label: 'More likely to reorder after checking in' },
            ]}
          />
        </div>
      </section>

      {/* ── 4: YOUR DASHBOARD ────────────────────────────────────────────── */}
      <section id="dashboard" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto">
          <ModuleHead
            dark
            icon="▲"
            title="One dashboard, in plain language."
            body="Every profile, ranking and outcome rolls up into one view of who your customers are, what they need, and what is actually working — built to be read by your team, not a data analyst."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-12 md:mb-16">
            <div className="rounded-3xl p-6" style={{ background: 'rgba(250,246,240,0.05)', border: '1px solid rgba(250,246,240,0.1)' }}>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                {[
                  { l: 'Active customers', v: '4,218', d: '↑ 12%' },
                  { l: 'Happiness score', v: '7.4 / 10', d: '↑ 0.8' },
                  { l: 'Top concern', v: 'Dryness', d: '38% of customers' },
                  { l: 'At risk of leaving', v: '6.2%', d: '↓ 1.4%' },
                ].map(card => (
                  <div key={card.l} className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(250,246,240,0.06)' }}>
                    <p className="text-[10.5px] uppercase tracking-wide font-bold mb-1" style={{ color: 'rgba(250,246,240,0.45)' }}>{card.l}</p>
                    <p className="font-display text-lg font-semibold" style={{ color: '#FAF6F0' }}>{card.v}</p>
                    <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#C17A47' }}>{card.d}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(250,246,240,0.06)' }}>
                <p className="text-[10.5px] uppercase tracking-wide font-bold mb-2.5" style={{ color: 'rgba(250,246,240,0.45)' }}>Top concerns, by customer group</p>
                <div className="flex items-end gap-1.5" style={{ height: 52 }}>
                  {[62, 45, 38, 71, 55, 48, 65, 52].map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${(v / 71) * 100}%`, background: i === 3 ? '#C17A47' : 'rgba(250,246,240,0.18)' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {[
                { title: 'A single view of your customers', body: 'Total active customers, happiness scores, top concerns and how engaged people are — updated automatically as outcomes come in.', tags: ['Active customers', 'Happiness trends', 'Top concerns', 'Engagement rates'] },
                { title: "See what's actually working", body: 'Which products and ingredients drive the best results across your customer base — and where you have a gap in your lineup, before a competitor fills it.', tags: ['Product performance', 'Reaction flags', 'Formulation gaps', 'Product rankings'] },
                { title: 'A heads-up before customers leave', body: 'Dropping engagement and satisfaction are early warning signs. We surface who is at risk so your team can reach out first.', tags: ['Risk scoring', 'Who to reach out to', 'Compliance alerts', 'Win-back timing'] },
                { title: 'How you compare to the market', body: 'Your concern distribution against anonymized, market-level trends — so you know where your lineup fits and where the white space is.', tags: ['Market trends', 'Concern benchmarks', 'Portfolio fit'] },
              ].map(item => (
                <div key={item.title}>
                  <h3 className="font-display text-lg font-semibold mb-2" style={{ color: '#FAF6F0' }}>{item.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'rgba(250,246,240,0.55)' }}>{item.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(250,246,240,0.07)', color: 'rgba(250,246,240,0.65)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StatRow
            dark
            stats={[
              { n: '10+', label: 'Easy-to-read reports, built for your brand' },
              { n: 'Live', label: 'Updates as outcomes come in' },
              { n: 'CSV', label: 'Export any report, anytime' },
              { n: 'All', label: 'Skin tones reported on separately' },
            ]}
          />
        </div>
      </section>

      {/* ── GETTING SET UP ───────────────────────────────────────────────── */}
      <section id="setup" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <ModuleHead
            icon="◇"
            title="One link on your site. No quiz to build."
            body="Everything above runs inside a plug-in we install for you. Your customers never leave your store, you never touch a line of code, and there is no questionnaire for your team to write or maintain."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-12 md:mb-16">
            <div>
              <div className="space-y-4 mb-8">
                {[
                  { n: '1', title: 'Send us your catalog', body: 'A spreadsheet works fine, or connect Shopify and it syncs on its own.' },
                  { n: '2', title: 'We build and install it', body: "Matched to your brand's colours and voice — you approve the whole thing before launch." },
                  { n: '3', title: "You're live", body: 'Typically about a week from the first call. Shopify brands can go faster.' },
                ].map(s => (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: '#450F2A', color: '#FAF6F0' }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-[14.5px] font-semibold mb-0.5" style={{ color: '#1A0A12' }}>{s.title}</p>
                      <p className="text-[13px]" style={{ color: '#8B6575' }}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {['Shopify', 'Webflow', 'WordPress', 'Squarespace', 'Any website'].map(p => (
                  <span key={p} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: '#F2EBE0', color: '#8B6575', border: '1px solid #E8DDD0' }}>
                    {p}
                  </span>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(193,122,71,0.1)', border: '1px solid rgba(193,122,71,0.25)' }}>
                <p className="text-[12px] font-semibold mb-1" style={{ color: '#A85B2A' }}>✦ We keep adding to this list</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#8B6575' }}>
                  We&rsquo;re progressively adding integrations with more of the platforms already in
                  your stack — your ESP, your CRM, your helpdesk. Tell us what you run and we&rsquo;ll
                  tell you where it sits.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { icon: '◈', title: 'Profile connect, in one tap', detail: 'No redirect · no account on your side', body: 'A connected shopper is recognised on your storefront and sees personalized picks immediately.' },
                { icon: '◎', title: 'Onboarding for anyone new', detail: 'In the plug-in · builds the profile as they go', body: 'A shopper without a profile answers the Halite onboarding questions in place, and gets the same personalized result on that first visit.' },
                { icon: '⬡', title: 'Outcome prompts, timed well', detail: 'Automatic · no app required', body: 'Well-timed nudges bring customers back to say how a product is working. Every answer sharpens the profile.' },
                { icon: '✦', title: 'Looks like your brand', detail: 'Your colours, your voice', body: 'Accent colour, font weight and placement all match your site. Full white-label available on Enterprise.' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl p-5" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                  <div className="flex gap-4 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(69,15,42,0.08)', color: '#450F2A' }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: '#1A0A12' }}>{item.title}</p>
                      <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#C17A47' }}>{item.detail}</p>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#8B6575' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <StatRow
            stats={[
              { n: '~1 wk', label: 'From signup to live on your site' },
              { n: '0', label: 'Lines of code required from you' },
              { n: '0', label: 'Quiz questions for your team to write' },
              { n: '1', label: 'Link that goes on your site' },
            ]}
          />
        </div>
      </section>

      {/* ── HOW IT ALL FITS TOGETHER ─────────────────────────────────────── */}
      <section className="py-[2.25rem] px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
            How it all fits together
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
            Every piece makes the others sharper.
          </h2>
          <p className="text-base leading-relaxed mb-12 md:mb-16 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.6)' }}>
            The profile says what someone needs. The ranking turns that into picks from your catalog.
            Outcomes say whether those picks were right, and feed straight back into both — for you,
            and for the next brand they meet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
            {[
              { from: 'Profile', to: 'Ranking', signal: 'What a shopper already told Hallie decides what your catalog surfaces first.' },
              { from: 'Outcomes', to: 'Ranking', signal: 'What actually worked refines the next set of picks, automatically.' },
              { from: 'Outcomes', to: 'Dashboard', signal: 'Every response becomes a data point in your brand-level reports.' },
            ].map((flow, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.1)' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#C17A47', color: '#2A1206' }}>{flow.from}</span>
                  <span style={{ color: 'rgba(250,246,240,0.4)' }}>→</span>
                  <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(250,246,240,0.1)', color: '#FAF6F0' }}>{flow.to}</span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>{flow.signal}</p>
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
      <section id="demo" className="py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#2D0A1C' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Get a demo
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5" style={{ color: '#FAF6F0' }}>
              Walk through it with your own catalog.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes. We&rsquo;ll rank your real products against a real profile, so you leave
              knowing exactly what a connected shopper would see on your site.
            </p>
            <div className="space-y-4">
              {[
                'What a shopper sees the moment they connect',
                'Your catalog, ranked and explained',
                'How outcomes come back to you',
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
            <p className="text-[13px] mt-8" style={{ color: 'rgba(250,246,240,0.4)' }}>
              Or email <span style={{ color: 'rgba(250,246,240,0.7)' }}>demo@haliteintelligence.com</span>
            </p>
          </div>

          <DemoForm />
        </div>
      </section>

      <Footer />
    </>
  )
}
