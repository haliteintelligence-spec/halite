import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { HALLIE_URL, EXTERNAL_LINK_PROPS } from '@/lib/links'

// Its own metadata rather than the root layout's — this page sells an app to a
// shopper, and inheriting the B2B title would have it competing for consumer
// queries with copy written for CPG buyers.
export const metadata: Metadata = {
  title: 'Hallie — The Beauty App That Pays You for Your Shelf',
  description:
    'Track what you actually own, log what you use, and ask Hallie anything — she answers from your shelf, not a generic list. Earn points for every product, log and review. Your profile travels with you to every Halite partner brand.',
  keywords: [
    'beauty app that pays you',
    'skincare tracking app',
    'get paid for product reviews',
    'beauty routine tracker',
    'personalized skincare AI',
    'shelfie app',
    'product logging rewards',
  ],
  alternates: { canonical: 'https://haliteintelligence.com/hallie' },
  openGraph: {
    type: 'website',
    url: 'https://haliteintelligence.com/hallie',
    siteName: 'Halite Intelligence',
    title: 'Hallie — The Beauty App That Pays You for Your Shelf',
    description:
      'Add what you own. Log what you use. Get advice built on your actual products — and earn points you can cash out.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hallie — The Beauty App That Pays You for Your Shelf',
    description: 'Add what you own. Log what you use. Earn points you can cash out.',
  },
}

// Point values mirror hallie-web's own src/lib/constants.ts POINTS map.
// Deliberately no dollar conversion here — the rate and the payout threshold
// are the app's to state, not this page's to duplicate and let drift.
const HALLIE_POINTS = [
  { action: 'Daily log',              value: '+50' },
  { action: 'Complete your profile',  value: '+50' },
  { action: 'Milestone bonus',        value: '+50' },
  { action: 'Finish a category quiz', value: '+25' },
  { action: 'Review a product',       value: '+20' },
  { action: 'Add a product',          value: '+10' },
]

export default function HalliePage() {
  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: '#FAF6F0' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(620px 460px at 88% 0%, rgba(193,122,71,0.16), transparent 62%), radial-gradient(420px 420px at 0% 100%, rgba(69,15,42,0.06), transparent 60%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 md:pt-28 pb-16 grid grid-cols-1 lg:grid-cols-[1.32fr_0.68fr] gap-12 items-center w-full">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-6" style={{ color: '#C17A47' }}>
              For consumers · Beauty first, the whole shelf next
            </p>
            {/* Held to a single line from lg up — the nowrap is what guarantees it,
                the sizes are picked to fit the widened column at each breakpoint.
                Below lg it wraps naturally rather than shrinking to fit a phone. */}
            <h1
              className="font-display text-[30px] sm:text-[40px] lg:text-[46px] xl:text-[54px] lg:whitespace-nowrap font-semibold leading-[1.08] mb-6"
              style={{ color: '#1A0A12' }}
            >
              Meet <span style={{ color: '#C17A47' }}>Hallie</span>. She knows your shelf.
            </h1>
            <p className="text-lg leading-relaxed mb-9 max-w-2xl" style={{ color: '#8B6575' }}>
              Add the products you actually own. Log what you use. Hallie learns your skin, your
              hair, your scent, your shades — then carries that with you, so the next brand you shop
              already knows what fits. And every bit of it earns you points you can cash out.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <a
                href={HALLIE_URL}
                {...EXTERNAL_LINK_PROPS}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
                style={{ background: '#450F2A', color: '#FAF6F0' }}
              >
                Join Hallie — free
              </a>
              <a
                href="#rewards"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:bg-black/[0.03]"
                style={{ border: '1px solid #E8DDD0', color: '#1A0A12' }}
              >
                How you earn ↓
              </a>
            </div>
            <p className="text-[12px]" style={{ color: '#8B6575' }}>
              Android &amp; web today · iOS coming · No card, ever
            </p>
          </div>

          {/* Phone */}
          <div className="justify-self-center">
            <div className="rounded-[34px] p-2.5" style={{ width: 250, background: '#1A0A12', boxShadow: '0 30px 64px -22px rgba(26,10,18,0.4)' }}>
              <div className="rounded-[26px] overflow-hidden" style={{ background: '#FAF6F0' }}>
                <div className="h-6 flex items-center justify-center">
                  <div className="rounded-full" style={{ width: 56, height: 5, background: '#E8DDD0' }} />
                </div>
                <div className="px-4 pb-5 pt-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-[16px] font-semibold" style={{ color: '#1A0A12' }}>Hallie</span>
                    <span className="text-[10.5px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(193,122,71,0.16)', color: '#8B4A1E' }}>🔥 12</span>
                  </div>
                  <div className="rounded-[13px] rounded-bl-[4px] px-3 py-2.5 mb-2" style={{ background: '#F2EBE0' }}>
                    <p className="text-[11.5px] leading-snug" style={{ color: '#1A0A12' }}>
                      Your barrier serum is nearly empty and you rated it 5/5 twice. Want me to line up a repurchase reminder?
                    </p>
                  </div>
                  <div className="rounded-[13px] rounded-br-[4px] px-3 py-2.5 mb-3.5 ml-8" style={{ background: '#450F2A' }}>
                    <p className="text-[11.5px] leading-snug" style={{ color: '#FAF6F0' }}>yes — and what pairs with it?</p>
                  </div>
                  <div className="pt-2.5" style={{ borderTop: '1px solid #E8DDD0' }}>
                    <p className="text-[8.5px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: '#8B6575' }}>Today&rsquo;s log</p>
                    <div className="flex gap-1.5">
                      <div className="flex-1 rounded-[9px] px-2 py-2" style={{ background: '#F2EBE0' }}>
                        <p className="text-[9.5px]" style={{ color: '#8B6575' }}>Skin Care</p>
                        <p className="text-[11px] font-bold mt-0.5" style={{ color: '#2D7A3A' }}>Logged</p>
                      </div>
                      <div className="flex-1 rounded-[9px] px-2 py-2" style={{ background: '#F2EBE0' }}>
                        <p className="text-[9.5px]" style={{ color: '#8B6575' }}>Makeup</p>
                        <p className="text-[11px] font-bold mt-0.5" style={{ color: '#8B6575' }}>Not yet</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ONE PROFILE, EVERY BRAND ─────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-6" style={{ background: '#F2EBE0', borderTop: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: '#C17A47' }}>
              The part that saves you time
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-5" style={{ color: '#1A0A12' }}>
              Never fill out the same quiz twice.
            </h2>
            <p className="text-base leading-relaxed mb-5" style={{ color: '#8B6575' }}>
              You&rsquo;ve answered &ldquo;what&rsquo;s your skin type&rdquo; a hundred times, for a
              hundred brands, and none of them remembered. Build it once in Hallie and it comes with
              you: every Halite partner brand you shop starts off already knowing your type, your
              tone, your concerns and what&rsquo;s let you down before.
            </p>
            <p className="text-[15px] leading-relaxed" style={{ color: '#8B6575' }}>
              You decide when it travels — and you can switch it off, or take the whole thing with
              you, any time.
            </p>
          </div>

          <div className="rounded-3xl p-6 md:p-7" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-5" style={{ color: '#8B6575' }}>
              Your profile, at a new brand
            </p>
            <div className="space-y-2.5">
              {[
                'Skin type & concerns',
                'Hair type',
                'Undertone & Monk tone',
                "What's worked and what hasn't",
                'Your budget & the categories you buy',
              ].map(item => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: '#F2EBE0' }}>
                  <span className="text-[13.5px]" style={{ color: '#1A0A12' }}>{item}</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'rgba(45,122,58,0.14)', color: '#2D7A3A' }}>
                    Already known
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed mt-4" style={{ color: '#8B6575' }}>
              You walk in known. No quiz, no twenty questions, no starting over.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU DO ──────────────────────────────────────────────────── */}
      <section id="what" className="py-16 md:py-24 px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-3" style={{ color: '#1A0A12' }}>
            Four things. None of them take long.
          </h2>
          <p className="text-base mb-12 max-w-2xl" style={{ color: '#8B6575' }}>
            Each one earns points. Each one makes the next recommendation sharper — here and
            everywhere else you shop.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '◫', title: 'Build your shelf', body: 'Snap the bottle — Hallie reads the brand, name and size off the packaging. Or type it. Keep a Wishlist and a graveyard of Empties too.' },
              { icon: '◷', title: 'Log your day', body: 'Tick what you used, rate it, say how it went. Makeup gets two extras — how long it lasted, how it looked by the end of the day.' },
              { icon: '✦', title: 'Ask Hallie anything', body: 'She reads your profile, your quiz answers, your products and every log before she replies — so “what should I use tonight?” gets a real answer.' },
              { icon: '◎', title: 'Take the quiz', body: 'One per category — skin type, hair type, undertone, concerns, and your shade on the 10-tone Monk scale. This is the part that travels.' },
            ].map(c => (
              <div key={c.title} className="rounded-2xl p-6 md:p-7" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
                  style={{ background: 'rgba(193,122,71,0.15)', color: '#450F2A' }}
                >
                  {c.icon}
                </div>
                <h3 className="font-display text-lg font-semibold mb-2.5" style={{ color: '#1A0A12' }}>{c.title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: '#8B6575' }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES & SCOPE ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-6" style={{ background: '#F2EBE0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: '#C17A47' }}>
              Beauty first — not beauty only
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-4" style={{ color: '#1A0A12' }}>
              If you restock it, Hallie can track it.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#8B6575' }}>
              Beauty is where we started, because it&rsquo;s where the questions are hardest — shade,
              texture, skin tone, sensitivity. But the mechanics don&rsquo;t stop there, and neither
              do the brands on the other side of Halite. Anything you buy on repeat, use on a
              routine, and form an opinion about is something Hallie can learn from.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="rounded-3xl p-6 md:p-7" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full" style={{ background: '#2D7A3A', color: '#fff' }}>
                  Live now
                </span>
                <span className="text-[12.5px]" style={{ color: '#8B6575' }}>Five categories, each with its own questions</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Skin Care', 'Body Care', 'Hair Care', 'Makeup & Cosmetics', 'Perfume & Fragrance'].map(c => (
                  <span key={c} className="text-[12.5px] font-semibold px-4 py-2 rounded-full" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0', color: '#1A0A12' }}>
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#8B6575' }}>
                Perfume gets occasion, mood and season. Skin and body get AM/PM routine tags. Makeup
                gets a shade and a &ldquo;how well does this match me&rdquo; rating. The questions fit
                the product, so the answers are worth something.
              </p>
            </div>

            <div className="rounded-3xl p-6 md:p-7" style={{ background: '#450F2A' }}>
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full" style={{ background: '#C17A47', color: '#2A1206' }}>
                  Next
                </span>
                <span className="text-[12.5px]" style={{ color: 'rgba(250,246,240,0.55)' }}>The rest of the CPG shelf</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Personal care', 'Household', 'Wellness & supplements', 'Baby & family', 'Food & beverage'].map(c => (
                  <span key={c} className="text-[12.5px] font-semibold px-4 py-2 rounded-full" style={{ background: 'rgba(250,246,240,0.08)', border: '1px solid rgba(250,246,240,0.16)', color: 'rgba(250,246,240,0.75)' }}>
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.55)' }}>
                Same shelf, same log, same quiz — a different set of questions per category. Every
                category we add is another one your profile can walk into pre-answered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-3xl px-7 py-6" style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}>
            <p className="text-[34px] leading-none">🔥</p>
            <div>
              <p className="font-display text-xl font-semibold mb-0.5" style={{ color: '#1A0A12' }}>
                A streak, whatever the category
              </p>
              <p className="text-[13.5px] leading-relaxed" style={{ color: '#8B6575' }}>
                Any day you add, log or answer something counts — in your own timezone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── POINTS & REWARDS ─────────────────────────────────────────────── */}
      <section id="rewards" className="py-16 md:py-24 px-6 scroll-mt-16" style={{ background: '#450F2A' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              You&rsquo;re doing the work — you should be paid for it
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-5" style={{ color: '#FAF6F0' }}>
              Every product, every log, every answer earns points.
            </h2>
            <p className="text-base leading-relaxed mb-7 max-w-lg" style={{ color: 'rgba(250,246,240,0.65)' }}>
              No tiers, no expiry games, no catalogue of things you didn&rsquo;t want. Reach 1,500
              points and request a payout — you pick where it goes.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Zelle', 'PayPal', 'Revolut', 'Naira account'].map(m => (
                <span key={m} className="text-[12px] font-semibold px-3.5 py-2 rounded-full" style={{ background: 'rgba(250,246,240,0.08)', color: 'rgba(250,246,240,0.72)', border: '1px solid rgba(250,246,240,0.14)' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-6 md:p-7" style={{ background: 'rgba(250,246,240,0.07)', border: '1px solid rgba(250,246,240,0.13)' }}>
            <p className="text-[10.5px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'rgba(250,246,240,0.5)' }}>
              Your balance
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-display text-4xl font-semibold tabular-nums" style={{ color: '#FAF6F0' }}>1,180</span>
              <span className="text-[13px]" style={{ color: 'rgba(250,246,240,0.5)' }}>points</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(250,246,240,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: '78.6%', background: 'linear-gradient(90deg, #C17A47, #E0A374)' }} />
            </div>
            <p className="text-[11.5px] mb-6" style={{ color: 'rgba(250,246,240,0.5)' }}>
              320 points to your 1,500-point payout
            </p>

            <div className="pt-5 space-y-2.5" style={{ borderTop: '1px solid rgba(250,246,240,0.12)' }}>
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'rgba(250,246,240,0.4)' }}>
                How points land
              </p>
              {HALLIE_POINTS.map(p => (
                <div key={p.action} className="flex justify-between items-center text-[13px]" style={{ color: 'rgba(250,246,240,0.72)' }}>
                  <span>{p.action}</span>
                  <span className="font-bold tabular-nums" style={{ color: '#C17A47' }}>{p.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-[13px] pt-3 mt-1" style={{ color: 'rgba(250,246,240,0.72)', borderTop: '1px solid rgba(250,246,240,0.1)' }}>
                <span>Refer a friend</span>
                <span className="font-bold" style={{ color: '#C17A47' }}>you both earn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY + APP CTA ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-6" style={{ background: '#2D0A1C' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Your profile, your call
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight mb-4" style={{ color: '#FAF6F0' }}>
              It only travels because you let it.
            </h2>
            <p className="text-base leading-relaxed mb-7 max-w-lg" style={{ color: 'rgba(250,246,240,0.6)' }}>
              Sharing with partner brands is a separate consent you grant yourself, and can withdraw
              the same day. Download everything you&rsquo;ve ever entered, or delete your account and
              all of it, from your privacy dashboard.
            </p>
            <div className="space-y-3">
              {[
                'Opt-in brand sharing — off until you turn it on',
                'Export your full profile, any time',
                'Delete your account — it takes everything with it',
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

          <div className="rounded-3xl p-7 md:p-9 text-center" style={{ background: 'rgba(250,246,240,0.06)', border: '1px solid rgba(250,246,240,0.12)' }}>
            <h2 className="font-display text-2xl font-semibold mb-2.5" style={{ color: '#FAF6F0' }}>
              Start with one product.
            </h2>
            <p className="text-[14px] leading-relaxed mb-7" style={{ color: 'rgba(250,246,240,0.55)' }}>
              That&rsquo;s enough for Hallie to start. Everything after that is a couple of taps a day.
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href={HALLIE_URL}
                {...EXTERNAL_LINK_PROPS}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
                style={{ background: '#C17A47', color: '#2A1206' }}
              >
                Join Hallie — it&rsquo;s free
              </a>
              <a
                href={HALLIE_URL}
                {...EXTERNAL_LINK_PROPS}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.28)', color: '#FAF6F0' }}
              >
                Open Hallie in your browser ↗
              </a>
            </div>
            <p className="text-[11px] mt-5" style={{ color: 'rgba(250,246,240,0.35)' }}>
              Works in any browser · Android app available · iOS in progress
            </p>
          </div>
        </div>
      </section>

      {/* ── BACK TO THE BRAND SIDE ───────────────────────────────────────── */}
      <section className="py-14 md:py-16 px-6" style={{ background: '#F2EBE0', borderTop: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display text-2xl font-semibold mb-1" style={{ color: '#1A0A12' }}>
              Here for your brand instead?
            </p>
            <p className="text-[14px]" style={{ color: '#8B6575' }}>
              Halite is the other side of this — the platform CPG brands use to meet customers who
              already have a profile.
            </p>
          </div>
          <a
            href="/"
            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#450F2A', color: '#FAF6F0' }}
          >
            See Halite for brands ↗
          </a>
        </div>
      </section>

      <Footer />
    </>
  )
}
