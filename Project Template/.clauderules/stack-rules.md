# Stack Rules — SynergyAI
# Layer 3: .clauderules/ — Topic-specific rules
# Loaded when the context is relevant.

## Stack per Component

### SaaS Dashboard (Next.js)
| Package                 | Version  | Notes                   |
|-------------------------|----------|-------------------------|
| Node.js                 | 22.x LTS |                         |
| Next.js                 | 15.x     | App Router only         |
| React                   | 19.x     |                         |
| TypeScript              | 5.x      | strict: true            |
| Tailwind CSS            | 4.x      |                         |
| @supabase/supabase-js   | 2.x      |                         |
| ai (Vercel AI SDK)      | 4.x      | For AI features         |
| @tanstack/react-query   | 5.x      | Server state            |
| zustand                 | 5.x      | Client state (UI only)  |
| zod                     | 3.x      | Validation everywhere   |
| react-hook-form         | 7.x      |                         |
| stripe                  | latest   | Payments SDK            |
| @stripe/stripe-js       | latest   | Client-side Stripe      |

### Frontend App (React — if separate from dashboard)
| Package                 | Version  | Notes                   |
|-------------------------|----------|-------------------------|
| React                   | 19.x     | Standalone (no Next.js) |
| TypeScript              | 5.x      | strict: true            |
| Tailwind CSS            | 4.x      |                         |
| zod                     | 3.x      |                         |

### API Gateway (Go)
| Package                 | Notes                         |
|-------------------------|-------------------------------|
| Go                      | 1.22+                         |
| chi                     | HTTP router                   |
| golang-jwt/jwt          | JWT generation & validation   |
| go-redis/redis          | Redis client                  |
| pgx                     | PostgreSQL driver             |
| zap                     | Structured logging            |

### Workers (Node.js + BullMQ)
| Package                 | Version  | Notes                           |
|-------------------------|----------|---------------------------------|
| Node.js                 | 22.x LTS |                                 |
| TypeScript              | 5.x      | strict: true                    |
| bullmq                  | 5.x      | Job queues (matching, conversations, settlement) |
| ioredis                 | 5.x      | Redis client for BullMQ         |
| ai (Vercel AI SDK)      | 4.x      | AI orchestration in conversation worker |
| zod                     | 3.x      | Schema validation               |
| ethers                  | 6.x      | Blockchain interactions (Phase 2) |

### Smart Contracts (Solidity)
| Package                 | Version  | Notes                           |
|-------------------------|----------|---------------------------------|
| Solidity                | 0.8.20+  | Smart contract language          |
| Foundry (forge)         | latest   | Build, test, deploy toolchain    |
| OpenZeppelin Contracts  | 5.x      | Security primitives (ReentrancyGuard, AccessControl, UUPS) |
| OpenZeppelin Upgradeable| 5.x      | Upgradeable contract variants    |

## Approved Libraries (Dashboard)
- UI: shadcn/ui, lucide-react, sonner (toast), framer-motion (if needed)
- AI: @ai-sdk/anthropic, @ai-sdk/openai, @fal-ai/client
- Data: date-fns, nanoid
- Email: resend
- URL state: nuqs
- Env: @t3-oss/env-nextjs
- Blockchain: ethers (v6), @openzeppelin/contracts
- Workers: bullmq, ioredis

## BANNED Libraries — do not suggest, do not install
| Banned                 | Reason              | Use instead           |
|------------------------|---------------------|-----------------------|
| Material UI, Chakra    | Heavy, not custom   | shadcn/ui             |
| Redux, MobX, Jotai     | Overkill            | zustand / react-query |
| Axios                  | Unnecessary         | native fetch / resty (Go) |
| Moment.js              | Deprecated          | date-fns              |
| Lodash                 | ES2024 is enough    | native methods        |
| styled-components      | Not Tailwind        | Tailwind              |
| Prisma                 | Supabase is enough  | Supabase client       |
| Firebase               | Google lock-in      | Supabase              |
| LangChain              | Over-engineered     | Vercel AI SDK         |
| web3.js                | Deprecated patterns | ethers v6             |
| hardhat                | Slower than Foundry | Foundry (forge)       |
| CrewAI                 | Dead as OSS         | Vercel AI SDK + custom orchestrator |
| LangGraph              | Orchestration only  | Vercel AI SDK + custom orchestrator |
| NATS                   | Unnecessary external dep | Redis pub/sub + BullMQ |

## Code Rules
- Imports: use `@/` alias in Next.js/React (configured in tsconfig)
- Exports: named exports for components, default exports for pages
- Files: max 300 lines per file. If exceeded, split.
- Naming: camelCase vars (TS/Go), PascalCase components, snake_case DB columns
- Comments: only for "why", never for "what"
- Go: follow idiomatic Go (gofmt, errcheck, golint)
