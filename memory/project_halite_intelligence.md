---
name: Halite Intelligence — Project Architecture
description: Core architecture decisions, tech stack, and phase plan for the Halite Intelligence platform
type: project
---

Halite Intelligence is a closed-loop beauty brand intelligence API platform with four pillars: Product Recommendation Engine, Outcome Tracker, Brand Admin Dashboard, and Halite Admin Dashboard.

**Why:** Beauty brands need a data-compounding layer that ties product usage to skin outcomes and surfaces actionable intelligence.

**How to apply:** All feature work should be scoped to one of the four pillars. Data model decisions should preserve the core `(user_profile, routine, product, outcome)` vector as the proprietary data asset.

## Architecture Decisions

- **Monorepo:** Turborepo + pnpm workspaces
- **Hosting:** Vercel (dashboards) + Railway (API + PostgreSQL)
- **Integration priority:** Shopify-first; generic embed in a later phase
- **Brand dashboards:** Each brand gets its own subdomain (`{slug}.haliteintelligence.com`)
- **AI:** Claude Sonnet 4.6 with prompt caching (brand context is large)
- **DB:** PostgreSQL on Railway + pgvector for product/skin embeddings
- **API framework:** Fastify + TypeScript
- **Dashboard framework:** Next.js 14 (App Router)

## Monorepo Structure

```
halite-intelligence/
├── apps/
│   ├── api/          # Fastify API → Railway
│   ├── dashboard/    # Next.js brand admin → Vercel (subdomain per brand)
│   └── admin/        # Next.js Halite admin → Vercel
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
└── turbo.json
```

## Build Phases

- **Phase 1** (current): Foundation — monorepo, DB schema, auth (3 tiers), catalog upload skeleton
- **Phase 2**: Recommendation Engine — quiz engine, Claude routine generation, embeddable widget
- **Phase 3**: Outcome Tracker — check-ins, dataset accumulation, routine refinement
- **Phase 4**: Brand Admin Dashboard — 10 charts, AI insights layer, Crystal agent
- **Phase 5**: Halite Admin Dashboard — multi-brand view, Crystal (Halite-scoped)
- **Phase 6**: Shopify App integration

## Auth Tiers

1. Halite Admin — email/password → JWT
2. Brand Admin — email/password → JWT (brand-scoped)
3. End User — token issued via brand API key (embeddable in brand site)
