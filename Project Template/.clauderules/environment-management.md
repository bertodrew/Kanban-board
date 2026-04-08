# Environment Management — SynergyAI
# Layer 3: Loaded when working with env vars, config, or deploy

## Env Var Rules
- All env vars validated at build time with `@t3-oss/env-nextjs` + zod (dashboard).
- Go: validated at startup. Panic if missing critical vars.
- Server secrets: NEVER prefix with `NEXT_PUBLIC_`.
- Client vars: ALWAYS prefix with `NEXT_PUBLIC_`.
- Local dev: `.env.local` (git-ignored).
- Production: set in Vercel/Coolify Dashboard. Never in code.

## Required Variables — SaaS Dashboard (Next.js)
```bash
# Server-only
SUPABASE_SERVICE_ROLE_KEY=      # Supabase admin access
ANTHROPIC_API_KEY=              # AI provider
OPENAI_API_KEY=                 # AI provider (embeddings, etc.)
STRIPE_SECRET_KEY=              # Payments
STRIPE_WEBHOOK_SECRET=          # Stripe webhook validation
JWT_SECRET_KEY=                 # Signing session JWTs

# Client-accessible
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase public key
NEXT_PUBLIC_APP_URL=            # Dashboard base URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Stripe client key
```

## Required Variables — API Gateway (Go)
```bash
DATABASE_URL=                   # PostgreSQL connection string
REDIS_URL=                      # Redis connection string
JWT_SECRET_KEY=                 # Same key as dashboard for JWT signing
WEBHOOK_SIGNING_KEY=           # HMAC key for signing webhooks
```

## Required Variables — Workers (Node.js + BullMQ)
```bash
# Database & Cache
DATABASE_URL=                   # PostgreSQL connection string
REDIS_URL=                      # Redis for BullMQ queues + pub/sub

# AI Providers
ANTHROPIC_API_KEY=              # Claude for conversations
OPENAI_API_KEY=                 # Embeddings (text-embedding-3-small)

# Blockchain (Phase 2)
AVALANCHE_RPC_URL=              # Avalanche L1 RPC endpoint
PLATFORM_WALLET_PRIVATE_KEY=    # Settlement worker wallet key (HSM in prod)
ESCROW_CONTRACT_ADDRESS=        # Deployed Escrow.sol address
DEAL_SETTLEMENT_CONTRACT_ADDRESS= # Deployed DealSettlement.sol address
AGENT_REGISTRY_CONTRACT_ADDRESS=  # Deployed AgentRegistry.sol address

# Email
SENDGRID_API_KEY=               # Intro email delivery
SENDGRID_FROM_EMAIL=            # Platform sender address

# Platform Config
MATCHING_BATCH_CRON=            # Cron schedule (default: "0 2 * * *" — 2am daily)
CRAWLER_RATE_LIMIT=             # Max requests/sec per domain (default: 1)
```

## Required Variables — Smart Contracts (Foundry)
```bash
# Deployment
AVALANCHE_RPC_URL=              # L1 RPC endpoint
DEPLOYER_PRIVATE_KEY=           # Deploy wallet key (use hardware wallet in prod)
ETHERSCAN_API_KEY=              # For contract verification (optional)
```

## Env Validation Pattern (Dashboard)
```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
    OPENAI_API_KEY: z.string().startsWith('sk-'),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    JWT_SECRET_KEY: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
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

### Option A: Multi-Cloud (Recommended for MVP)
- Dashboard: Vercel (free tier, auto-deploy from GitHub)
- API Gateway (Go): Fly.io or Railway (free/cheap tier)
- Workers: Fly.io or Railway (Node.js workers alongside Go API)
- Frontend: Vercel or Cloudflare Pages
- Database: Supabase (free tier)
- Cache: Upstash Redis (free tier)
- Storage: Cloudflare R2 (generous free tier)
- Blockchain: 3 Avalanche validators ($100/month each VPS)
- Note: Phase 2 adds: Avalanche L1 validators + RPC node

### Option B: Self-Hosted (Cost-optimized)
- Everything: Oracle Cloud free tier + Coolify
- Docker Compose: all services in one VM (API, workers, Avalanche node containers)
- Avalanche validators: minimum 3 nodes required for consensus (separate VMs recommended)
- Pro: zero cost for non-blockchain services. Con: single point of failure, manual ops.

## Secrets Rotation
- If a key is leaked: rotate immediately in provider dashboard.
- JWT_SECRET_KEY rotation: invalidates all active sessions (plan migration).
- Supabase: regenerate anon key from Dashboard > Settings > API.
- Never put keys in commit messages, PR descriptions, or issue comments.
