# CLAUDE.md
# Layer 2: Project Memory — Git-tracked, repo-wide
# Priority: 2/6 (stable project base)
# This file is the Source of Truth. Committed in Git.
# Keep under 200 lines for token efficiency.

## Project Identity
**[Project Name]** — [One-line description of what the product does].
Team: Andrea (tech). MVP-first, shipping speed > perfection. Zero costs pre-revenue.

## Architecture
1. **Dashboard (Next.js 15)** — [Main UI description].
2. **API Routes (Next.js Route Handlers)** — [API description].
3. **Database (Supabase)** — [Data description].
4. **Auth ([Provider] via Supabase)** — [Auth flow description].
5. **[Additional components as needed]**

## Critical Design Rule
[Single most important architectural constraint for this project.]

## Stack
- **Framework**: Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4
- **UI**: shadcn/ui + lucide-react
- **Database**: Supabase (PostgreSQL, Auth, RLS)
- **Auth**: Supabase Auth with [provider] OAuth
- **AI**: [AI stack if applicable]
- **State**: zustand (client) + @tanstack/react-query (server)
- **Validation**: zod everywhere
- **Deploy targets**: Vercel / Render / Netlify (configurable)

## Non-Negotiable Rules
1. TypeScript strict. Zero `any`, zero `as unknown`.
2. Zod validation on every input (client + server + AI tool).
3. Error handling: try/catch + toast. Never silent failures.
4. Mobile-first responsive.
5. Every component: loading + error + empty state.
6. RLS on every Supabase table.
7. No library outside STACK unless discussed first.
8. Conventional Commits: feat: fix: chore: docs: refactor:

## Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing / login
│   ├── dashboard/          # Main app view
│   └── api/                # Route handlers
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── [feature]/          # Feature-scoped components
├── lib/
│   ├── supabase/           # Client, server, middleware
│   └── utils.ts            # cn() helper
├── stores/                 # Zustand stores
├── types/                  # Shared types
└── hooks/                  # Custom hooks
```

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
- `.clauderules/security-rules.md` → auth, tokens, rate limiting
- `.clauderules/environment-management.md` → env vars, deploy options
- `.claude/context/TODO.md` → current tasks and priorities

## Next.js Version Warning
Read `node_modules/next/dist/docs/` before writing any Next.js code.
This version has breaking changes from training data. Heed deprecation notices.
