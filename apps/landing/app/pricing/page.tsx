import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Pricing & FAQ',
  description:
    'What Halite costs, how long it takes to go live, what your brand sees and what it never sees. Pricing is quoted per brand — book a demo and we will scope it against your catalog and traffic.',
  alternates: {
    canonical: 'https://haliteintelligence.com/pricing',
  },
  openGraph: {
    url: 'https://haliteintelligence.com/pricing',
    title: 'Pricing & FAQ — Halite Intelligence',
    description:
      'Pricing is quoted per brand, against your catalog and your traffic. Everything else brands ask before a pilot, answered here.',
  },
}

type Answer = { q: string; a: string; cta?: boolean }
type Group = { id: string; label: string; blurb: string; items: Answer[] }

// The pricing group leads, because it is the reason most people open this page.
// Its first answer deliberately does not quote a number: the number depends on
// the catalog and the traffic, and guessing it here would mean walking it back
// on the call.
const GROUPS: Group[] = [
  {
    id: 'pricing',
    label: 'Pricing',
    blurb: 'Quoted per brand, because the work is different per brand.',
    items: [
      {
        q: 'How much does Halite cost?',
        a: "We quote it per brand rather than publishing a tier, because what we build is shaped by your catalog, your categories and how much traffic comes through your store. A brand with 20 skincare SKUs and a brand with 400 across four categories are not the same piece of work, and pretending otherwise would just mean revising the number later. Book a demo and we'll walk through what you sell and what you're trying to fix, then put a real figure in front of you.",
        cta: true,
      },
      {
        q: 'What do you need to know before quoting?',
        a: 'Roughly: how many products you sell and in which categories, how many people visit your store in a month, what you already run for quizzes and email, and what you want the first 90 days to prove. That is most of a demo conversation anyway.',
      },
    ],
  },
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'One link on your site. We build what sits behind it.',
    items: [
      {
        q: 'How long until it is live?',
        a: 'About a week from the point we have your catalog. Send it as a spreadsheet or connect Shopify, and we build and install everything — you review the whole thing before it goes anywhere near your customers.',
      },
      {
        q: 'Do we need a developer?',
        a: 'No. One link goes on your site and we do the rest. No data team, no replatforming, no IT ticket.',
      },
      {
        q: 'Does it work with our stack?',
        a: "Shopify, Webflow, WordPress, or any site you can add a link to \u2014 on Shopify the catalog syncs on its own. We're progressively adding integrations with more of the platforms already in your stack, so tell us what you run and we'll tell you where it sits.",
      },
      {
        q: 'Do we have to replace our quiz?',
        a: "You can keep it \u2014 you just won't need a standalone one. Almost every question a quiz asks is already answered on a connected shopper's profile, so running yours on top mostly means asking people for what you already have. And a shopper who arrives without a profile can take the Halite quiz right inside the plug-in, which builds their profile as they answer. Either way the quiz stops being a separate thing for you to maintain.",
      },
    ],
  },
  {
    id: 'shoppers',
    label: 'What shoppers see',
    blurb: 'One tap, and a reason under every recommendation.',
    items: [
      {
        q: 'What does the shopper actually do?',
        a: 'They tap once to connect the profile they already built in Hallie. No form, no account creation on your site, no twenty questions before they have been given anything.',
      },
      {
        q: 'What if they have never heard of Hallie?',
        a: 'Then they take the Halite onboarding quiz, right there in the plug-in on your site. It builds their profile as they answer, so they get the same personalized picks on that first visit \u2014 and the profile is theirs to carry to the next brand. Nothing for them to install, nothing for you to build.',
      },
      {
        q: 'Why would a shopper bother?',
        a: 'Because they stop re-answering the same questions at every brand, they get picks that fit rather than picks that are on promotion, and Hallie pays them points for keeping the profile current.',
      },
    ],
  },
  {
    id: 'data',
    label: 'Data & consent',
    blurb: 'What you see, what you never see, and who decides.',
    items: [
      {
        q: 'What exactly do we see?',
        a: 'The profile answers for the categories you sell in, plus a match score and a plain-English reason under every product we rank. A skincare brand sees the skincare profile — not that person’s hair, makeup or fragrance answers.',
      },
      {
        q: 'What do we never see?',
        a: "Another brand's customer list, their order history, or anything tied to a named person at a brand that is not yours. Across brands you see patterns — ingredients, notes, categories — never individual records.",
      },
      {
        q: 'Do we still own our own data?',
        a: 'Yes. Your catalog, your pricing, your purchase history and your customers stay in your account. Halite adds context to them; it does not take them anywhere.',
      },
      {
        q: 'How does consent work?',
        a: 'Every connection is an explicit, one-tap permission from the person, recorded against your brand specifically, and revocable from either side at any time. It is the gate the whole product sits behind — which is also the part worth walking through with whoever reviews this on your side, so bring them to the demo.',
      },
    ],
  },
]

export default function Pricing() {
  // Same source as the page, so the rich result can never describe something
  // the page does not actually say.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap(g =>
      g.items.map(i => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.a },
      })),
    ),
  }

  return (
    <>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-[3.75rem] px-6 overflow-hidden" style={{ background: '#450F2A' }}>
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
            <span className="text-[12px]" style={{ color: 'rgba(250,246,240,0.7)' }}>Pricing &amp; FAQ</span>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-5" style={{ color: 'rgba(193,122,71,0.9)' }}>
            Pricing &amp; FAQ
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.06] mb-6" style={{ color: '#FAF6F0' }}>
            Priced against your catalog,{' '}
            <span style={{ color: '#C17A47' }}>not a tier list.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(250,246,240,0.65)' }}>
            We quote per brand, because the work is different per brand. Here is everything else
            brands ask us before a pilot — including what we&rsquo;d need to know to put a number in
            front of you.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {GROUPS.map(g => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(250,246,240,0.2)', color: '#FAF6F0' }}
              >
                {g.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────
          Native <details> rather than a state-driven accordion: it opens
          without JavaScript, it is keyboard- and screen-reader-correct for
          free, and browser find-in-page can reach a closed answer. */}
      <section id="faq" className="py-12 md:py-[4.5rem] px-6 scroll-mt-16" style={{ background: '#FAF6F0' }}>
        <div className="max-w-3xl mx-auto">
          {GROUPS.map((g, gi) => (
            <div key={g.id} id={g.id} className={`scroll-mt-20 ${gi > 0 ? 'mt-14' : ''}`}>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: '#C17A47' }}>
                {g.label}
              </p>
              <h2 className="font-display text-2xl md:text-[28px] font-semibold leading-snug mb-6" style={{ color: '#1A0A12' }}>
                {g.blurb}
              </h2>

              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8DDD0', background: '#FFFFFF' }}>
                {g.items.map((item, i) => (
                  <details
                    key={item.q}
                    className="group"
                    style={i > 0 ? { borderTop: '1px solid #F2EBE0' } : undefined}
                  >
                    <summary className="flex items-start gap-4 cursor-pointer list-none px-5 md:px-7 py-5 transition-colors hover:bg-black/[0.015]">
                      <span className="flex-1 text-[15px] md:text-[16px] font-semibold leading-snug" style={{ color: '#1A0A12' }}>
                        {item.q}
                      </span>
                      {/* Rotates to a minus when the row is open. */}
                      <span
                        className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 group-open:rotate-45"
                        style={{ background: 'rgba(193,122,71,0.14)' }}
                        aria-hidden="true"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A85B2A" strokeWidth="3" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </summary>

                    <div className="px-5 md:px-7 pb-6 -mt-1">
                      <p className="text-[14.5px] leading-relaxed max-w-[62ch]" style={{ color: '#8B6575' }}>
                        {item.a}
                      </p>
                      {item.cta && (
                        <a
                          href="/#demo"
                          className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-full text-[13.5px] font-semibold transition-all hover:opacity-90"
                          style={{ background: '#450F2A', color: '#FAF6F0' }}
                        >
                          Book a demo →
                        </a>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <p className="text-[13px] mt-10 text-center" style={{ color: '#C4B5BD' }}>
            Something we haven&rsquo;t answered? Email{' '}
            <a href="mailto:info@haliteintelligence.com" className="underline" style={{ color: '#8B6575' }}>
              info@haliteintelligence.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-[4.5rem] px-6" style={{ background: '#450F2A' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-[38px] font-semibold leading-tight mb-4" style={{ color: '#FAF6F0' }}>
            Let&rsquo;s put a real number on it.
          </h2>
          <p className="text-base md:text-[17px] leading-relaxed mb-9 max-w-xl mx-auto" style={{ color: 'rgba(250,246,240,0.65)' }}>
            30 minutes, no slides. Tell us what you sell and what you&rsquo;re trying to fix, and
            we&rsquo;ll scope a pilot against your own catalog and traffic.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/#demo"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-[14.5px] font-semibold transition-all hover:opacity-90"
              style={{ background: '#FAF6F0', color: '#450F2A' }}
            >
              Book a demo
            </a>
            <a
              href="/platform"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-[14.5px] font-semibold transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(250,246,240,0.32)', color: '#FAF6F0' }}
            >
              See how it works ↗
            </a>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <Footer />
    </>
  )
}
