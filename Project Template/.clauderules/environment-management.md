# Environment Management — [Project Name]
# Layer 3: Loaded when working with env vars, config, or deploy

## Env Var Rules
- All env vars validated at build time with `@t3-oss/env-nextjs` + zod.
- Server secrets: NEVER prefix with `NEXT_PUBLIC_`.
- Client vars: ALWAYS prefix with `NEXT_PUBLIC_`.
- Local dev: `.env.local` (git-ignored).
- Production: set in Vercel/Coolify Dashboard. Never in code.

## Required Variables — Next.js App
```bash
# Server-only
SUPABASE_SERVICE_ROLE_KEY=      # Supabase admin access
ANTHROPIC_API_KEY=              # AI provider
# [Add project-specific server vars here]

# Client-accessible
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase public key
NEXT_PUBLIC_APP_URL=            # App base URL
# [Add project-specific client vars here]
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
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: { /* process.env mappings */ },
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
- Pro: zero cost, zero ops. Con: serverless limits.

### Option B: Self-Hosted (Cost-optimized)
- Everything: Oracle Cloud free tier + Coolify
- Docker Compose: all services in one VM
- Pro: zero cost. Con: single point of failure, manual ops.

## Secrets Rotation
- If a key is leaked: rotate immediately in provider dashboard.
- Supabase: regenerate anon key from Dashboard > Settings > API.
- Never put keys in commit messages, PR descriptions, or issue comments.
