# AI Engineering Rules — SynergyAI
# Layer 3: .clauderules/ — Loaded when working on AI features

## Principles
1. Vercel AI SDK for AI orchestration in the dashboard. Never direct fetches to providers.
2. Heavy AI processing goes into background jobs, never in the request path.
3. AI tools: max 7 per agent. Zod schema with description. Error handling required.
4. Temperature: 0–0.3 for analysis/structured output, 0.5–0.7 for narrative summaries.
5. Log EVERY AI call in usage_logs (tokens, model, cost, duration).
6. Always fallback: if AI fails, the core feature still works (just without AI enrichment).

## Model Registry
```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'

export const models = {
  'claude-sonnet': anthropic('claude-sonnet-4-20250514'),
  'gpt-4o-mini': openai('gpt-4o-mini'),        // Cost-effective tasks
} as const

export const embeddingModels = {
  'text-embedding-3-small': openai.embedding('text-embedding-3-small'),
} as const
```

## Structured Output Pattern (Vercel AI SDK)
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const outputSchema = z.object({
  summary: z.string().describe('2-3 sentence summary'),
  key_points: z.array(z.string()),
  score: z.number().min(1).max(10),
})

const { object } = await generateObject({
  model: models['claude-sonnet'],
  schema: outputSchema,
  prompt: buildPrompt(input),
})
```

## Background Job Pattern
```typescript
// Queue AI work — never block the request
async function queueAIProcessing(sessionId: string) {
  await jobQueue.add('ai-process', { sessionId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}
```

## Prompt Pattern
```typescript
function buildPrompt(context: { input: string; jobContext: string }): string {
  return [
    `# Role\nYou are an expert analyzing ${context.jobContext}.`,
    `\n# Input\n${context.input}`,
    `\n# Instructions`,
    `- Analyze objectively`,
    `- Respond ONLY in valid JSON matching the required schema`,
  ].join('\n')
}
```

## Agent-to-Agent Conversation Rules
1. Each agent's system prompt is constructed from: company profile + partnership preferences + red lines.
2. Red-line topics are injected as hard constraints in the system prompt AND validated post-generation.
3. Conversations are capped at 6 turns max, with token budget per turn.
4. Output: structured deal summary (Zod-validated) with: hypothesis, benefits_a, benefits_b, risks, open_questions, suggested_next_steps.
5. All conversation turns are logged for audit (company_a_id, company_b_id, turn_number, content, tokens_used).
6. Agent must never use binding language ("we agree", "we commit", "deal confirmed").

## Matching Engine Rules
1. Synergy score computed on: ICP overlap, product complementarity, geography, partnership type alignment.
2. Score is a weighted composite (configurable weights per dimension).
3. Threshold for surfacing match: configurable per plan tier.
4. Threshold for triggering AI conversation: higher than surfacing threshold.
5. Re-matching triggered on: new agent activation, profile update, scheduled batch (daily).

## Knowledge Ingestion Rules
1. Crawler respects robots.txt. Max 1 req/sec per domain.
2. Content chunking: 512 tokens per chunk with 64-token overlap.
3. Embeddings: text-embedding-3-small (cost-effective for MVP).
4. Each chunk tagged with: company_id, source_url, crawl_date, content_type, is_public.
5. Re-crawl diff: only re-embed changed/new content.

## Blockchain Settlement Rules (Avalanche L1)
1. All deal settlements recorded on-chain via DealSettlement.sol.
2. SYNRG token is the native gas + utility token. Companies see "credits", never crypto.
3. Escrow pattern: lock SYNRG when conversation starts, release/return on outcome.
4. Platform fee (2-5%) distributed on-chain: treasury + burn + validators.
5. Custodial wallets managed by platform. Companies never handle private keys.
6. Ethers.js v6 for all chain interactions. Never raw RPC calls.
7. Settlement worker (BullMQ) handles all on-chain txs — never in request path.
8. Trust scores partially derived from on-chain history (immutable).
9. Smart contracts use upgradeable proxy pattern (OpenZeppelin).
10. Treasury wallet protected by multi-sig. HSM for keys in production.

## Native Architecture Rules
1. No external agent frameworks (no CrewAI, no Strands, no LangGraph, no NATS).
2. Agent schemas: Zod validation + PostgreSQL JSONB + pgvector embeddings.
3. Discovery: PostgreSQL queries (JSONB filters + pgvector similarity). No separate service.
4. Messaging: Redis pub/sub (real-time) + BullMQ (persistent). No external message broker.
5. Agent runtime: Vercel AI SDK + custom orchestrator. No external agent SDK.
6. A2A protocol: custom turn-based protocol, Zod-validated structured messages.
7. All architecture patterns documented in docs/native-platform-architecture.md.

## Anti-Patterns
- Never process AI in the request path (users should not wait for AI).
- Never use heavy models for simple tasks (use gpt-4o-mini, not opus).
- Never expose AI costs to end users (include in product pricing).
- Always fallback: if AI fails, the feature is still valid (just without enrichment).
- Never send more data to AI than necessary (trim, chunk, summarize first).
- Never let an agent access another company's semi-private embeddings.
- Never generate intro emails without explicit user approval.
- Never use external agent frameworks (CrewAI, Strands, LangGraph, NATS, AGNTCY).
- Never send settlement transactions in the API request path (use BullMQ worker).
- Never expose blockchain/crypto terminology to end users (use "credits").
