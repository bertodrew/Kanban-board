# AI Engineering Rules — [Project Name]
# Layer 3: .clauderules/ — Loaded when working on AI features

## Principles
1. Vercel AI SDK for AI orchestration. Never direct fetches to providers.
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

## Anti-Patterns
- Never process AI in the request path (users should not wait for AI).
- Never use heavy models for simple tasks (use gpt-4o-mini, not opus).
- Never expose AI costs to end users (include in product pricing).
- Always fallback: if AI fails, the feature is still valid (just without enrichment).
- Never send more data to AI than necessary (trim, chunk, summarize first).
