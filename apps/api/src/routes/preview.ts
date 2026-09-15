import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { ApiError } from '../lib/errors.js'

/**
 * A working storefront that loads the brand's own Connect widget.
 *
 * Until now there was no way to look at the consumer side of Connect at all:
 * the dashboard shows the embed snippet, and the only test page was local,
 * quiz-only and pointed at a stale key. This serves a real page, from the
 * same origin the widget is served from, against the brand's real catalog —
 * so what a merchant sees here is what their shoppers would see.
 *
 * Reached with the brand's publishable key rather than its slug, so the page
 * cannot be found by guessing brand names. That key is already public by
 * design: it sits in the <script> tag on every storefront that embeds this.
 */

const WIDGET_URL = process.env.WIDGET_URL ?? 'https://cdn.haliteintelligence.com/widget.js'

// The bundle is cached for an hour, which is right for a real storefront and
// wrong for a preview — a merchant checking a change should not have to
// empty their cache to see it. Busted per process, so a deploy is enough.
const WIDGET_BUILD = Date.now().toString(36)

/** Catalog prices are floats; nobody wants to read USD 16.59055230630241. */
function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  ))
}

export async function previewRoutes(server: FastifyInstance) {
  server.get('/preview', async (request, reply) => {
    const { key, page } = z.object({
      key: z.string().min(8),
      page: z.enum(['home', 'collection']).optional(),
    }).parse(request.query)
    const view = page ?? 'home'

    const brand = await prisma.brand.findUnique({
      where: { apiKey: key },
      select: {
        id: true, name: true, slug: true, active: true,
        primaryColor: true, focusAreas: true, apiKey: true,
      },
    })
    if (!brand || !brand.active) throw new ApiError(404, 'No brand for that key')

    const products = await prisma.product.findMany({
      where: { brandId: brand.id, beautyArea: { in: brand.focusAreas }, inStock: true },
      orderBy: { price: 'asc' },
      // The collection page shows the whole range, so the decorator has
      // something to walk. The landing page shows a handful.
      take: view === 'collection' ? 12 : 4,
      select: { id: true, externalId: true, name: true, price: true, currency: true, imageUrl: true, category: true },
    })

    const accent = brand.primaryColor || '#450F2A'
    const categoryLabel = brand.focusAreas.length
      ? brand.focusAreas.map(a => a.toLowerCase().replace(/_/g, ' ')).join(' & ')
      : 'beauty'

    const cards = products.map(p => `
      <article class="card" data-product-id="${esc(p.id)}" data-sku="${esc(p.externalId ?? '')}"
               data-halite-product="${esc(p.externalId ?? p.id)}">
        <div class="shot">
          ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">` : `<div class="ph"></div>`}
          <span class="badge" hidden></span>
        </div>
        <div class="body">
          <p class="name">${esc(p.name)}</p>
          <p class="price">${esc(money(p.price, p.currency))}</p>
          <ul class="reasons" hidden></ul>
          <div class="hlw-slot"></div>
          <div class="actions">
            <button class="buy" data-halite-cart data-halite-value="${p.price}">Add to bag</button>
            <button class="save" data-halite-save title="Save to your Hallie wishlist">Save</button>
          </div>
        </div>
      </article>`).join('')

    reply.header('Content-Type', 'text/html; charset=utf-8')
    reply.header('Cache-Control', 'no-store')
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.name)} — Connect preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root { --accent: ${esc(accent)}; --ink:#1A0A12; --ink2:#4A2A38; --ink3:#8B6575;
          --bg:#FAF6F0; --surface:#fff; --border:#E8DDD0; --sand:#F8F3EE; --sage:#6b9e78; }
  * { box-sizing:border-box; }
  /* A class with display: beats the browser's [hidden] rule, so say it louder. */
  [hidden] { display:none !important; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; -webkit-font-smoothing:antialiased; }
  .note { background:var(--ink); color:#fff; font-size:12px; padding:9px 20px; text-align:center; }
  .note b { color:#fff; }
  header { background:var(--surface); border-bottom:1px solid var(--border);
           display:flex; align-items:center; justify-content:space-between; padding:18px 24px; }
  .wordmark { font-family:'Playfair Display',Georgia,serif; font-size:19px; letter-spacing:.2em; }
  .status { font-size:11.5px; color:var(--ink3); }
  .nav { display:flex; gap:22px; }
  .nav a { font-size:12.5px; font-weight:500; color:var(--ink3); text-decoration:none; padding-bottom:2px; }
  .nav a.on { color:var(--ink); border-bottom:1.5px solid var(--accent); }
  main { max-width:1120px; margin:0 auto; padding:32px 24px 64px; }
  .eyebrow { font-size:10px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--ink3); margin:0 0 5px; }
  h1 { font-family:'Playfair Display',Georgia,serif; font-weight:500; font-size:30px; margin:0 0 24px; }
  .connect { background:#FEF0E0; border-radius:16px; padding:20px; margin-bottom:28px;
             display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
  .connect p { margin:0; font-size:13.5px; line-height:1.55; color:var(--ink2); flex:1; min-width:240px; }
  .connect strong { display:block; font-size:15px; color:var(--ink); margin-bottom:4px; }
  button { font:inherit; cursor:pointer; border:none; border-radius:10px; }
  .cta { background:var(--accent); color:#fff; font-size:14px; font-weight:600; padding:13px 22px; min-height:44px; }
  .cta:disabled { opacity:.5; cursor:default; }
  .hint { font-size:12px; line-height:1.6; color:var(--ink3); margin:0 0 22px; max-width:640px; }
  .why { background:#F5E6ED; border-left:3px solid var(--accent); border-radius:12px;
         padding:14px 16px; margin-bottom:24px; font-size:12.5px; line-height:1.6; color:#6B1E3F; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:20px; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden;
          display:flex; flex-direction:column; transition:border-color .2s; }
  .card.top { border:1.5px solid var(--accent); }
  .shot { position:relative; height:190px; background:var(--sand); display:flex; align-items:center; justify-content:center; }
  .shot img { max-height:150px; max-width:80%; object-fit:contain; }
  .ph { width:54px; height:104px; border-radius:9px; background:var(--border); }
  .badge { position:absolute; top:12px; left:12px; background:var(--accent); color:#fff;
           font-size:10.5px; font-weight:700; padding:5px 10px; border-radius:999px; }
  .body { padding:16px; display:flex; flex-direction:column; gap:9px; flex:1; }
  .name { margin:0; font-size:13.5px; font-weight:600; }
  .price { margin:0; font-size:12px; color:var(--ink3); }
  .reasons { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:5px; }
  .reasons li { font-size:11.5px; line-height:1.4; color:var(--ink2); padding-left:16px; position:relative; }
  .reasons li::before { content:''; position:absolute; left:0; top:4px; width:9px; height:5px;
                        border-left:2px solid var(--sage); border-bottom:2px solid var(--sage); transform:rotate(-45deg); }
  .reasons li.warn { color:var(--ink3); }
  .reasons li.warn::before { border-color:#c07070; transform:rotate(-45deg) scaleX(.8); }
  .actions { margin-top:auto; padding-top:10px; display:flex; gap:8px; }
  .buy { flex:1; background:var(--accent); color:#fff; font-size:13px; font-weight:600; height:44px; }
  .save { border:1.5px solid var(--border); background:transparent; color:var(--ink2);
          font-size:13px; font-weight:600; height:44px; padding:0 14px; }
  .card.done .buy { background:var(--sage); }
  footer { max-width:1120px; margin:0 auto; padding:0 24px 48px; font-size:11.5px; color:var(--ink3); }
</style>
</head>
<body>
  <div class="note">Preview of what <b>${esc(brand.name)}</b>&rsquo;s shoppers see. Real widget, real catalog, real recommendations &mdash; connecting here creates a real permission.</div>

  <header>
    <span class="wordmark">${esc(brand.name.toUpperCase())}</span>
    <nav class="nav">
      <a href="?key=${encodeURIComponent(brand.apiKey)}" class="${view === 'home' ? 'on' : ''}">Featured</a>
      <a href="?key=${encodeURIComponent(brand.apiKey)}&page=collection" class="${view === 'collection' ? 'on' : ''}">All products</a>
    </nav>
    <span class="status" id="status">Not connected</span>
  </header>

  <main>
    <p class="eyebrow">${esc(view === 'collection' ? 'Everything' : categoryLabel)}</p>
    <h1 id="heading">${esc(view === 'collection' ? 'All products' : 'Our collection')}</h1>
    ${view === 'collection' ? `<p class="hint">This page does nothing clever — no ranking, no re-ordering. Every score on it was put there by the widget, because the shopper is connected.</p>` : ''}

    <section class="connect" id="prompt">
      <p>
        <strong>Is this right for you?</strong>
        Connect the Hallie profile you already own and ${esc(brand.name)} will rank these against what
        you like, own and have had work for you &mdash; without seeing whose products are on your shelf.
      </p>
      <button class="cta" data-halite-connect="pdp">Connect with Hallie</button>
    </section>

    <div class="why" id="why" hidden></div>
    <div class="grid" id="grid">${cards}</div>
  </main>

  <footer id="foot">Ranked by Halite once you connect. Disconnect anytime in Hallie.</footer>

  <script src="${esc(WIDGET_URL)}?v=${WIDGET_BUILD}"
          data-api-key="${esc(brand.apiKey)}"
          data-accent="${esc(accent)}"
          data-halite-badge=".shot"
          data-halite-reasons=".hlw-slot"></script>
  <script>
    (function () {
      var api = window.HaliteWidget
      var grid = document.getElementById('grid')
      var status = document.getElementById('status')

      function connected() {
        return window.Halite && window.Halite.connect && window.Halite.connect.isConnected()
      }

      var currentRec = null

      // The widget reports these itself, from the data attributes on the
      // buttons — this only handles how the page looks afterwards.
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('.card')
        if (!card) return
        if (e.target.classList.contains('buy')) {
          card.classList.add('done')
          e.target.textContent = 'In your bag'
        }
        if (e.target.classList.contains('save')) {
          e.target.textContent = 'Saved to Hallie'
        }
      })

      async function render() {
        if (!connected()) return
        status.textContent = 'Hallie connected'
        document.getElementById('prompt').hidden = true

        var res = await window.Halite.connect.recommendations({ surface: 'pdp', limit: 8 })
        if (!res || !res.items || !res.items.length) return
        currentRec = res.recommendation_id

        var why = document.getElementById('why')
        why.textContent = summarise(res.summary)
        why.hidden = false
        document.getElementById('heading').textContent = 'Picked for you'

        var byId = {}
        res.items.forEach(function (i, n) { byId[i.product_id] = { item: i, rank: n } })

        var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'))
        cards.forEach(function (card) {
          var hit = byId[card.dataset.productId]
          if (!hit) { card.style.opacity = '.45'; return }
          var i = hit.item
          card.querySelector('.badge').textContent = Math.round(i.match_score * 100) + '% match'
          card.querySelector('.badge').hidden = false
          if (hit.rank === 0) card.classList.add('top')
          var ul = card.querySelector('.reasons')
          ul.innerHTML = i.reasons.map(function (r) { return '<li>' + r + '</li>' })
            .concat(i.warnings.map(function (w) { return '<li class="warn">' + w + '</li>' })).join('')
          ul.hidden = false
          card.style.order = hit.rank
        })
        grid.style.display = 'grid'

        var hasProfile = (res.summary.liked || []).length > 0 ||
                         (res.summary.stated_concerns || []).length > 0
        document.getElementById('foot').textContent = hasProfile
          ? 'Ranked by Halite against your Hallie profile \u2014 ' + res.scored +
            ' products scored. ' + brandName + ' never sees whose products are on your shelf.'
          : res.scored + ' products scored evenly \u2014 there is nothing in your profile to rank on yet. ' +
            brandName + ' never sees whose products are on your shelf.'
      }

      function summarise(s) {
        var bits = []
        var concerns = (s.stated_concerns || []).slice(0, 3).map(function (c) { return c.replace(/_/g, ' ') })
        if (concerns.length) bits.push('You told Hallie you\u2019re working on ' + concerns.join(', ') + '.')
        var liked = (s.liked || []).slice(0, 3)
        if (liked.length) bits.push('Ranked on ' + liked.join(', ') + '.')
        if (s.budget_max) bits.push('Kept under ' + s.budget_max + '.')
        if (bits.length) return bits.join(' ')
        // Connected, but the profile is empty — say that rather than implying
        // a ranking that did not happen.
        return 'Your profile is connected but still empty, so nothing is ranked yet. '
             + 'Tell Hallie what you like and these will separate.'
      }

      var brandName = ${JSON.stringify(brand.name)}
      function showConnected() {
        status.textContent = 'Hallie connected'
        var prompt = document.getElementById('prompt')
        if (prompt) prompt.hidden = true
      }

      var isHome = ${JSON.stringify(view === 'home')}

      function start() {
        if (!connected()) return
        showConnected()
        // The collection page needs nothing else — the widget decorates it.
        if (isHome) render()
      }

      // The widget publishes window.Halite asynchronously, so reading it now
      // would say "not connected" on every page load.
      window.addEventListener('halite:ready', start)
      window.addEventListener('halite:connected', function () {
        showConnected()
        if (isHome) setTimeout(render, 300)
      })
      // In case the widget was already up before this script ran.
      if (connected()) start()
    })()
  </script>
</body>
</html>`
  })
}
