# CLAUDE.md
# Layer 2: Project Memory — Git-tracked, repo-wide
# Priority: 2/6 (stable project base)

## Project Identity
**Vibe-Kanban DevOps Hub** — Webapp locale (Next.js) che connette i repository GitHub dell'utente, estrae user stories dai file MD di progetto, le visualizza in una Kanban board, e automatizza lo sviluppo tramite Claude Code quando una story viene spostata nel funnel.
Team: Andrea (tech). MVP-first, shipping speed > perfection. Zero costs pre-revenue.

## Architecture
1. **Dashboard (Next.js 15)** — Kanban board, repo selection, story management, automation logs.
2. **API Routes (Next.js Route Handlers)** — GitHub OAuth, repo sync, story parsing, Claude Code triggers.
3. **Database (Supabase)** — Repos, stories, board state, automation logs, user settings.
4. **Auth (GitHub OAuth via Supabase)** — Login with GitHub, access to user repos.
5. **Automation Engine** — Claude Code CLI subprocess spawner, Anthropic API for orchestration.
6. **Integrations** — Vercel/Render/Netlify (deploy), Resend (notifications), Supabase (data).

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
1. TypeScript strict. Zero `any`.
2. Zod validation on every input.
3. Error handling: try/catch + toast. Never silent failures.
4. Mobile-first responsive.
5. Every component: loading + error + empty state.
6. RLS on every Supabase table.

## Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing / login
│   ├── dashboard/          # Main kanban dashboard
│   ├── settings/           # User settings, integrations
│   └── api/                # Route handlers
│       ├── auth/           # GitHub OAuth callback
│       ├── github/         # Repo sync, MD parsing
│       ├── stories/        # CRUD stories
│       ├── automation/     # Claude Code triggers
│       └── deploy/         # Vercel/Render/Netlify triggers
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── kanban/             # Board, Column, Card, DragOverlay
│   ├── repos/              # RepoSelector, RepoList
│   └── automation/         # AutomationLog, StatusBadge
├── lib/
│   ├── supabase/           # Client, server, middleware
│   ├── github.ts           # Octokit wrapper
│   ├── claude-code.ts      # Claude Code CLI integration
│   ├── story-parser.ts     # MD file -> user stories
│   ├── deploy.ts           # Vercel/Render/Netlify API wrappers
│   └── resend.ts           # Email notifications
├── stores/                 # Zustand stores
├── types/                  # Shared types
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

## Working Protocol
- Session start: check current task list
- Complex task: decompose, one domain at a time
- Before writing code: check .clauderules/
