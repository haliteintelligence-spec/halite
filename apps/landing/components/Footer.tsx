import { HALLIE_URL, EXTERNAL_LINK_PROPS } from '@/lib/links'

// Shared by the brand page (/) and the consumer page (/hallie) — both audiences
// get the full site map, since the footer is where someone who landed on the
// wrong side of the business goes looking for the right one.
export function Footer() {
  return (
    <footer className="py-14 px-6" style={{ background: '#2D0A1C', borderTop: '1px solid rgba(250,246,240,0.08)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display text-lg font-semibold" style={{ color: '#FAF6F0' }}>Halite</span>
              <span className="text-[10px] font-medium tracking-[0.18em] uppercase mt-0.5" style={{ color: 'rgba(250,246,240,0.4)' }}>Intelligence</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-xs" style={{ color: 'rgba(250,246,240,0.45)' }}>
              The portable consumer profile for CPG. Halite is the brand side; Hallie is the app
              where people build and own it. Know them. Personalize for them. Keep them.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: 'rgba(250,246,240,0.3)' }}>
              For brands
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'The portable profile', href: '/#profile' },
                { label: 'How it works', href: '/platform' },
                { label: 'Compare', href: '/#compare' },
                { label: 'Your dashboard', href: '/platform#dashboard' },
                { label: 'Getting set up', href: '/platform#setup' },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* The copper rule separates this column from the brand links beside it.
              Once the grid stacks there is nothing to its left to separate, so it
              becomes a top rule instead of a stray vertical line. */}
          <div className="pt-6 lg:pt-0 lg:pl-[22px] border-t lg:border-t-0 lg:border-l" style={{ borderColor: 'rgba(193,122,71,0.3)' }}>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: '#C17A47' }}>
              Hallie · for you
            </p>
            <div className="space-y-2.5">
              <a href="/hallie" className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                What Hallie does
              </a>
              <a href="/hallie#rewards" className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                Points &amp; rewards
              </a>
              <a href={HALLIE_URL} {...EXTERNAL_LINK_PROPS} className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                Open Hallie ↗
              </a>
              <a href={`${HALLIE_URL}/privacy-choices`} {...EXTERNAL_LINK_PROPS} className="block text-[13px] transition-opacity hover:opacity-80" style={{ color: 'rgba(250,246,240,0.5)' }}>
                Your privacy choices
              </a>
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
  )
}
