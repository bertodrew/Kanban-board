# AI Engineering Rules — Vibe-Kanban DevOps Hub
# Layer 3: .clauderules/ — Loaded when working on AI features

## Principles
1. Anthropic SDK for story analysis and orchestration. Never direct fetches to providers.
2. Claude Code CLI for code generation — spawned as subprocess, never in-process.
3. AI tools: max 7 per agent. Zod schema with description. Error handling required.
4. Temperature: 0–0.3 for analysis/structured output, 0.5–0.7 for narrative summaries.
5. Log EVERY AI call in automation_logs (tokens, model, cost, duration).
6. Always fallback: if AI fails, the story stays in current column with error log.

## Model Registry
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const models = {
  'claude-sonnet': 'claude-sonnet-4-20250514',  // Story analysis, acceptance criteria
  'claude-haiku': 'claude-haiku-4-5-20251001',  // Quick classification, tagging
} as const
```

## Story Analysis Pattern
```typescript
import { z } from 'zod'

const storyAnalysisSchema = z.object({
  title: z.string().describe('Concise story title'),
  description: z.string().describe('User story in standard format'),
  acceptance_criteria: z.array(z.string()),
  complexity: z.enum(['low', 'medium', 'high']),
  tags: z.array(z.string()),
})

const response = await anthropic.messages.create({
  model: models['claude-sonnet'],
  max_tokens: 1024,
  messages: [{ role: 'user', content: buildStoryPrompt(mdContent) }],
})
```

## Claude Code CLI Integration Pattern
```typescript
import { spawn } from 'child_process'

function spawnClaudeCode(options: {
  repoPath: string
  storyDescription: string
  acceptanceCriteria: string[]
  claudeMdPath: string
}) {
  const process = spawn('claude', [
    '--print',
    '--dangerously-skip-permissions',
    '-p', buildPrompt(options),
  ], {
    cwd: options.repoPath,
    env: { ...process.env, ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY },
  })

  // Capture stdout/stderr for real-time log display
  process.stdout.on('data', (data) => logToAutomation(data))
  process.stderr.on('data', (data) => logToAutomation(data))

  return process
}
```

## Prompt Pattern
```typescript
function buildStoryPrompt(mdContent: string): string {
  return [
    `# Role\nYou are an expert at extracting user stories from project documentation.`,
    `\n# Input\n${mdContent}`,
    `\n# Instructions`,
    `- Extract actionable user stories`,
    `- Each story: title, description (As a... I want... So that...), acceptance criteria`,
    `- Classify complexity: low/medium/high`,
    `- Respond ONLY in valid JSON matching the required schema`,
  ].join('\n')
}
```

## Anti-Patterns
- Never spawn Claude Code without explicit user action (drag to "In Progress").
- Never run multiple Claude Code processes for the same repo simultaneously.
- Never expose API keys in automation logs or client-side code.
- Always capture and display Claude Code output in real-time.
- Never use heavy models for simple tasks (use haiku for classification, sonnet for analysis).
- Always fallback: if AI fails, the story is still valid (just without enrichment).
- Never send more data to AI than necessary (trim, chunk, summarize first).
