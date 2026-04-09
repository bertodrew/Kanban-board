# CLAUDE.md — app/ (Next.js 15 Application)
# Nested context for the Next.js app directory.

## Quick Reference
- **Entry**: `src/app/layout.tsx` (root layout), `src/app/page.tsx` (landing)
- **Dashboard**: `src/app/dashboard/page.tsx` (main kanban view)
- **API Routes**: `src/app/api/` (auth, github, stories, automation, terminal, deploy)
- **State**: zustand store at `src/stores/kanban-store.ts`
- **Types**: `src/types/index.ts`

## Key Patterns
- App Router: all pages in `src/app/`, API routes in `src/app/api/`
- Server Components by default, `'use client'` only when needed (interactivity, hooks)
- Route Handlers: `export async function GET/POST/PUT/DELETE(request: Request)`
- Supabase client: `src/lib/supabase/client.ts` (browser), server client created per-request

## Component Hierarchy
```
layout.tsx
└── dashboard/page.tsx
    ├── AuthBar
    ├── ProjectSwitcher
    ├── KanbanBoard
    │   ├── KanbanColumn (per stage)
    │   │   └── KanbanCard (per story)
    │   └── ArchiveList
    ├── AutomationPanel
    └── MultiProjectTerminal
```

## Next.js Version Warning
@AGENTS.md
