// The hero image of the site: a beauty brand's own product page with Halite
// connected. Everything here is drawn rather than screenshotted so it stays
// crisp at any width and can be edited in place — the product "photography" is
// inline SVG, the storefront is real DOM, and the whole thing reflows on mobile
// instead of scaling down into unreadability.
//
// The two lead cards are exported on their own as well, because the hero uses
// them as its floating visual before the full page appears below it.

type Fit = 'good' | 'caution' | 'bad'
type Shape = 'serum' | 'pump' | 'jar' | 'tube'

export type Product = {
  name: string
  price: string
  match: number
  shape: Shape
  /** The one the profile actually ranked first; drawn with the burgundy frame. */
  lead?: boolean
  /** Ranked, but ranked low — kept visible because saying why not is the point. */
  demoted?: boolean
  reasons: { fit: Fit; text: string }[]
}

export const PRODUCTS: Product[] = [
  {
    name: 'Even Tone Niacinamide Serum',
    price: '$42 · 30ml',
    match: 94,
    shape: 'serum',
    lead: true,
    reasons: [
      { fit: 'good', text: 'Niacinamide and tranexamic acid — what dark marks actually respond to' },
      { fit: 'good', text: 'No acids or fragrance, so it suits skin that reacts' },
      { fit: 'good', text: 'Within the $50 you tend to spend' },
    ],
  },
  {
    name: 'Hydrating Glycerin Lotion',
    price: '$28 · 200ml',
    match: 88,
    shape: 'pump',
    reasons: [
      { fit: 'good', text: 'A lotion, which is the texture you reach for' },
      { fit: 'good', text: 'Glycerin and shea for the dryness you flagged' },
    ],
  },
  {
    name: 'Shea & Vanilla Body Cream',
    price: '$34 · 250ml',
    match: 76,
    shape: 'jar',
    reasons: [
      { fit: 'good', text: 'Strongly scented, the way you like body care' },
      { fit: 'caution', text: 'A cream, not the lotion you usually pick' },
    ],
  },
  {
    name: 'Glycolic Resurfacing Peel 15%',
    price: '$46 · 50ml',
    match: 31,
    shape: 'tube',
    demoted: true,
    reasons: [
      { fit: 'bad', text: 'A high-strength acid, and you said your skin reacts' },
      { fit: 'bad', text: 'Adds a step to a routine you keep moderate' },
    ],
  },
]

/* ── Product "photography" ─────────────────────────────────────────────────
   Four silhouettes a beauty buyer reads instantly: a dropper serum, a pump
   lotion, a screw-top jar and a crimped tube. Each is a flat vector still-life
   on its own tinted backdrop — enough to stand in for a catalog shot without
   pretending to be one. */

function ProductShot({ shape }: { shape: Shape }) {
  const id = `ps-${shape}`
  return (
    <svg viewBox="0 0 100 150" width="88" height="132" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-amber`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C88F54" />
          <stop offset="38%" stopColor="#E8C99A" />
          <stop offset="100%" stopColor="#B8823F" />
        </linearGradient>
        <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#DCCFC4" />
          <stop offset="38%" stopColor="#F6EFE7" />
          <stop offset="100%" stopColor="#D2C2B5" />
        </linearGradient>
        <linearGradient id={`${id}-rose`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A7AF" />
          <stop offset="38%" stopColor="#EFDCE0" />
          <stop offset="100%" stopColor="#BE97A1" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#BFC8C2" />
          <stop offset="38%" stopColor="#E6EDE7" />
          <stop offset="100%" stopColor="#AFB9B3" />
        </linearGradient>
      </defs>

      {/* Contact shadow, shared by every shape so they sit on the same surface */}
      <ellipse cx="50" cy="141" rx="31" ry="5" fill="#1A0A12" opacity="0.10" />

      {shape === 'serum' && (
        <>
          <rect x="42" y="4" width="16" height="19" rx="7" fill="#3B2418" />
          <rect x="36" y="22" width="28" height="9" rx="2.5" fill="#2D0A1C" />
          <rect x="43" y="30" width="14" height="8" fill="#A9762F" />
          <rect x="22" y="36" width="56" height="104" rx="11" fill={`url(#${id}-amber)`} />
          <rect x="28.5" y="42" width="6" height="92" rx="3" fill="#FFFFFF" opacity="0.28" />
          <rect x="29" y="64" width="42" height="50" rx="4" fill="#FAF6F0" />
          <rect x="35" y="73" width="30" height="3" rx="1.5" fill="#450F2A" />
          <rect x="35" y="81" width="22" height="2.5" rx="1.25" fill="#C17A47" />
          <rect x="35" y="96" width="30" height="2" rx="1" fill="#D9CFC4" />
          <rect x="35" y="102" width="24" height="2" rx="1" fill="#D9CFC4" />
        </>
      )}

      {shape === 'pump' && (
        <>
          <rect x="28" y="7" width="19" height="6" rx="3" fill="#B7A6AF" />
          <rect x="44" y="6" width="9" height="19" rx="2.5" fill="#C4B5BD" />
          <rect x="37" y="24" width="24" height="9" rx="2.5" fill="#AB99A3" />
          <rect x="20" y="32" width="60" height="108" rx="13" fill={`url(#${id}-cream)`} />
          <rect x="27" y="39" width="6.5" height="94" rx="3.25" fill="#FFFFFF" opacity="0.6" />
          <rect x="27" y="62" width="46" height="52" rx="4" fill="#FFFFFF" />
          <rect x="34" y="71" width="32" height="3" rx="1.5" fill="#450F2A" />
          <rect x="34" y="79" width="20" height="2.5" rx="1.25" fill="#C17A47" />
          <rect x="34" y="95" width="32" height="2" rx="1" fill="#E2D8CE" />
          <rect x="34" y="101" width="26" height="2" rx="1" fill="#E2D8CE" />
        </>
      )}

      {shape === 'jar' && (
        <>
          <rect x="17" y="40" width="66" height="26" rx="7" fill="#8E6B54" />
          <rect x="17" y="40" width="66" height="9" rx="4.5" fill="#A37D62" />
          <rect x="24" y="63" width="52" height="5" fill="#C9B8A8" />
          <rect x="21" y="66" width="58" height="74" rx="10" fill={`url(#${id}-rose)`} />
          <rect x="27" y="72" width="6" height="62" rx="3" fill="#FFFFFF" opacity="0.5" />
          <rect x="30" y="88" width="40" height="38" rx="4" fill="#FAF6F0" />
          <rect x="36" y="97" width="28" height="3" rx="1.5" fill="#450F2A" />
          <rect x="36" y="105" width="18" height="2.5" rx="1.25" fill="#C17A47" />
          <rect x="36" y="115" width="28" height="2" rx="1" fill="#DED2C8" />
        </>
      )}

      {shape === 'tube' && (
        <>
          <rect x="37" y="6" width="26" height="14" rx="3.5" fill="#6E7A72" />
          <path d="M31 20 h38 l5 106 a4 4 0 0 1 -4 4 h-40 a4 4 0 0 1 -4 -4 z" fill={`url(#${id}-glass)`} />
          <rect x="36" y="26" width="5.5" height="98" rx="2.75" fill="#FFFFFF" opacity="0.55" />
          <rect x="34" y="56" width="32" height="46" rx="4" fill="#FAF6F0" />
          <rect x="39" y="65" width="22" height="3" rx="1.5" fill="#450F2A" />
          <rect x="39" y="73" width="14" height="2.5" rx="1.25" fill="#C17A47" />
          <rect x="39" y="87" width="22" height="2" rx="1" fill="#DFD7CE" />
          <rect x="28" y="130" width="44" height="4" rx="2" fill="#8E9A93" />
        </>
      )}
    </svg>
  )
}

const SHOT_BG: Record<Shape, string> = {
  serum: 'linear-gradient(160deg, #FBF2E6, #F3E6D4)',
  pump:  'linear-gradient(160deg, #FAF6F2, #EFE7DF)',
  jar:   'linear-gradient(160deg, #FBF1F1, #F2E3E6)',
  tube:  'linear-gradient(160deg, #F4F6F3, #E8EEE9)',
}

function ReasonIcon({ fit }: { fit: Fit }) {
  if (fit === 'good') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2D7A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-[2px]" aria-hidden="true">
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    )
  }
  if (fit === 'caution') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C17A47" strokeWidth="2.4" strokeLinecap="round" className="flex-shrink-0 mt-[2px]" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.2v.3" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4605F" strokeWidth="2.6" strokeLinecap="round" className="flex-shrink-0 mt-[2px]" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/**
 * `scroll` is the storefront's own layout: a fixed-width card that participates
 * in the swipe row on phones. `plain` lets the card fill whatever the caller
 * gives it, which is what the hero needs.
 */
export function ProductCard({ p, layout = 'scroll' }: { p: Product; layout?: 'scroll' | 'plain' }) {
  return (
    <article
      className={`flex flex-col rounded-2xl overflow-hidden ${
        layout === 'scroll' ? 'w-[248px] sm:w-auto flex-shrink-0 snap-start' : 'w-full h-full'
      }`}
      style={{
        background: '#FFFFFF',
        border: p.lead ? '1.5px solid #450F2A' : '1px solid #E8DDD0',
        opacity: p.demoted ? 0.66 : 1,
        boxShadow: p.lead && layout === 'scroll' ? '0 12px 30px -18px rgba(69,15,42,0.55)' : 'none',
      }}
    >
      <div
        className="relative flex items-end justify-center"
        style={{ height: 168, paddingBottom: 14, background: SHOT_BG[p.shape] }}
      >
        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-[5px] text-[10.5px] font-bold"
          style={
            p.lead
              ? { background: '#450F2A', color: '#FAF6F0' }
              : { background: '#FFFFFF', border: '1px solid #E8DDD0', color: p.demoted ? '#8B6575' : '#4A2A38' }
          }
        >
          {p.match}% match
        </span>
        <ProductShot shape={p.shape} />
      </div>

      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <div>
          <p className="text-[13.5px] font-semibold leading-snug" style={{ color: '#1A0A12' }}>{p.name}</p>
          <p className="text-[12px] mt-1" style={{ color: '#8B6575' }}>{p.price}</p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {p.reasons.map(r => (
            <li key={r.text} className="flex gap-2">
              <ReasonIcon fit={r.fit} />
              <span className="text-[11.5px] leading-[1.45]" style={{ color: r.fit === 'good' ? '#4A2A38' : '#8B6575' }}>
                {r.text}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 mt-auto pt-2.5">
          <span
            className="flex-1 h-10 rounded-[10px] flex items-center justify-center text-[12.5px] font-semibold"
            style={
              p.lead
                ? { background: '#450F2A', color: '#FAF6F0' }
                : { border: '1.5px solid #E8DDD0', color: p.demoted ? '#8B6575' : '#4A2A38' }
            }
          >
            Add to bag
          </span>
          <span
            className="h-10 rounded-[10px] px-4 flex items-center justify-center text-[12.5px] font-semibold"
            style={{ border: '1.5px solid #E8DDD0', color: p.demoted ? '#8B6575' : '#4A2A38' }}
          >
            Save
          </span>
        </div>
      </div>
    </article>
  )
}

/**
 * The hero's floating visual: the two ranked picks, lifted off the burgundy on
 * their own shadow, with two stat tags breaking the corners so the group reads
 * as an object sitting above the page rather than a panel welded into it.
 */
export function HeroProductCards() {
  return (
    // One card on a phone, where two would be two unreadable slivers; the
    // second joins from 640px up.
    <div className="animate-float relative mx-auto w-full max-w-[300px] sm:max-w-none mb-8 lg:mb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-[26px] p-4" style={{ background: 'rgba(250,246,240,0.07)', border: '1px solid rgba(250,246,240,0.12)', boxShadow: '0 40px 70px -30px rgba(26,10,18,0.75)' }}>
        <ProductCard p={PRODUCTS[0]} layout="plain" />
        <div className="hidden sm:block">
          <ProductCard p={PRODUCTS[1]} layout="plain" />
        </div>
      </div>

      {/* The tags overhang the frame, so how far they can overhang depends on
          how much gutter there is. On a phone that is the few pixels either
          side of a 300px card; at lg the hero has split in two and there is
          room for the full break. */}
      <div className="absolute -top-4 -right-2 sm:-top-5 sm:-right-3 lg:-top-6 lg:-right-5 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl" style={{ background: '#C17A47' }}>
        <p className="text-[9px] sm:text-[9.5px] font-bold tracking-[0.18em] uppercase mb-0.5 text-white/75">Questions asked</p>
        <p className="font-display text-xl sm:text-2xl font-semibold leading-none text-white">0</p>
      </div>
      <div className="absolute -bottom-6 -left-2 sm:-bottom-7 sm:-left-3 lg:-bottom-9 lg:-left-6 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl" style={{ background: '#FAF6F0' }}>
        <p className="text-[9px] sm:text-[9.5px] font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#8B6575' }}>More customers stay</p>
        <p className="font-display text-xl sm:text-2xl font-semibold leading-none" style={{ color: '#450F2A' }}>30%</p>
      </div>
    </div>
  )
}

/**
 * The full connected product page. No longer rendered on the site — the hero's
 * two cards make the point on their own — but kept as the source of the
 * exported still at design/halite-connect/connected-storefront.png, which the
 * one-pager and deck use. Delete both together if it stops earning its place.
 */
export function ConnectedStorefront() {
  return (
    <figure
      className="m-0 rounded-[20px] overflow-hidden"
      style={{ background: '#FAF6F0', border: '1px solid #E8DDD0', boxShadow: '0 40px 80px -40px rgba(26,10,18,0.5)' }}
    >
      {/* Browser chrome — the one cue that says "this is the brand's own site,
          not a Halite screen". */}
      <div
        className="flex items-center gap-3 px-4 h-11 flex-shrink-0"
        style={{ background: '#F2EBE0', borderBottom: '1px solid #E8DDD0' }}
      >
        <div className="flex gap-1.5">
          {['#E0B3B0', '#E8D3A8', '#B9D2B4'].map(c => (
            <span key={c} className="w-[10px] h-[10px] rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div
          className="flex-1 max-w-[320px] h-[22px] rounded-full flex items-center px-3 gap-1.5"
          style={{ background: '#FAF6F0', border: '1px solid #E8DDD0' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8B6575" strokeWidth="2.5" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span className="text-[10.5px] truncate" style={{ color: '#8B6575' }}>nubianbeauty.com/skincare</span>
        </div>
      </div>

      {/* The brand's own header — their wordmark, their nav, plus the one thing
          Halite adds: a connection the shopper can see and switch off. */}
      <div
        className="flex items-center justify-between gap-4 px-4 sm:px-7 h-[58px]"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E8DDD0' }}
      >
        <div className="flex items-center gap-7">
          <span className="font-display text-[17px] tracking-[0.2em]" style={{ color: '#1A0A12' }}>NUBIAN</span>
          <nav className="hidden md:flex items-center gap-5">
            {['Skincare', 'Body', 'Fragrance', 'Sets'].map(l => (
              <span key={l} className="text-[12px]" style={{ color: '#8B6575' }}>{l}</span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5" style={{ background: '#FEF0E0' }}>
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#C17A47' }}>
            <span className="font-display text-[11px] leading-none" style={{ color: '#FFFFFF' }}>H</span>
          </span>
          <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#8A5A2E' }}>Hallie connected</span>
          <span className="hidden sm:block w-px h-3" style={{ background: '#E0C9A8' }} />
          <span className="hidden sm:block text-[11px] font-semibold" style={{ color: '#8A5A2E' }}>Disconnect</span>
        </div>
      </div>

      <div className="px-4 sm:px-7 py-6 sm:py-7 flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#8B6575' }}>
            Picked for you · skincare &amp; body
          </p>
          <h3 className="font-display text-[22px] sm:text-[27px] font-medium leading-tight" style={{ color: '#1A0A12' }}>
            For dark marks, without upsetting your skin
          </h3>
        </div>

        <div
          className="flex gap-3 items-start rounded-xl px-4 py-3.5"
          style={{ background: '#F5E6ED', borderLeft: '3px solid #450F2A' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#450F2A" strokeWidth="2" strokeLinejoin="round" className="flex-shrink-0 mt-[3px]" aria-hidden="true">
            <path d="M12 3l2.1 5.4L19.5 10l-5.4 1.6L12 17l-2.1-5.4L4.5 10l5.4-1.6z" />
          </svg>
          <p className="text-[12.5px] leading-[1.6]" style={{ color: '#6B1E3F' }}>
            You told Hallie you&rsquo;re working on dark marks first, with dehydration underneath, and that
            your skin reacts easily. These are ranked on that — brightening actives your skin can
            tolerate, at the routine length you asked for, under $50.
          </p>
        </div>

        {/* Four across on desktop; a snapping swipe row on phones, where four
            columns would be four illegible slivers. */}
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          {PRODUCTS.map(p => <ProductCard key={p.name} p={p} />)}
        </div>
      </div>
    </figure>
  )
}
