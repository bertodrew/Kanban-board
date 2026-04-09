# CLAUDE.md
# Layer 2: Project Memory — Git-tracked, repo-wide
# Priority: 2/6 (stable project base)
# This file is the Source of Truth. Committed in Git.
# Keep under 200 lines for token efficiency.

## Project Identity
**Vibe-Kanban DevOps Hub** — Webapp locale (Next.js) che connette i repository GitHub dell'utente, estrae user stories dai file MD di progetto, le visualizza in una Kanban board, e automatizza lo sviluppo tramite Claude Code quando una story viene spostata nel funnel.
Team: Andrea (tech). MVP-first, shipping speed > perfection. Zero costs pre-revenue.

## Architecture
1. **Dashboard (Next.js 15)** — Kanban board, repo selection, story management, automation logs, terminal panel.
2. **API Routes (Next.js Route Handlers)** — GitHub OAuth, repo sync, story parsing, Claude Code triggers.
3. **Database (Supabase)** — Repos, stories, board state, automation logs, user settings.
4. **Auth (GitHub OAuth via Supabase)** — Login with GitHub, access to user repos.
5. **Automation Engine** — Claude Code CLI subprocess spawner, Anthropic API for story analysis.
6. **Integrations** — Vercel/Render/Netlify (deploy), Resend (notifications), Supabase (data).

## Critical Design Rule
Every board operation must be scoped to the authenticated user's GitHub repos. Stories are extracted from MD files in repos the user has granted access to. Claude Code automation requires explicit user action (drag to "In Progress").

## Stack
- **Framework**: Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4
- **UI**: shadcn/ui + lucide-react + @dnd-kit (drag and drop)
- **Database**: Supabase (PostgreSQL, Auth, RLS)
- **Auth**: Supabase Auth with GitHub OAuth provider
- **AI**: Anthropic API (claude-sonnet-4-20250514) for story analysis + Claude Code CLI for execution
- **GitHub**: Octokit (GitHub REST API)
- **Email**: Resend (notifications)
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
app/src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing / login
│   ├── dashboard/          # Main kanban dashboard
│   ├── settings/           # User settings, integrations
│   └── api/                # Route handlers
│       ├── auth/           # GitHub OAuth callback, Anthropic auth
│       ├── github/         # Repo sync, MD parsing, project state
│       ├── stories/        # CRUD stories
│       ├── automation/     # Claude Code triggers
│       ├── terminal/       # Terminal session management
│       └── deploy/         # Vercel/Render/Netlify triggers
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── kanban/             # Board, Column, Card, ArchiveList
│   ├── repos/              # RepoSelector
│   ├── projects/           # ProjectSwitcher
│   ├── automation/         # AutomationPanel
│   ├── terminal/           # MultiProjectTerminal
│   └── auth/               # AuthBar
├── lib/
│   ├── supabase/           # Client, server, middleware
│   ├── github.ts           # Octokit wrapper
│   ├── claude-code.ts      # Claude Code CLI integration
│   ├── story-parser.ts     # MD file -> user stories
│   ├── deploy.ts           # Vercel/Render/Netlify API wrappers
│   ├── resend.ts           # Email notifications
│   └── utils.ts            # cn() helper
├── stores/                 # Zustand stores (kanban-store)
├── types/                  # Shared types (index.ts)
└── hooks/                  # Custom hooks
```

## Kanban Funnel Stages
1. **Backlog** — Story parsed from MD, waiting to be picked up
2. **To Do** — Story prioritized, ready for development
3. **In Progress** — Claude Code activated, developing code
4. **In Review** — Code generated, waiting for human review
5. **Done** — Approved and merged

## Claude Code Integration
- When story moves to "In Progress": spawn `claude` CLI process with story context
- Pass: repo path, story description, acceptance criteria, project CLAUDE.md
- Capture stdout/stderr for real-time log display
- On completion: auto-move to "In Review"
- On failure: keep in "In Progress", show error log

## Multi-Project Support
- Each connected GitHub repo gets its own board
- ProjectSwitcher for fast switching between projects
- Terminal panel supports multiple project sessions simultaneously

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
