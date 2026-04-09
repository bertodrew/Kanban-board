# Environment Management — Vibe-Kanban DevOps Hub
# Layer 3: Loaded when working with env vars, config, or deploy

## Env Var Rules
- All env vars validated at build time with `@t3-oss/env-nextjs` + zod.
- Server secrets: NEVER prefix with `NEXT_PUBLIC_`.
- Client vars: ALWAYS prefix with `NEXT_PUBLIC_`.
- Local dev: `.env.local` (git-ignored).
- Production: set in Vercel/Render/Netlify Dashboard. Never in code.

## Required Variables — Next.js App
```bash
# Server-only
SUPABASE_SERVICE_ROLE_KEY=      # Supabase admin access
ANTHROPIC_API_KEY=              # AI provider (story analysis + Claude Code)
GITHUB_CLIENT_ID=               # GitHub OAuth app client ID
GITHUB_CLIENT_SECRET=           # GitHub OAuth app client secret
RESEND_API_KEY=                 # Email notifications

# Client-accessible
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase public key
NEXT_PUBLIC_APP_URL=            # Dashboard base URL (e.g., http://localhost:3000)
```

## Env Validation Pattern
```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().startsWith('re_'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
```

## Files to ALWAYS .gitignore
```gitignore
.env
.env.local
.env.*.local
.claude/settings.local.json
```

## Deploy Architecture Options

### Option A: Vercel (Recommended for MVP)
- Full-stack: Vercel (free tier, auto-deploy from GitHub)
- Database: Supabase (free tier)
- Edge Functions: Vercel serverless
- Pro: zero cost, zero ops. Con: serverless limits on Claude Code subprocess.

### Option B: Render / Railway
- Full-stack: Render or Railway (free/cheap tier)
- Database: Supabase (free tier)
- Pro: persistent processes (better for Claude Code subprocesses). Con: cold starts.

### Option C: Self-Hosted
- Everything: Oracle Cloud free tier + Coolify
- Docker Compose: Next.js + Supabase
- Pro: zero cost, full control. Con: manual ops, single point of failure.

## Claude Code Subprocess Considerations
- Claude Code CLI requires a persistent process — serverless functions may timeout.
- For production: consider Render/Railway background workers or a separate process server.
- For MVP/local: direct subprocess spawn from API route is fine.
- Timeout: configurable per deployment target (default 5 minutes).

## Secrets Rotation
- If a key is leaked: rotate immediately in provider dashboard.
- GitHub OAuth: regenerate client secret in GitHub Developer Settings.
- Supabase: regenerate anon key from Dashboard > Settings > API.
- Never put keys in commit messages, PR descriptions, or issue comments.
