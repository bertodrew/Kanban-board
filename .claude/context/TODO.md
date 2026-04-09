# TODO — Vibe-Kanban DevOps Hub
# Layer 1: Session tasks — Not committed, local only
# Updated each session. Source of truth for current work.

## Current Phase: MVP Foundation

## In Progress
- [ ] Supabase schema: users, repos, projects, stories, automation_logs, user_settings
- [ ] GitHub OAuth flow (Supabase Auth + GitHub provider)
- [ ] Env validation with @t3-oss/env-nextjs

## Next Up — MVP Core
- [ ] GitHub repo sync (Octokit: list user repos, store in Supabase)
- [ ] MD file parser (extract user stories from project docs)
- [ ] Kanban board persistence (Supabase: save board state, story positions)
- [ ] Story CRUD API routes (create, read, update stage/position, delete)
- [ ] Drag-and-drop persistence (save new stage + position on drop)
- [ ] Project switcher persistence (save active project per user)

## Next Up — Automation Engine
- [ ] Claude Code CLI integration (spawn subprocess on "In Progress")
- [ ] Real-time log streaming (stdout/stderr -> automation panel)
- [ ] Story analysis with Anthropic API (extract acceptance criteria from MD)
- [ ] Auto-move story to "In Review" on Claude Code success
- [ ] Error handling: keep story in "In Progress" on failure, show error log

## Next Up — Polish & Deploy
- [ ] Resend email notifications (story completed, automation failed)
- [ ] Deploy target integration (Vercel/Render/Netlify API)
- [ ] User settings page (deploy target, notification prefs)
- [ ] Security headers in next.config.ts
- [ ] Rate limiting on API routes
- [ ] Mobile responsive refinement

## Done
- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind CSS 4)
- [x] shadcn/ui setup + base components
- [x] Kanban board UI (drag-and-drop with @dnd-kit)
- [x] Project switcher component
- [x] Multi-project terminal panel
- [x] Automation panel UI
- [x] Auth bar component
- [x] Repo selector component
- [x] Archive list component
- [x] Initial CLAUDE.md + .clauderules/
- [x] Git repo setup + push to GitHub
