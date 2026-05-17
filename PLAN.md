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

## Phase 8 — Crystal Agent System

**Goal:** Build the Crystal agent as a fully-realized, context-aware AI operator — one for each brand, one for the Halite team. Crystal is not a chatbot. It is a structured intelligence layer with memory, tool access, and proactive output. Phase 8 is the proof of concept that the agent architecture works before brands can build their own.

### 8A — Brand Crystal Agent

Crystal for brand admins. Preloaded with everything about the brand — product catalog, consumer skin profiles, check-in trends, routine performance, analytics — and accessible via a premium dashboard experience.

**Crystal's context (prompt-cached on brand level):**
- Full product catalog (name, category, concerns, ingredients, price, performance signals)
- Aggregated skin profile distribution across all end users
- Top check-in symptoms and frequency trends
- Compliance and sentiment trend summaries
- Latest routine refinement signals
- The 10 analytics chart datasets

**Crystal's primary interface — the Intelligence Feed (not chat):**
- Daily signal surface: emerging skin concerns, compliance dips, product reaction anomalies
- Proactive opportunity cards: "Your dry-skin consumers are showing increased dullness concern — you have no targeted serum for this segment."
- Anomaly alerts: "Check-in compliance dropped 18% this week among Type IV–VI users."
- Weekly intelligence summary report (auto-generated, downloadable)

**Crystal's secondary interface — conversational drill-down:**
- Contextual chat embedded per-section in the dashboard ("Why did compliance drop?")
- Freeform queries: "Which products are causing negative reactions in oily-skin users?"
- Custom report generation: "Give me a breakdown of my humid-climate consumers by age range."
- Cross-chart synthesis: "What does our data say about retention this quarter?"

- [ ] `GET /brands/:brandId/crystal/context` — assemble Crystal's full system prompt from live brand data
- [ ] `POST /brands/:brandId/crystal/chat` — streaming Claude response (conversational layer)
- [ ] `GET /brands/:brandId/crystal/feed` — daily proactive intelligence feed (signals, opportunities, anomalies)
- [ ] `POST /brands/:brandId/crystal/report` — generate weekly intelligence summary (Claude, prompt-cached brand context)
- [ ] `crystal_messages` table — chat history per brand, per admin user
- [ ] `crystal_reports` table — weekly reports stored and versioned per brand
- [ ] Crystal panel in brand dashboard: slide-in drawer for chat, full `/[slug]/crystal` page for feed + reports
- [ ] Brand context refreshes every 24h; prompt-cached for the 5-min TTL window per request
- [ ] Crystal feed cards are dismissable, approvable, and exportable

### 8B — Halite Crystal Agent

Crystal at platform scale. Scoped to the full dataset across all brands. Used by the Halite team for board-level synthesis, brand health monitoring, and platform intelligence.

**Crystal (Halite) context includes:**
- All brand summaries (anonymized where required for cross-brand queries)
- Platform aggregate analytics (quiz completion, routine generation, check-in rates, sentiment trends)
- Brand health scores across all tenants
- Integration health across all Shopify connections
- Revenue signals: plan tier distribution, churn risk indicators, usage velocity

**What Halite Crystal can do:**
- "Which brands are at risk of churn this quarter?"
- "Show platform-wide ingredient efficacy for niacinamide across all brands."
- "Which brand should we move to Enterprise based on usage?"
- "Give me a board-ready summary of platform performance this month."
- "What do our top 5 brands have in common that our bottom 5 don't?"

- [ ] `POST /admin/crystal/chat` — Halite admin scoped, streaming, full platform context
- [ ] `GET /admin/crystal/feed` — platform-level proactive intelligence feed
- [ ] `POST /admin/crystal/report` — monthly platform performance report
- [ ] Chat history per Halite admin user
- [ ] `/crystal` page in Halite admin dashboard

### 8C — Agent Infrastructure (Shared)

The underlying system both Crystal variants and Phase 9 custom agents run on.

- [ ] `Agent` model — stores identity, instruction set, memory config, tool permissions, delivery config
- [ ] `AgentMessage` model — persists all agent conversations and outputs
- [ ] `AgentReport` model — stores scheduled reports and generated summaries
- [ ] `AgentSignal` model — stores proactive feed items (signals, opportunities, anomalies) with dismissed/approved state
- [ ] Prompt assembly pipeline: identity layer + instruction layer + memory layer + live data retrieval
- [ ] Tool registry: each tool (analytics query, product lookup, check-in summary, competitor data) registered with schema
- [ ] Claude Sonnet 4.6 with prompt caching on the identity + instruction layers (stable across requests)
- [ ] Token usage tracked per agent per request in `agent_token_log`

### Phase 8 API surface
```
GET  /brands/:brandId/crystal/context
POST /brands/:brandId/crystal/chat
GET  /brands/:brandId/crystal/feed
POST /brands/:brandId/crystal/report
POST /admin/crystal/chat
GET  /admin/crystal/feed
POST /admin/crystal/report
```

---

## Phase 9 — Brand Agent Builder

**Goal:** Brands create their own purpose-built agents. Not chatbots with names — structured decision-making systems with memory, tool access, defined objectives, and deliverable outputs. This transforms Halite from a dashboard into a living operating system. Switching costs become brutal: brands lose not just charts but institutional memory, learned workflows, and accumulated strategic intelligence.

### 9A — Agent Templates (Marketplace)

Pre-built agents brands can deploy in minutes. Each template comes with a recommended objective, default data access, suggested output format, and trigger cadence. Brands can customize from there.

**Template library:**

| Template | Optimizes For | Primary Output |
|----------|---------------|----------------|
| Trend Scout | Emerging ingredient, texture, and ritual trends | Weekly signal digest |
| Product Opportunity Analyst | Whitespace gaps, underserved demographics, unmet claims | Opportunity briefs |
| Launch Strategist | Launch timing, positioning, pricing, risk assessment | Launch recommendations |
| Consumer Persona Agent | Evolving personas, emotional drivers, churn signals | Living persona profiles |
| Retail Performance Agent | Sell-through, assortment gaps, regional performance | Retailer recommendations |
| Competitive Intelligence | Competitor launches, sentiment shifts, pricing moves | Competitor watch reports |
| Formulation Co-Pilot | Ingredient trends, consumer complaints, reformulation signals | Formulation recommendations |
| Pricing Strategist | Price elasticity, competitor pricing, budget cohort performance | Pricing recommendations |
| Creator Discovery | Creator-mention velocity, ingredient overlap with creators, audience fit | Creator opportunity list |
| Assortment Optimizer | SKU cannibalization, portfolio gaps, seasonal whitespace | Assortment recommendations |

- [ ] `agent_templates` table — seeded with 10 templates above, each with default config JSON
- [ ] `GET /agents/templates` — list all available templates
- [ ] Template clone-on-deploy: creates a new `Agent` record pre-populated from template defaults
- [ ] `/[slug]/agents/marketplace` — template gallery page in brand dashboard

### 9B — Agent Builder (Configuration Flow)

A structured 10-step configuration experience. The interface feels like assigning a role to an employee, not writing a prompt. No blank text boxes.

**Step 1 — Choose a Goal**
Dropdown of business outcomes ("Detect emerging trends", "Identify whitespace opportunities", "Improve launch success", "Monitor competitor movement", "Reduce inventory risk"). Starts from a template or blank.

**Step 2 — Configure Objective**
Weighted priority sliders and toggles — not freeform text. Example: trend detection weight, geographic scope, category focus. System assembles the instruction layer from structured inputs.

**Step 3 — Select Data Sources**
Toggle panel: which data rooms does this agent have access to?
- Internal: quiz results, check-in data, product catalog, sales, routine performance
- Shopify: orders, inventory, sell-through
- Consumer: skin profiles, sentiment trends, cohort analysis
- Platform benchmarks: anonymized cross-brand signals (if on Enterprise plan)

**Step 4 — Define Scope + Constraints**
Category focus, demographic focus, geographic focus, market tier (prestige / mass / indie), time window. Constraints prevent hallucination drift and keep outputs on-brand.

**Step 5 — Choose Deliverables**
What does this agent produce? (Not "what can you ask it") — weekly reports, real-time alerts, opportunity briefs, competitor summaries, launch recommendations, market maps, executive slides, email digests. Brands select output format and destination.

**Step 6 — Define Triggers**
Event-driven or scheduled:
- Schedule: daily / weekly / monthly / custom cron
- Threshold: "alert when a trend grows 30% week-over-week"
- Event: "run when a new check-in batch is processed"
- Comparison: "notify when competitor sentiment drops below 3.5"

**Step 7 — Assign Action Permissions**
Graduated autonomy levels:
- Analyze only
- Recommend actions
- Generate reports
- Send alerts
- Auto-run workflows
- Trigger integrations (Slack, email, Shopify)

**Step 8 — Brand Training**
Upload brand context documents: positioning, past launch performance, tone of voice, ingredient philosophy, strategic goals, consumer personas. Stored as embeddings alongside structured profile data. The same trend produces different recommendations for Sol de Janeiro vs. Aesop vs. Topicals — because each agent knows its brand.

**Step 9 — Review + Activate**
Summary screen showing the agent's full configuration. Estimated weekly token cost. Option to run a preview output before going live.

- [ ] `Agent` model fields: `templateId`, `name`, `goal`, `instructionConfig` (JSON), `dataSources` (JSON), `scope` (JSON), `deliverables` (JSON), `triggerConfig` (JSON), `permissions` (JSON), `brandContext` (text, embedded), `active`, `brandId`
- [ ] `POST /brands/:brandId/agents` — create agent from template or blank
- [ ] `GET /brands/:brandId/agents` — list all agents for a brand
- [ ] `GET /brands/:brandId/agents/:agentId` — get agent config
- [ ] `PATCH /brands/:brandId/agents/:agentId` — update agent config
- [ ] `DELETE /brands/:brandId/agents/:agentId` — deactivate/delete agent
- [ ] `POST /brands/:brandId/agents/:agentId/preview` — run a one-off preview output
- [ ] `POST /brands/:brandId/agents/:agentId/train` — ingest brand context documents into agent embeddings
- [ ] Brand context documents stored in S3, embedded with OpenAI/Claude, linked to agent via `agent_context_documents` table
- [ ] Builder UI: `/[slug]/agents/new` — 10-step flow with step validation and preview
- [ ] Edit UI: `/[slug]/agents/:agentId/settings`

### 9C — Agent Dashboard (Primary Interface)

The agent's home is not a chat window. It is a structured output dashboard — closer to Bloomberg Terminal than ChatGPT.

**Agent dashboard layout:**
- Header: agent name, role, last run, next scheduled run, status indicator
- **Today's Signals** — real-time or most recent feed of detected signals, ranked by relevance
- **Recommended Opportunities** — structured opportunity cards with supporting data
- **Watch List** — monitored competitors, ingredients, or metrics with change indicators
- **Latest Report** — link to most recent generated report with key highlights inline
- **Action Center** — pending recommendations the brand team can approve, dismiss, assign, or export

Signal cards include: signal title, supporting data points, trend direction, confidence level, recommended action, "Ask [Agent Name]" button to open conversational drill-down.

- [ ] `AgentSignal` model — `agentId`, `type` (signal/opportunity/anomaly/watch), `title`, `body`, `data` (JSON), `confidence`, `status` (pending/approved/dismissed), `createdAt`
- [ ] `GET /brands/:brandId/agents/:agentId/signals` — paginated signal feed
- [ ] `PATCH /brands/:brandId/agents/:agentId/signals/:signalId` — approve/dismiss/assign
- [ ] `GET /brands/:brandId/agents/:agentId/reports` — list generated reports
- [ ] `GET /brands/:brandId/agents/:agentId/reports/:reportId` — get full report
- [ ] Dashboard page: `/[slug]/agents/:agentId` — signal feed + opportunities + action center
- [ ] `/[slug]/agents` — all agents overview (status, last signal, health)

### 9D — Conversational Drill-Down (Secondary Interface)

Chat exists as an investigative layer on top of the structured dashboard. Accessed via "Ask [Agent Name]" on any signal card or report section. The agent already has context on what you're looking at.

- [ ] `POST /brands/:brandId/agents/:agentId/chat` — streaming response, contextually aware of current signal or report
- [ ] Conversation pinned to signal or report context (passed as system message addition)
- [ ] Chat history stored per agent, per session in `AgentMessage` table
- [ ] "Explain this" / "Show me more data" / "What should we do?" are the dominant use cases — not open-ended prompting

### 9E — Trigger Engine + Scheduler

Agents run on schedule or on event. This is what makes the system operational software rather than a query interface.

- [ ] Redis-backed job queue (Bull or BullMQ) for scheduled agent runs
- [ ] Cron-based scheduler: registers each active agent's trigger config on activation
- [ ] Event listeners: check-in batch complete → trigger relevant agents; new Shopify order → trigger Retail agent; competitor data refresh → trigger Competitive Intelligence agent
- [ ] Threshold monitor: runs after each data refresh, evaluates trigger conditions for all active agents, enqueues jobs when conditions met
- [ ] Job result → writes `AgentSignal` records → pushes to dashboard feed
- [ ] Delivery integrations: email digest, Slack notification (via brand-configured webhook), in-app notification

### Phase 9 API surface
```
GET    /agents/templates
POST   /brands/:brandId/agents
GET    /brands/:brandId/agents
GET    /brands/:brandId/agents/:agentId
PATCH  /brands/:brandId/agents/:agentId
DELETE /brands/:brandId/agents/:agentId
POST   /brands/:brandId/agents/:agentId/preview
POST   /brands/:brandId/agents/:agentId/train
POST   /brands/:brandId/agents/:agentId/chat
GET    /brands/:brandId/agents/:agentId/signals
PATCH  /brands/:brandId/agents/:agentId/signals/:signalId
GET    /brands/:brandId/agents/:agentId/reports
GET    /brands/:brandId/agents/:agentId/reports/:reportId
```

---

## Phase 10 — Multi-Agent Orchestration

**Goal:** Agents collaborate. The Trend Scout feeds the Opportunity Analyst feeds the Launch Strategist. This is no longer analytics software — it is an autonomous strategy layer. A constellation of specialized operators that work independently, surface to humans at decision points, and compound intelligence over time.

### 10A — Agent-to-Agent Communication

Agents can publish outputs that other agents subscribe to as inputs. Defined via a workflow graph — no agent modifies another's config, but outputs flow between them as structured data events.

**Example workflow: "Blue Tansy Launch Brief"**
```
Trend Scout Agent
  detects: "Blue tansy nighttime body oils accelerating 40% WoW"
    ↓
Opportunity Analyst Agent
  checks: prestige market saturation low; unmet claims in "calming luxury" body oil
    ↓
Consumer Persona Agent
  finds: Gen Z consumers associate blue tansy with calming ritual; high compliance segment
    ↓
Launch Strategist Agent
  produces: pricing ($38–$58), positioning ("ritual-first"), timing (Q4), channel (DTC-first then Sephora), risk flags
    ↓
Action Center
  presents: launch brief for brand team approval
```

- [ ] `AgentWorkflow` model — `brandId`, `name`, `steps` (ordered JSON array of agentId + input mapping + output mapping), `triggerAgentId`, `active`
- [ ] `AgentWorkflowRun` model — tracks each workflow execution, step status, intermediate outputs
- [ ] Workflow engine: on `AgentSignal` creation, check if any workflow is subscribed to that agent's output type; if so, enqueue the next step
- [ ] Input mapping: specify which fields of the upstream signal map to which context fields for the downstream agent
- [ ] `POST /brands/:brandId/workflows` — create workflow
- [ ] `GET /brands/:brandId/workflows` — list workflows
- [ ] `PATCH /brands/:brandId/workflows/:workflowId` — update
- [ ] `POST /brands/:brandId/workflows/:workflowId/run` — manual trigger
- [ ] `GET /brands/:brandId/workflows/:workflowId/runs` — execution history
- [ ] Workflow builder UI: `/[slug]/agents/workflows` — visual graph with agent nodes and data flow arrows

### 10B — Agent Memory + Learning

Agents improve over time. Approvals and rejections teach the agent what "good" looks like for this brand. This is where institutional memory accumulates and switching costs compound.

- [ ] `AgentFeedback` model — `agentId`, `signalId`, `action` (approved/dismissed/assigned), `adminId`, `note`, `createdAt`
- [ ] Feedback summary injected into agent context on each run: "In the past 90 days, this brand approved 23 trend signals and dismissed 8. Dismissed signals tended to be in the mass-market tier and vitamin C-focused."
- [ ] Agent accuracy score: ratio of approved to total signals, tracked over time, surfaced in agent settings
- [ ] `GET /brands/:brandId/agents/:agentId/feedback` — feedback history
- [ ] Agents adapt scope implicitly: dismissed signals inform the constraint layer without requiring manual config changes
- [ ] Brand context re-embedding triggered on document upload or significant feedback volume threshold

### 10C — Proactive Intelligence Layer

Agents run continuously in the background. No one needs to open the dashboard for value to be generated. Intelligence surfaces when it's ready — not when someone remembers to log in.

- [ ] Push notification system: in-app, email, and Slack delivery of high-confidence signals
- [ ] Signal priority scoring: each signal gets a relevance score based on confidence, recency, brand priority weights, and historical approval rate
- [ ] "Morning brief" digest: daily summary of all agent outputs across a brand's full agent constellation, delivered at configured time
- [ ] Anomaly detection: statistical threshold monitoring on core metrics (compliance rate, sentiment score, product reaction ratio) — fires immediately when crossed regardless of schedule
- [ ] `notification_preferences` table per brand admin: delivery channel, digest timing, minimum signal confidence threshold

### 10D — Cross-Brand Intelligence (Halite Layer)

Anonymized, aggregated signals across all brands on the platform become a proprietary intelligence layer no individual brand can replicate. Available to Halite Crystal and — on Enterprise plan — as a benchmark feed for brand agents.

- [ ] Platform trend index: ingredient velocity, skin concern shifts, ritual emergence — computed weekly across all consumer profiles and check-ins, stored in `platform_trend_signals`
- [ ] Benchmark layer: brand agents can query anonymized platform percentiles ("how does my compliance rate compare to brands of similar size and category?")
- [ ] `GET /admin/intelligence/trends` — platform trend index (Halite admin only)
- [ ] Enterprise plan brands can enable "Platform Benchmarks" data source in agent config — feeds anonymized signal percentiles into their agents
- [ ] Halite Crystal uses full platform trend index as part of its context

### 10E — Autonomous Output Generation

At the highest tier: agents don't just recommend — they produce. Brand teams review and approve, but the labor of synthesis, drafting, and structuring is done.

- [ ] Launch brief generator: Launch Strategist agent produces a full structured launch brief (positioning, pricing, timing, channel strategy, risk flags) as a downloadable PDF/Notion export
- [ ] Assortment plan generator: Assortment Optimizer produces a ranked SKU recommendation list with supporting data, exportable to CSV
- [ ] Retailer deck generator: Retail Performance agent produces a slide-ready summary of sell-through performance and expansion recommendations (Claude + structured template)
- [ ] `AgentDocument` model — `agentId`, `type` (launch_brief/assortment_plan/retailer_deck/report), `content` (JSON), `exportUrl` (S3), `status` (draft/approved), `createdAt`
- [ ] `POST /brands/:brandId/agents/:agentId/documents` — trigger document generation
- [ ] `GET /brands/:brandId/agents/:agentId/documents` — list generated documents
- [ ] Document approval flow: brand admin reviews → approves or requests revision → Claude re-runs with revision note
- [ ] Export formats: PDF (via Puppeteer or similar), CSV, JSON

### Phase 10 API surface
```
POST  /brands/:brandId/workflows
GET   /brands/:brandId/workflows
PATCH /brands/:brandId/workflows/:workflowId
POST  /brands/:brandId/workflows/:workflowId/run
GET   /brands/:brandId/workflows/:workflowId/runs
GET   /brands/:brandId/agents/:agentId/feedback
POST  /brands/:brandId/agents/:agentId/documents
GET   /brands/:brandId/agents/:agentId/documents
GET   /admin/intelligence/trends
```

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
| 8 — Crystal Agent System | Week 19 | Crystal live for brands and Halite team; proactive feed + weekly reports |
| 9 — Brand Agent Builder | Week 24 | Brands deploy purpose-built agents from templates or custom config |
| 10 — Multi-Agent Orchestration | Week 30 | Agents collaborate; autonomous output generation; platform intelligence layer |
