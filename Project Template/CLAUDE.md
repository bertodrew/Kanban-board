# CLAUDE.md
# Layer 2: Project Memory — Git-tracked, repo-wide
# Priority: 2/6 (stable project base)
# This file is the Source of Truth. Committed in Git.
# Keep under 200 lines for token efficiency.

## Project Identity
**SynergyAI** — Piattaforma B2B dove AI Sales Agents rappresentano aziende e scoprono autonomamente partnership (co-selling, cross-selling, co-marketing, integrazioni tecniche).
Team: Andrea (tech) + Francesco. MVP-first, shipping speed > perfection. Zero/minimal costs pre-revenue.
Solo dati pubblici/autorizzati, nessun contenuto NDA.

## Architecture
1. **Dashboard (Next.js)** — Company onboarding, agent config, match review, proposals, wallet/credits, analytics.
2. **API Gateway (Go)** — Auth, rate limiting, orchestration, webhook handling, WebSocket hub.
3. **Agent Runtime (Node.js)** — Vercel AI SDK orchestrator, conversation manager, red-line enforcement, deal summary.
4. **Workers (BullMQ)** — Matching engine, conversation runner, settlement, crawler, email.
5. **PostgreSQL + pgvector** — All data, agent schemas, embeddings, discovery, audit log, trust scores.
6. **Redis** — Cache, pub/sub (real-time agent messaging), BullMQ queues.
7. **Avalanche L1** — Own blockchain. SYNRG native gas token. Escrow, deal settlement, trust records on-chain.
8. **Contracts (Solidity/Foundry)** — `contracts/src/`: Escrow.sol (credit lock/release), DealSettlement.sol (on-chain deal finalization), AgentRegistry.sol (agent identity & trust scores).
9. **Crawler Service** — Public web content ingestion (sites, blogs, docs, case studies).

## Critical Design Rules
1. **AI agents suggest, never commit.** No binding language, no contract terms, no financial commitments in AI output.
2. **Public data only.** Never ingest private repos, gated content, or NDA material. Crawler must detect and skip auth walls.
3. **Human in the loop.** Every outbound communication (email, intro) requires explicit user approval before sending.
4. **Red-line enforcement.** Agent must never discuss topics on a company's red-line list. Enforced at prompt level + post-generation filter.
5. **Embedding isolation.** Each company's vectors are namespaced. Cross-company retrieval only for public-flagged content.

## Stack
- **Dashboard**: Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4
- **API Gateway**: Go (chi router, goroutines, streaming)
- **Database**: Supabase (PostgreSQL, Auth, Storage, pgvector for embeddings)
- **Vector DB**: pgvector (MVP) / Qdrant (V2 if scale demands)
- **Cache**: Redis (session cache, rate limits, match score cache)
- **Storage**: Cloudflare R2 (uploaded assets: pitch decks, PDFs)
- **AI**: Vercel AI SDK + Anthropic (conversations, summaries) + OpenAI (embeddings)
- **Crawler**: Go service (colly/rod) for public web content ingestion
- **Email**: SendGrid / Resend (intro email delivery)
- **Payments**: SYNRG token on Avalanche L1 (gas + utility) + Stripe (fiat on-ramp)
- **Blockchain**: Avalanche L1 (own chain) + Solidity (Foundry) + Ethers.js v6
- **Auth**: Supabase Auth (OAuth, email)
- **UI**: shadcn/ui + lucide-react
- **Job Queue**: BullMQ (AI conversations, matching, crawl jobs)

## Non-Negotiable Rules
1. TypeScript strict. Zero `any`, zero `as unknown`.
2. Zod validation on every input (client + server + AI tool).
3. Error handling: try/catch + toast. Never silent failures.
4. Mobile-first responsive.
5. Every component: loading + error + empty state.
6. RLS on every Supabase table. JWT validation on every protected endpoint.
7. No library outside STACK unless discussed first.
8. Conventional Commits: feat: fix: chore: docs: refactor:

## Directory Structure (Monorepo)
```
apps/
├── dashboard/             # Next.js — company dashboard, agent config, match review
│   ├── src/app/           # App Router pages
│   ├── src/features/      # Feature modules: onboarding, agents, matches, proposals
│   └── src/shared/        # components/ui, lib, types, hooks
├── api/                   # Go — API gateway
│   ├── cmd/server/        # Entry point
│   ├── internal/          # handlers, middleware, services
│   │   ├── agents/        # Agent CRUD, config management
│   │   ├── matching/      # Synergy scoring, match engine
│   │   ├── conversations/ # AI-to-AI conversation orchestration
│   │   ├── crawler/       # Web content ingestion
│   │   └── email/         # Intro email generation & sending
│   └── pkg/               # jwt, cache, storage, webhooks
├── workers/               # Background job processors (Node.js + BullMQ)
│   ├── matching-worker.ts  # Periodic match computation
│   ├── conversation-worker.ts # AI-to-AI conversation runner
│   ├── settlement-worker.ts   # On-chain tx submission
│   ├── crawler-worker.ts      # Scheduled web crawl jobs
│   └── email-worker.ts        # Email sending (post-approval)
└── contracts/             # Solidity — Avalanche L1 smart contracts
    ├── src/               # Escrow.sol, DealSettlement.sol, AgentRegistry.sol
    └── test/              # Foundry tests
infra/
├── docker-compose.yml     # Local dev (Postgres, Redis, Qdrant)
├── supabase/              # Migrations, seed, generated types
└── deploy/                # Vercel/Fly.io config
docs/
├── use-cases-workflows-policies.md    # Use cases, workflows, policies, guardrails
├── personas-user-journeys.md          # User personas, journeys, scenarios
├── agent-operational-rules.md         # Agent rules, guardrails, transactions, refunds
├── native-platform-architecture.md    # Native architecture decision (no external frameworks)
├── blockchain-avalanche-l1.md         # Avalanche L1, SYNRG tokenomics
├── master-architecture-prompt.md      # Self-contained build spec for the entire platform
└── multi-agent-frameworks-research.md # Research & evaluation of multi-agent frameworks
```

## Key Architecture Documents
- **docs/master-architecture-prompt.md** — Single self-contained prompt that defines the full platform build spec (start here).
- **docs/native-platform-architecture.md** — Decision rationale for building a native agent runtime (no CrewAI/LangGraph/AutoGen).
- **docs/blockchain-avalanche-l1.md** — Avalanche L1 chain design, SYNRG tokenomics, smart contract architecture.

## Working Protocol
- Session start: read `.claude/context/TODO.md`.
- After significant session: update TODO.md.
- Complex task: decompose into steps, one domain at a time.
- Before writing code: check rules in `.clauderules/`.
- New library: verify against `.clauderules/stack-rules.md` first.

## Context Files (on-demand)
- `.clauderules/stack-rules.md` → approved/banned libraries
- `.clauderules/coding-standards.md` → code patterns, templates
- `.clauderules/ai-engineering.md` → AI SDK, prompts, models
- `.clauderules/database-rules.md` → Supabase, RLS, migrations
- `.clauderules/security-rules.md` → JWT, tokens, rate limiting, GDPR
- `.clauderules/environment-management.md` → env vars, deploy options
- `.claude/context/PROJECT.md` → DB schema, API endpoints, feature status
- `.claude/context/TODO.md` → current tasks and priorities
- `docs/personas-user-journeys.md` → user personas, journeys, scenarios
- `docs/agent-operational-rules.md` → agent rules, guardrails, transactions, refunds
- `docs/native-platform-architecture.md` → native architecture decision
- `docs/blockchain-avalanche-l1.md` → Avalanche L1, SYNRG tokenomics
- `docs/master-architecture-prompt.md` → self-contained build spec

## Next.js Version Warning
Read `node_modules/next/dist/docs/` before writing any Next.js code.
This version has breaking changes from training data. Heed deprecation notices.
