import { Nav } from '@/components/Nav'
import { DemoForm } from '@/components/DemoForm'
import { Footer } from '@/components/Footer'
import { HeroProductCards } from '@/components/ConnectedStorefront'
import { BuildMockup, AccessMockup, PersonalizeMockup } from '@/components/StepMockups'

type Cell = 'yes' | 'partial' | 'no'
// The first three rows are the network rows. They sit at the top deliberately:
// every row below them is a feature-parity argument a competitor could close
// with a roadmap, while these can only be closed by having a consented,
// cross-brand profile — which is the whole thesis of the page.
const COMPARE_ROWS: { feature: string; halite: Cell; revieve: Cell; klaviyo: Cell; outersignal: Cell; network?: boolean }[] = [
  { feature: 'Customers arrive with a profile already built',             halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no', network: true },
  { feature: 'Profile follows the customer across brands',                halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no', network: true },
  { feature: 'The shopper builds and controls it themselves',             halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no', network: true },
  { feature: 'Personalized recs from your real catalog',                  halite: 'yes', revieve: 'yes',     klaviyo: 'partial', outersignal: 'no' },
  { feature: 'Learns and gets sharper with every check-in',               halite: 'yes', revieve: 'no',      klaviyo: 'no',      outersignal: 'no' },
  { feature: 'Warns you before a customer leaves',                        halite: 'yes', revieve: 'no',      klaviyo: 'partial', outersignal: 'no' },
  { feature: "Know which products customers love (and which they don't)", halite: 'yes', revieve: 'no',      klaviyo: 'partial', outersignal: 'no' },
]

// The eight promises from the one-pager, in its order. Two columns of four on
// desktop so the pairing from the printed sheet survives.
const WHAT_BRANDS_GET = [
  { icon: '◎', title: 'Personalized storefront',    body: "A store shaped to each shopper's skin, routine and goals — from the first page they land on." },
  { icon: '✦', title: 'Real product matches',       body: 'They see why each pick fits. Recommendations that read as helpful, not as advertising.' },
  { icon: '⬡', title: 'Higher quiz completion',     body: 'One-tap permission replaces the drop-off quiz. Nobody abandons a form they never had to fill in.' },
  { icon: '◈', title: 'The whole customer',         body: 'Their full routine and outcomes — not just the two things they happened to buy from you.' },
  { icon: '⟳', title: 'Grow retention and reorders',body: 'Time replenishment, recommend the next product, and lift AOV and lifetime value together.' },
  { icon: '◇', title: 'Cross-brand signals',        body: 'Which ingredients and notes they use elsewhere — for basket size and for product development.' },
  { icon: '▲', title: 'Affiliate reach on Hallie',  body: 'Your catalog surfaced to high-intent shoppers already telling Hallie what they need.' },
  { icon: '❖', title: 'Future-ready for AI',        body: 'Clean, structured context that AI shopping agents can actually act on when they arrive.' },
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

      {/* ── HERO ──────────────────────────────────────────────────────────
          Deliberately short. The headline, the promise and two buttons — the
          argument is made by the storefront image directly below it, not by
          more paragraphs here. */}
      <section className="relative overflow-hidden" style={{ background: '#450F2A' }}>
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(620px 460px at 82% -10%, rgba(193,122,71,0.20), transparent 62%), radial-gradient(460px 440px at 8% 100%, rgba(193,122,71,0.12), transparent 60%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-[2.25rem] md:pt-20 md:pb-[2.625rem] grid grid-cols-1 lg:grid-cols-[1.06fr_0.94fr] gap-12 lg:gap-14 items-center w-full">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-6" style={{ color: 'rgba(250,246,240,0.55)' }}>
              For beauty &amp; fragrance brands
            </p>
            <h1
              className="font-display text-[38px] sm:text-5xl md:text-[50px] lg:text-[54px] font-semibold leading-[1.08] mb-6"
              style={{ color: '#FAF6F0' }}
            >
              Turn every shopper into a{' '}
              <span style={{ color: '#C17A47' }}>known customer.</span>
            </h1>
            <p className="text-[17px] md:text-lg leading-relaxed mb-9 max-w-xl" style={{ color: 'rgba(250,246,240,0.74)' }}>
              Your customers build one profile — their full routine, preferences and goals — and your
              brand gets to access it in one tap. So from their very first visit, your store already
              knows them.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-9">
              <a
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-[14.5px] font-semibold transition-all hover:opacity-90"
                style={{ background: '#FAF6F0', color: '#450F2A' }}
              >
                Book a demo
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-[14.5px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.32)', color: '#FAF6F0' }}
              >
                See how it works ↓
              </a>
            </div>

            {/* The trust line from the bottom of the one-pager, promoted into the
                hero — for a data product, the consent terms are part of the pitch. */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {['Consumer-permissioned', 'One link on your site', 'Live in a week'].map(t => (
                <span key={t} className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: 'rgba(250,246,240,0.55)' }}>
                  <span style={{ color: '#C17A47' }}>✦</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* The picks themselves, floating over the burgundy — the whole
              pitch in one object. */}
          <HeroProductCards />
        </div>

      </section>

      {/* ── CATEGORY STRIP ───────────────────────────────────────────────
          Gleame's slot for customer logos. We don't have a wall of them yet, so
          this says what the profile is built to carry instead of implying
          customers we can't name. */}
      <section className="pt-[1.3125rem] md:pt-[1.875rem] pb-2 px-6" style={{ background: '#FAF6F0' }}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-7" style={{ color: '#C4B5BD' }}>
            Built for the categories where fit decides the sale
          </p>
          {/* Spread edge to edge once there is room for one row; below that the
              names wrap and centre, which is the only thing that reads. */}
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-x-8 gap-y-4">
            {['Skincare', 'Haircare', 'Fragrance', 'Body & bath', 'Colour cosmetics', 'Wellness'].map(c => (
              <span key={c} className="font-display text-[18px] md:text-[22px] whitespace-nowrap" style={{ color: '#8B6575' }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────
          The one-pager's three steps, verbatim in structure: Build, Access,
          Personalize. */}
      <section id="how" className="py-6 md:py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              How it works
            </p>
            <h2 className="font-display text-3xl md:text-[42px] font-semibold leading-tight" style={{ color: '#1A0A12' }}>
              Three steps, and none of them are yours.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              { n: '01', title: 'Build',       mockup: <BuildMockup />,       body: 'Shoppers build it in Hallie — their routine, their concerns, what actually worked. You write none of it.' },
              { n: '02', title: 'Access',      mockup: <AccessMockup />,      body: 'One tap on your site connects it. No quiz, no form, no account — and revocable any time.' },
              { n: '03', title: 'Personalize', mockup: <PersonalizeMockup />, body: 'Your catalog, ranked against that profile, with a plain reason under every pick.' },
            ].map(s => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <span
                  className="font-display text-[15px] font-semibold w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#FFFFFF', border: '1px solid #E8DDD0', color: '#C17A47' }}
                >
                  {s.n}
                </span>
                {s.mockup}
                <h3 className="font-display text-[22px] font-semibold mt-6 mb-2.5" style={{ color: '#1A0A12' }}>{s.title}</h3>
                <p className="text-[14px] leading-relaxed max-w-[34ch]" style={{ color: '#8B6575' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT BRANDS GET ──────────────────────────────────────────────── */}
      <section id="get" className="py-6 md:py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#450F2A' }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mb-12 md:mb-16">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(193,122,71,0.9)' }}>
              What brands get
            </p>
            <h2 className="font-display text-3xl md:text-[40px] lg:text-[42px] font-semibold leading-tight lg:whitespace-nowrap" style={{ color: '#FAF6F0' }}>
              Eight things you can&rsquo;t buy anywhere else.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 md:gap-y-10">
            {WHAT_BRANDS_GET.map(item => (
              <div key={item.title} className="flex gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0"
                  style={{ background: 'rgba(193,122,71,0.16)', color: '#C17A47' }}
                >
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-display text-[19px] font-semibold mb-1.5" style={{ color: '#FAF6F0' }}>{item.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.6)' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      <section style={{ background: '#F2EBE0', borderBottom: '1px solid #E8DDD0' }}>
        <div className="max-w-7xl mx-auto px-6 py-[1.3125rem] grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
          {[
            { n: '30%',    label: 'More customers come back and buy again after a personalized recommendation.' },
            { n: '15–18%', label: 'More people buy when they get a match built for them, instead of browsing alone.' },
            { n: '39%',    label: 'Bigger orders when the recommendation actually fits what someone needs.' },
            { n: '50%',    label: "Lower cost to win new customers — because you're keeping more of the ones you have." },
          ].map(item => (
            <div key={item.label} className="text-center px-2">
              <p className="font-display text-4xl md:text-5xl font-semibold" style={{ color: '#450F2A' }}>{item.n}</p>
              <p className="text-[12.5px] mt-3 leading-relaxed mx-auto max-w-[30ch]" style={{ color: '#8B6575' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE PORTABLE PROFILE ─────────────────────────────────────────── */}
      <section id="profile" className="py-6 md:py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              The portable profile
            </p>
            <h2 className="font-display text-3xl md:text-[42px] font-semibold leading-tight mb-4" style={{ color: '#1A0A12' }}>
              Day one isn&rsquo;t day zero.
            </h2>
            <p className="text-base md:text-[17px] leading-relaxed" style={{ color: '#8B6575' }}>
              A Halite profile belongs to the person, not to any one brand. They build it once and it
              travels with them, with their consent, to every Halite brand they meet next. Your store
              is never their first conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-3xl p-7 md:p-9" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
              <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-6" style={{ color: '#8B6575' }}>
                Without Halite
              </p>
              <div className="space-y-4">
                {[
                  'A stranger lands on your product page',
                  "You ask for twenty answers before you've given them anything",
                  'Most drop out; the rest get a first guess',
                  'Months of orders before you know whether it fit',
                ].map((line, i) => (
                  <div key={line} className="flex gap-4">
                    <span className="text-[13px] font-semibold flex-shrink-0 mt-px" style={{ color: '#C4B5BD' }}>{i + 1}</span>
                    <span className="text-[14.5px] leading-relaxed" style={{ color: '#8B6575' }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-7 md:p-9" style={{ background: '#450F2A' }}>
              <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-6" style={{ color: '#C17A47' }}>
                With Halite
              </p>
              <div className="space-y-4">
                {[
                  'They arrive already carrying a profile',
                  'One tap to connect it — there is no quiz to abandon',
                  'The first recommendation is precise, from your catalog',
                  'What they buy and how it goes sharpens it for next time',
                ].map((line, i) => (
                  <div key={line} className="flex gap-4">
                    <span className="text-[13px] font-semibold flex-shrink-0 mt-px" style={{ color: '#C17A47' }}>{i + 1}</span>
                    <span className="text-[14.5px] leading-relaxed" style={{ color: 'rgba(250,246,240,0.85)' }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            {[
              { title: 'One person, one profile', body: 'Not a cookie and not an email list. One identity per person across every Halite brand, built from what they told us themselves.' },
              { title: 'Brand-agnostic by design', body: 'Skin type, hair type, undertone, concerns and goals travel. Your catalog, your pricing and your customer list stay yours alone.' },
              { title: 'Consent is the gate',      body: 'Nothing moves between brands until the person switches partner sharing on, and it stops the moment they switch it off.' },
            ].map(c => (
              <div key={c.title} className="rounded-2xl p-6 md:p-7" style={{ background: '#F2EBE0', border: '1px solid #E8DDD0' }}>
                <h3 className="font-display text-[18px] font-semibold mb-2.5" style={{ color: '#1A0A12' }}>{c.title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: '#8B6575' }}>{c.body}</p>
              </div>
            ))}
          </div>

          <p className="text-[13px] mt-8 max-w-2xl" style={{ color: '#C4B5BD' }}>
            Consumer-permissioned · only aggregate signals are shared across brands.
          </p>
        </div>
      </section>

      {/* ── COMPARISON ───────────────────────────────────────────────────── */}
      <section id="compare" className="py-6 md:py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#F2EBE0', borderTop: '1px solid #E8DDD0' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: '#C17A47' }}>
              Why brands choose Halite
            </p>
            <h2 className="font-display text-3xl md:text-[42px] font-semibold" style={{ color: '#1A0A12' }}>
              The only one where the customer arrives already known.
            </h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: '#8B6575' }}>
              Other tools start every customer from scratch, then stop once they&rsquo;ve suggested a
              product. Halite starts warm — and keeps listening.
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
                      className="sm:sticky sm:left-0 sm:z-[2] text-left px-4 sm:px-6 py-5 text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{ background: '#F2EBE0', color: '#8B6575', borderBottom: '1px solid #E8DDD0' }}
                    >
                      Compare features
                    </th>
                    <th
                      className="sm:sticky sm:z-[2] text-center px-4 py-5"
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
                    // Network rows get their own copper wash rather than joining
                    // the zebra stripe — they're the reason the table exists, not
                    // just its first three entries.
                    const stripe = row.network ? 'rgba(193,122,71,0.09)' : i % 2 === 0 ? '#FAF6F0' : '#F2EBE0'
                    return (
                      <tr key={row.feature}>
                        <td
                          className="sm:sticky sm:left-0 sm:z-[2] text-left px-4 sm:px-6 py-3.5 text-[13.5px] font-semibold"
                          style={{ background: stripe, color: '#1A0A12', borderBottom: '1px solid #E8DDD0' }}
                        >
                          {row.feature}
                        </td>
                        <td
                          className="sm:sticky sm:z-[2] text-center px-4 py-3.5"
                          style={{ left: 240, background: row.network ? 'rgba(69,15,42,0.1)' : 'rgba(69,15,42,0.06)', borderBottom: '1px solid #E8DDD0', boxShadow: '6px 0 10px -6px rgba(26,10,18,0.18)' }}
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

      {/* ── THE LOOP — handover to the consumer side ─────────────────────── */}
      <section id="loop" className="py-[1.3125rem] md:py-6 px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2.5" style={{ color: '#C17A47' }}>
              One company, both sides of the shelf
            </p>
            <p className="font-display text-2xl md:text-[28px] font-semibold mb-2 leading-snug" style={{ color: '#1A0A12' }}>
              The shopper builds it. The brand benefits. The shopper gets paid.
            </p>
            <p className="text-[14.5px] leading-relaxed" style={{ color: '#8B6575' }}>
              Halite is the brand side. Hallie is the app where people build and own the profile —
              and earn points for keeping it current. Neither works without the other, and the person
              sits at the switch.
            </p>
          </div>
          <a
            href="/hallie"
            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#C17A47', color: '#2A1206' }}
          >
            See the shopper&rsquo;s side ↗
          </a>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section id="demo" className="py-6 md:py-[2.25rem] px-6 scroll-mt-16" style={{ background: '#450F2A' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-4" style={{ color: 'rgba(193,122,71,0.9)' }}>
              Book a demo
            </p>
            <h2 className="font-display text-3xl md:text-[42px] font-semibold mb-5 leading-tight" style={{ color: '#FAF6F0' }}>
              See your own store, already knowing someone.
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(250,246,240,0.65)' }}>
              30 minutes, no slides. We&rsquo;ll rank your real catalog against a real profile and walk
              through exactly what a connected shopper would see on your site.
            </p>
            <div className="space-y-4">
              {[
                'Your catalog, ranked against a live profile',
                'What a shopper sees the moment they connect',
                'Exactly what you see, and what you never see',
                'Pilot scope, timeline and what we need from you',
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
