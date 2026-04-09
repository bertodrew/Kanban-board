# Security Rules — Vibe-Kanban DevOps Hub
# Layer 3: .clauderules/ — Loaded when auth/security is relevant

## Auth Layers

### 1. GitHub OAuth via Supabase Auth
- Supabase Auth with GitHub as OAuth provider. No custom auth.
- On login: store GitHub access token for repo API calls.
- Middleware verifies session on all protected routes.
- Use getUser() (server-side, secure) over getSession() (client-side, manipulable).

### 2. GitHub API Access
- User's GitHub token stored securely (encrypted in Supabase).
- Token used server-side only for Octokit API calls.
- Never expose GitHub token to client-side code.
- Request minimum scopes: `repo` (read access to repos), `read:user`.

### 3. Anthropic API Access
- ANTHROPIC_API_KEY stored server-side only.
- Used for story analysis (API routes) and Claude Code CLI (subprocess).
- Never sent to client. Never logged.

## Input Validation
- Zod on EVERY input: forms, API bodies, URL params, webhook payloads.
- Max length on all text fields.
- Validate repo ownership before any GitHub API call.
- Validate story belongs to user's project before any mutation.

## Rate Limiting
- GitHub API calls: respect GitHub rate limits (5000 req/hour for authenticated users).
- Anthropic API: 10 req/min per user for story analysis.
- Claude Code spawns: 1 concurrent process per user.
- Implement in-memory initially, then Redis-backed.

## Claude Code Security
- Claude Code runs as subprocess with user's API key.
- Subprocess runs in the target repo directory (sandboxed to that repo).
- Never pass untrusted user input directly as CLI arguments (sanitize first).
- Kill process on timeout (configurable, default 5 minutes).
- Capture all output for audit log.

## GDPR & Privacy
- User data: only GitHub public profile + repo metadata.
- Auto-delete: user can disconnect repos at any time.
- AI calls: not used for model training (Anthropic opt-out).
- On account deletion: cascade delete all projects, stories, logs.

## Environment
- Use @t3-oss/env-nextjs for env var validation at build time.
- Server secrets never in NEXT_PUBLIC_*.
- .claude/settings.local.json in .gitignore.
- .env.local in .gitignore.

## Security Headers (Next.js)
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]
```
