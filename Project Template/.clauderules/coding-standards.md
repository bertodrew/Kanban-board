# Coding Standards — SynergyAI
# Layer 3: .clauderules/ — Loaded when writing code across any component

## General
- Write production-ready code. No explanations of what the code does.
- Do not ask for confirmation between steps — proceed and show results.
- Do not create generic utils files — co-locate with the feature.
- Do not commit console.log or commented-out code.
- Do not introduce libraries without prior discussion.

## TypeScript (Dashboard + Frontend)
- strict: true — zero `any`, zero `as unknown`
- Zod on every input: forms, API bodies, URL params, webhook payloads
- Error handling on every async: try/catch + toast notification
- Mobile-first responsive layout
- Every component needs: loading state + error state + empty state
- Named exports for components, default exports for pages
- Use `@/` import alias (configured in tsconfig)
- Max 300 lines per file — split if exceeded

## Go (API Gateway)
- Idiomatic Go: gofmt, errcheck, golint
- Explicit error handling — no ignored errors
- Struct validation on all inputs
- Structured logging with zap
- No `panic` in request handlers — return proper HTTP errors

## Solidity (Smart Contracts)
- Solidity 0.8.20+ (built-in overflow checks)
- All external functions: ReentrancyGuard + AccessControl
- Events emitted for every state change
- No hardcoded addresses — use constructor or admin setter
- NatSpec comments on all public functions
- All functions have explicit visibility (public/external/internal/private)
- Use OpenZeppelin libraries for standard patterns
- UUPS proxy pattern for upgradeability
- Storage gaps in base contracts for future-proofing
- Tests in Foundry (forge test) — 100% coverage on critical paths

## Workers (BullMQ)
- Each worker in its own file (matching-worker.ts, conversation-worker.ts, etc.)
- All jobs have: attempts (3), exponential backoff, dead-letter queue
- Idempotent processing — same job can run twice safely
- Log every job: start, completion, failure with job ID and duration
- Never block on external calls — use timeouts (30s default)
- Settlement worker: extra validation before on-chain tx (balance check, nonce management)

## Session Protocol
- Session start: read `.claude/context/TODO.md`
- Session end: update `.claude/context/TODO.md`
- Complex task: decompose into sequential steps, one domain at a time
- Do not explain basic concepts
