# Halite Intelligence — Build Plan

Closed-loop intelligence infrastructure for beauty brands. An API platform that connects to brand websites and Shopify stores to power personalized skin routines, outcome tracking, and brand intelligence.

---

## System Overview

```
Halite Intelligence Platform
│
├── Product Recommendation Engine   — quiz → skin profile → Claude routine
├── Outcome Tracker                 — daily check-ins → compounding dataset → refinement
├── Brand Admin Dashboard           — 10 charts + AI insights + Crystal agent
└── Halite Admin Dashboard          — all brands + platform health + Crystal (Halite)
```

**Stack**
| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm workspaces |
| API | Fastify + TypeScript → Railway |
| Database | PostgreSQL (Railway) + pgvector |
| Cache / Queues | Redis (Railway) |
| AI | Claude Sonnet 4.6 (Anthropic) with prompt caching |
| Storage | AWS S3 — catalog uploads, check-in photos |
| Brand Dashboard | Next.js 14 App Router → Vercel (subdomain per brand) |
| Admin Dashboard | Next.js 14 App Router → Vercel |
| Integration | Shopify (Phase 1–2), Generic embed (Phase 7) |

**Auth tiers**
- `halite_admin` — platform team, full access
- `brand_admin` — scoped to their brand, row-level isolation
- `end_user` — issued via brand API key, consumer-facing

---

## Phase 1 — Foundation ✅ COMPLETE

**Goal:** Monorepo scaffold, database, auth, catalog ingestion, Shopify OAuth

### Deliverables

- [x] Turborepo + pnpm workspace (`apps/api`, `apps/dashboard`, `apps/admin`, `packages/db`, `packages/types`, `packages/ui`)
- [x] Prisma schema — 12 models covering brands, admins, products, end users, skin profiles, quiz sessions, routines, check-ins
- [x] Three-tier JWT auth — Halite admin login, brand admin login, end user token via API key
- [x] Catalog upload pipeline — CSV and JSON ingestion, field normalization, upsert to products table
- [x] Shopify OAuth install/callback, product webhook listener, manual sync endpoint
- [x] Brand dashboard shell — subdomain routing middleware, login page, overview, catalog upload UI
- [x] Halite admin shell — dark-themed login, brands table, platform overview
- [x] Deployment configs — `railway.toml` for API, `vercel.json` for both dashboards, `.env.example`

### Key files
```
packages/db/prisma/schema.prisma        — full data model
apps/api/src/routes/auth.ts             — 3-tier auth
apps/api/src/routes/catalog.ts          — upload + ingestion
apps/api/src/lib/catalog-processor.ts  — CSV/JSON normalization
apps/api/src/routes/shopify.ts          — OAuth + webhooks
apps/dashboard/middleware.ts            — subdomain rewriting
```

### Getting started
```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET
pnpm db:push                  # push schema to Railway Postgres
pnpm --filter @halite/db db:seed  # creates Halite admin user
pnpm dev                      # all apps on :3001, :3002, :3003
```

---

## Phase 2 — Recommendation Engine

**Goal:** Wire Claude into the quiz-to-routine pipeline. Brands get a working, AI-powered skin quiz and routine generator that can be embedded in their Shopify store.

### 2A — Product Embeddings

Generate and store a vector embedding for each product so Claude can do semantic matching against a user's skin profile.

- [ ] `POST /brands/:brandId/products/embed` — Halite admin triggers embedding run
- [ ] Use Claude's embedding endpoint (or OpenAI `text-embedding-3-small`) on a concatenated product descriptor: `name + description + concerns + ingredients + skinTypes`
- [ ] Store in `products.embedding` (pgvector `vector(1536)`)
- [ ] On every product upsert (catalog upload or Shopify sync), queue an embedding refresh job
- [ ] Add `GET /brands/:brandId/products/similar?productId=X` — cosine similarity search via pgvector

### 2B — Quiz Question Engine

The quiz is dynamic — questions branch based on prior answers. Brands configure which questions to show via their dashboard (Phase 4). Default question set:

**Block 1 — Skin type**
1. How does your skin feel by midday without any products? *(Oily all over / Oily T-zone only / Normal / Dry / Tight and flaky)*
2. How often do you experience breakouts? *(Rarely / Sometimes / Often / Almost always)*
3. How sensitive is your skin? *(Not at all / Mildly / Very / Extremely — reacts to most products)*

**Block 2 — Concerns** *(multi-select)*
4. What are your top skin concerns? *(Acne, Hyperpigmentation, Aging/fine lines, Dryness, Oiliness, Redness, Dullness, Uneven texture, Dark circles, Enlarged pores)*

**Block 3 — Fitzpatrick phototype**
5. Which best describes your natural skin tone and sun reaction? *(6-scale with visual descriptions — very fair/always burns through to dark/never burns)*

**Block 4 — Environment**
6. What best describes your climate? *(Tropical & humid / Hot & dry / Temperate / Cold & dry / Mediterranean)*
7. How much time do you spend outdoors daily? *(Under 30 min / 30 min–2 hrs / Over 2 hrs)*

**Block 5 — Lifestyle**
8. How many hours of sleep do you typically get? *(Under 5 / 5–7 / 7–9 / Over 9)*
9. How would you rate your stress level? *(1–5 scale)*
10. How much water do you drink daily? *(Under 1L / 1–2L / Over 2L)*

**Block 6 — Budget**
11. What is your monthly skincare budget? *(Under $50 / $50–$100 / $100–$200 / Over $200)*

- [ ] `GET /brands/:brandId/quiz/questions` — returns ordered question set with branching rules
- [ ] Question branching stored in a `quiz_config` JSON column on the brand model
- [ ] Extend `PATCH /brands/:brandId/quiz/sessions/:sessionId/answers` to validate question order

### 2C — Routine Generator (Claude)

Triggered when `POST .../quiz/sessions/:sessionId/complete` is called.

**Prompt strategy:**
- System prompt (cacheable — brand-level, set once): brand catalog summary, brand values, ingredient philosophy
- User turn: structured skin profile from quiz answers
- Claude selects products from the catalog, sequences them (AM/PM, step order), writes rationale and per-product usage instructions

```
POST /brands/:brandId/quiz/sessions/:sessionId/complete
→ build skin profile object from answers
→ fetch all brand products (with embeddings)
→ rank products by cosine similarity to skin profile embedding
→ top 20 candidates → send to Claude with full product details
→ Claude returns: { am: [product_ids], pm: [product_ids], rationale, instructions }
→ create Routine + RoutineSteps in DB
→ return routine to client
```

- [ ] `src/lib/routine-generator.ts` — Claude call with prompt caching on brand context
- [ ] Token usage logged to `routines.aiPromptTokens` for cost visibility
- [ ] If fewer than 5 eligible products exist, return partial routine with `incomplete: true` flag

### 2D — Embeddable Widget (Shopify)

A lightweight JavaScript snippet brands paste into their Shopify theme or drop in via Shopify Script Tags.

- [ ] `packages/widget/` — vanilla JS bundle (no framework, <30KB gzipped)
- [ ] Widget mounts via `<div id="halite-quiz" data-api-key="..."></div>`
- [ ] Handles: token issuance → quiz flow → routine display → "Add to cart" for each routine product
- [ ] Shopify Buy SDK for add-to-cart
- [ ] Widget hosted on CDN via S3 + CloudFront
- [ ] `POST /brands/:brandId/shopify/script-tag` — auto-installs the script tag via Shopify API

### Phase 2 API surface
```
GET  /brands/:brandId/quiz/questions
POST /brands/:brandId/quiz/sessions
PATCH /brands/:brandId/quiz/sessions/:sessionId/answers
POST /brands/:brandId/quiz/sessions/:sessionId/complete  ← Claude fires here
GET  /brands/:brandId/me/routine
POST /brands/:brandId/products/embed
GET  /brands/:brandId/products/similar
POST /brands/:brandId/shopify/script-tag
```

---

## Phase 3 — Outcome Tracker

**Goal:** Daily check-in system that builds the compounding `(user, routine, product, outcome)` dataset and triggers routine refinement at reorder points.

### 3A — Check-in Flow

End users are prompted to check in daily via email, SMS, or in-store widget. Each check-in logs:
- Skin rating (1–5 stars)
- Symptom tags (breakout, dryness, redness, improvement, glow, etc.)
- Compliance flag (did they use their products today?)
- Per-product reaction (positive / neutral / negative) — optional
- Photo upload — optional (stored in S3, never required)

- [ ] `POST /brands/:brandId/me/check-ins` — already scaffolded in Phase 1, now fully wired
- [ ] `GET /brands/:brandId/me/check-ins` — paginated history
- [ ] `GET /brands/:brandId/me/check-ins/streak` — consecutive days checked in
- [ ] Photo upload: presigned S3 URL → client uploads directly → saves URL only
- [ ] Check-in reminder system — `check_in_reminders` table, queue via Redis + cron

### 3B — Outcome Dataset

Every check-in creates a data point in the compounding intelligence layer. This is the core proprietary asset.

Schema additions:
```sql
outcome_vectors (
  id, end_user_id, routine_id, check_in_id,
  skin_rating, compliance, symptom_tags,
  days_into_routine, fitzpatrick_type, skin_type, concerns[],
  climate_type, created_at
)
```

- [ ] Outcome vector written on every check-in completion
- [ ] Aggregate queries powering Phase 4 dashboard charts live here
- [ ] `GET /brands/:brandId/analytics/outcomes` — brand-level outcome rollup

### 3C — Routine Refinement Loop

Triggered at the **reorder point** — when a product in the user's routine is estimated to run out based on start date and typical usage cadence (set per product category, overridable by brand).

**Reorder cadence defaults:**
- Cleanser: 60 days
- Moisturizer: 60 days
- Serum: 30–45 days
- SPF: 30 days
- Toner: 45 days

**Refinement logic:**
1. Pull user's check-in history since routine was created
2. Calculate average skin rating trend, symptom frequency, compliance rate
3. Identify products with consistently negative reactions
4. Build updated skin profile (concerns may have evolved)
5. Re-run Claude routine generator with updated profile + check-in context
6. If new routine differs from current by ≥1 product: create new Routine version, set `activeTo` on old
7. Notify user: "Your routine has been updated based on your progress"

- [ ] `src/lib/routine-refiner.ts` — Claude call with check-in summary context
- [ ] Reorder queue: Redis sorted set keyed by `reorderDue` timestamp
- [ ] Cron worker: checks queue every hour, fires refinement for due users
- [ ] `POST /brands/:brandId/me/routine/refine` — manual trigger endpoint (brand admin or user)
- [ ] `GET /brands/:brandId/me/routine/history` — all routine versions with diff

### 3D — Progress Insights (user-facing)

Short AI-generated progress summaries surfaced to the end user in the widget or brand's customer portal.

- [ ] `GET /brands/:brandId/me/insights` — returns Claude-generated summary of skin progress
- [ ] Summary generated from: days into routine, avg skin rating trend, symptom changes
- [ ] Cached per user for 24 hours (prompt cached on user history context)

### Phase 3 API surface
```
POST   /brands/:brandId/me/check-ins
GET    /brands/:brandId/me/check-ins
GET    /brands/:brandId/me/check-ins/streak
POST   /brands/:brandId/me/check-ins/photo-url     ← presigned S3
POST   /brands/:brandId/me/routine/refine
GET    /brands/:brandId/me/routine/history
GET    /brands/:brandId/me/insights
GET    /brands/:brandId/analytics/outcomes
```

---

## Phase 4 — Brand Admin Dashboard

**Goal:** Full intelligence dashboard for brand admins — 10 chart summaries, AI insights layer per chart, Crystal agent.

### 4A — Analytics Engine

Server-side aggregation queries that power all charts. Each query is scoped to `brandId` via RLS.

- [ ] `GET /brands/:brandId/analytics/summary` — all 10 chart datasets in one call, cached 1 hour
- [ ] Each dataset includes: `chartData[]`, `aiInsight` (Claude-generated), `updatedAt`
- [ ] Separate `GET /brands/:brandId/analytics/:chartId/refresh` to force-regenerate one chart

### 4B — The 10 Charts

Each chart has: visualization, AI insight paragraph, "What to do" recommendation, "Watch for" alert.

**1. Skin Concern Distribution** *(Donut chart)*
- Data: count of `skinProfile.concerns[]` across all end users, grouped by concern tag
- AI insight: "X% of your customers are dealing with hyperpigmentation — your catalog has strong serum coverage here but limited SPF options for darker Fitzpatrick types."
- Action: flag product gaps, link to catalog upload

**2. Fitzpatrick Type Breakdown** *(Horizontal bar chart)*
- Data: count of users per Fitzpatrick type (I–VI)
- AI insight: formulation and shade range coverage assessment vs. actual customer base
- Flag: if >30% of users are Type IV–VI but <20% of products list Fitzpatrick compatibility

**3. Routine Compliance Rate** *(Line chart, rolling 30d)*
- Data: daily `compliant = true` check-ins / total check-ins
- AI insight: compliance trend interpretation — dropping compliance is an early churn signal
- Alert trigger: if 7-day avg drops below 60%, surface warning

**4. Product Outcome Heatmap** *(Matrix: product × skin concern)*
- Data: for each product, avg skin rating from check-ins where that product was used, grouped by user's primary concern
- AI insight: "Your Vitamin C serum scores 4.6/5 for hyperpigmentation but only 3.1/5 for acne — consider repositioning its recommendation targeting."
- Hover: raw check-in count per cell

**5. Repurchase Velocity by SKU** *(Ranked bar chart)*
- Data: routine refinements where product was retained + Shopify reorder events (if connected)
- AI insight: top 3 stickiest products and why (correlated with which skin concerns they serve)
- Flag: products frequently dropped at refinement → formulation signal

**6. Customer Lifecycle Funnel** *(Funnel chart)*
- Stages: Quiz Started → Quiz Completed → Routine Created → First Check-in → 30-day Active → 90-day Retained
- Data: user counts at each stage, drop-off %
- AI insight: where the biggest drop-off is and what it typically means (e.g., quiz completion drop = too many questions)

**7. Check-in Sentiment Trend** *(Area chart, 90d)*
- Data: rolling avg skin rating across all users, segmented by skin type
- AI insight: leading indicator — rising trend = product-market fit signals; falling = formulation or routine design issue
- Overlay: routine refinement events as markers on the timeline

**8. Climate Region × Skin Type Map** *(Bubble map or grouped bar)*
- Data: users grouped by `climateType` × `skinType`, sized by count
- AI insight: "40% of your dry-climate customers have dry skin — your current catalog underserves this combination. Consider a barrier-repair moisturizer."
- Opportunity: geo-targeted product recommendations or bundles

**9. Budget Tier Cohort Performance** *(Grouped bar or box plot)*
- Data: avg skin rating, compliance rate, and 90-day retention grouped by `monthlyBudget` tier
- AI insight: LTV signal — whether premium users get better outcomes (they should, given routine complexity) and whether budget customers churn faster
- Flag: if budget-tier users have worse outcomes, the routine generator may be over-indexing on expensive products

**10. Ingredient Efficacy Index** *(Ranked table with trend indicators)*
- Data: ingredients (from `products.keyIngredients`) ranked by avg skin rating of check-ins where a product containing that ingredient was used
- AI insight: "Niacinamide appears in 6 of your top-10 performing products. Consider this a hero ingredient signal for your next formulation."
- Filter: by concern (show efficacy index for acne, aging, etc.)

### 4C — AI Insights Layer

Each chart gets a dedicated Claude call generating its insight. Claude is given:
- The chart dataset (structured JSON)
- The brand's product catalog summary (prompt-cached)
- Instructions to be specific, actionable, and concise 

- [ ] `src/lib/ai-insights.ts` — shared Claude call wrapper with prompt caching
- [ ] Insights regenerated on chart refresh, cached in DB (`insights_cache` table)
- [ ] Insights should be broken into 3 parts: data/information summary, how brand can use data for customer targeting/retention/product formulation etc. and things brand should take note of
- [ ] Insight displayed inline below each chart with a "Regenerate" button

### 4D — Crystal (Brand Agent)

Crystal is a Claude agent preloaded with everything about the brand — chat interface in the dashboard sidebar. There is also a record of all Crystal chats by brand that the brand admin can refer to at any point in time.

**Crystal's context (prompt-cached):**
- Full product catalog (name, category, concerns, ingredients, price)
- Aggregated skin profile distribution of all users
- Top 10 check-in symptoms and their frequency
- Compliance and sentiment trend summary
- Latest routine refinement signals
- The 10 chart datasets

**What Crystal can do:**
- Answer freeform questions: "Which products are causing the most negative reactions in Type III skin?"
- Generate custom reports: "Give me a breakdown of my oily-skin customers in hot climates"
- Surface recommendations: "What should I reorder based on current routine demand?"
- Synthesize cross-chart insights: "What does our data say about customer retention this quarter?"

- [ ] `GET /brands/:brandId/crystal/context` — assembles and returns Crystal's system prompt
- [ ] `POST /brands/:brandId/crystal/chat` — streaming Claude response
- [ ] Chat history persisted in `crystal_messages` table (per brand, per admin user)
- [ ] Crystal panel: slide-in drawer in dashboard, floating chat, supports markdown rendering
- [ ] Crystal preloads context on first open, refreshes every 24h

### 4E — Dashboard Pages

- [ ] `/[slug]/insights` — main chart dashboard, all 10 charts in grid, AI insight per chart
- [ ] `/[slug]/customers` — end user list, click through to individual profile + check-in timeline
- [ ] `/[slug]/customers/[userId]` — full user view: skin profile, routine, check-in history, outcome trend chart
- [ ] `/[slug]/crystal` — Crystal chat full-page view
- [ ] `/[slug]/settings` — brand profile, Shopify connection, API key, quiz configuration
- [ ] `/[slug]/settings/shopify` — Shopify install flow, sync status, webhook health
- [ ] `/[slug]/catalog` — product table with edit, search, filter by concern/category

### Phase 4 API surface
```
GET  /brands/:brandId/analytics/summary
GET  /brands/:brandId/analytics/:chartId/refresh
POST /brands/:brandId/crystal/chat
GET  /brands/:brandId/crystal/context
GET  /brands/:brandId/customers
GET  /brands/:brandId/customers/:userId
```

---

## Phase 5 — Halite Admin Dashboard

**Goal:** Platform-level view across all brands, Crystal for Halite team, AI insights per view.

### 5A — Platform Analytics

Cross-brand aggregate data (all queries anonymized and aggregated — no individual brand data leaks across tenants).

- [ ] `GET /admin/analytics/platform` — returns platform-wide summary:
  - Total brands, by plan tier
  - Total end users, total check-ins (30d, 90d, all-time)
  - Total routines generated
  - Platform-wide avg skin rating trend
  - Top-performing ingredient across all brands (anonymized)
  - Quiz completion rate (platform avg vs. per brand)

**Admin dashboard pages:**
- `/dashboard` — platform overview stat cards + brand health table
- `/brands` — all brands list (status, plan, user count, Shopify, last active)
- `/brands/[brandId]` — full brand profile, their analytics, integration health, Crystal access
- `/brands/new` — onboard a new brand (creates brand + owner admin)
- `/insights` — cross-brand aggregate charts (Fitzpatrick distribution across platform, top concerns, ingredient efficacy benchmark)
- `/crystal` — Crystal for Halite (see below)
- `/settings` — platform configuration

### 5B — Brand Health Signals

For each brand, compute a health score surfaced in the brands table:

| Signal | Weight |
|--------|--------|
| Quiz completion rate | 20% |
| 30-day check-in rate | 25% |
| Avg skin rating (30d) | 20% |
| Routine compliance | 20% |
| 90-day user retention | 15% |

- [ ] `GET /admin/brands/:brandId/health` — returns score + per-signal breakdown
- [ ] Health score color-coded in brands table (green / amber / red)
- [ ] Brands with health score < 40 flagged with a "Needs attention" badge

### 5C — Crystal for Halite

Same architecture as brand Crystal but scoped to the full platform dataset.

**Crystal (Halite) context includes:**
- All brand summaries (anonymized where needed)
- Platform aggregate analytics
- Brand health scores
- Integration health across all Shopify connections
- Revenue signals (plan tier distribution, churn risk by brand)

**What Halite Crystal can do:**
- "Which brands are at risk of churn this quarter?"
- "Show me platform-wide ingredient efficacy for niacinamide"
- "Which brands have the highest quiz completion rates and what do they have in common?"
- "Give me a board-ready summary of platform performance this month"
- "Which brand should we move to Enterprise based on their usage?"

- [ ] `POST /admin/crystal/chat` — Halite admin scoped, full platform context
- [ ] Chat history per Halite admin user

### 5D — AI Insights per Admin View

Each admin dashboard section gets an AI-generated insight block, same pattern as brand dashboard:
- Platform overview: "Platform is growing — 3 brands are outperforming on check-in compliance. The common factor is quiz length under 8 questions."
- Brand detail view: "This brand's Fitzpatrick Type IV–VI users have 30% lower compliance than Type I–III — potential onboarding or product fit issue."
- Cross-brand insights chart: summary of what the aggregate data is saying

### Phase 5 API surface
```
GET  /admin/analytics/platform
GET  /admin/brands
GET  /admin/brands/:brandId/health
POST /admin/brands
PATCH /admin/brands/:brandId
POST /admin/crystal/chat
GET  /admin/insights/cross-brand
```

---

## Phase 6 — Shopify App (Full)

**Goal:** Promote from OAuth integration to a listed Shopify App with embedded UI, App Bridge, and full storefront integration.

### 6A — Shopify App Listing

- [ ] Shopify Partners account setup, app listing creation
- [ ] App embed in Shopify Admin (App Bridge 3.x) — brands manage Halite from within their Shopify admin
- [ ] Shopify App Proxy — routes `/a/halite/*` to Halite API, enables server-rendered content on brand storefront

### 6B — Storefront Integration

- [ ] Quiz widget embedded as a Shopify Theme App Extension — no code pasting required, drop in via theme editor
- [ ] Shopify customer metafields — sync skin profile and active routine to Shopify customer record
- [ ] Post-purchase routine prompt — after order containing skincare products, trigger check-in enrollment
- [ ] Reorder notification — Shopify marketing automation triggers at reorder point

### 6C — Shopify Flow Integration

- [ ] Shopify Flow triggers:
  - `HaliteRoutineCreated` — user completed quiz and got a routine
  - `HaliteCheckInSubmitted` — user logged a check-in
  - `HaliteReorderPoint` — user's routine hits reorder cadence
  - `HaliteRoutineRefined` — routine was updated
- [ ] Brand admins build Shopify automations on top of these triggers (email flows, discount codes, loyalty points)

### 6D — Shopify Sync Enhancements

- [ ] Bidirectional sync: Halite product tagging writes back to Shopify product tags (`halite:concern:acne`, `halite:fitzpatrick:IV`)
- [ ] Inventory signals: out-of-stock products automatically excluded from routine generation
- [ ] Collections sync: Halite routine products auto-added to a `Your Routine` collection per customer (via Shopify customer-specific collections)

---

## Phase 7 — Generic Embed (Non-Shopify)

**Goal:** Any brand website (custom, WordPress, Webflow, etc.) can embed Halite without Shopify.

### 7A — JavaScript SDK

- [ ] `packages/sdk/` — published as `@halite/sdk` on npm
- [ ] Drop-in widget: `<script src="https://cdn.haliteintelligence.com/sdk.js" data-key="..."></script>`
- [ ] Supports: quiz, routine display, check-in form, progress dashboard (embeddable iframe)
- [ ] Framework wrappers: `@halite/react`, `@halite/vue` (thin wrappers around core SDK)

### 7B — REST API Documentation

- [ ] Public API docs at `docs.haliteintelligence.com` (built with Mintlify or Scalar)
- [ ] Postman collection + OpenAPI spec auto-generated from Fastify route schemas
- [ ] API versioning (`/v1/...`) locked in
- [ ] API rate limits documented per plan tier

### 7C — Webhook System (Outbound)

Allow brands to receive Halite events at their own endpoints:

```
quiz.completed          → { userId, sessionId, skinProfile }
routine.created         → { userId, routineId, products[] }
checkin.submitted       → { userId, checkInId, skinRating }
routine.refined         → { userId, oldRoutineId, newRoutineId, diff[] }
reorder.triggered       → { userId, routineId, products[] }
```

- [ ] `brand_webhooks` table — endpoint URL, secret, event subscriptions
- [ ] Signed delivery with `X-Halite-Signature` header
- [ ] Retry logic with exponential backoff (3 attempts)
- [ ] Webhook delivery log in brand dashboard settings

---

## Cross-Cutting Concerns

### Security
- All brand data isolated via `brandId` scoping on every query (RLS enforced at Postgres level)
- API keys hashed in DB, never returned after creation (only shown once)
- Shopify tokens encrypted at rest (AES-256)
- S3 objects private by default, served via presigned URLs
- Rate limiting per API key (configurable per plan tier)
- Webhook signatures prevent spoofing

### Observability
- Fastify `pino` logger → Railway log drain
- Claude token usage tracked per call (`aiPromptTokens` on Routine, cached separately for Crystal)
- Error rate and latency tracked per endpoint
- Catalog processing errors surfaced to brand admin in upload history

### Performance
- Brand Crystal context prompt-cached (5-min TTL) — large context, high reuse
- Analytics queries cached 1 hour per brand, invalidated on new check-ins
- pgvector cosine similarity queries index on `embedding` column (IVFFlat)
- Presigned URLs for all large object delivery

### Cost Management
- Claude prompt caching reduces brand Crystal cost by ~80% (brand catalog is the expensive part)
- Analytics insight generation batched — one Claude call per chart refresh, not per page view
- Token usage dashboard in Halite admin to monitor per-brand AI spend

---

## Milestones

| Phase | Target | Key Unlock |
|-------|--------|------------|
| 1 — Foundation | Week 3 | Brands can onboard, upload catalogs, Shopify connects |
| 2 — Recommendation Engine | Week 6 | First AI-generated skin routine delivered to an end user |
| 3 — Outcome Tracker | Week 8 | First compounding dataset row written; routine refinement fires |
| 4 — Brand Dashboard | Week 11 | Brand admins see their first 10 charts + talk to Crystal |
| 5 — Halite Admin | Week 12 | Halite team sees all brands; Crystal works at platform level |
| 6 — Shopify App | Week 14 | Listed on Shopify App Store; no-code embed for merchants |
| 7 — Generic Embed | Week 16 | Any website can integrate; public API docs live |
