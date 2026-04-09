# Security Rules — [Project Name]
# Layer 3: .clauderules/ — Loaded when auth/security is relevant

## Auth Layers

### 1. SaaS Dashboard (Supabase Auth)
- Supabase Auth for everything. No custom auth.
- OAuth: [provider] as primary provider + email/password.
- Middleware verifies session on protected routes.
- Use getUser() (server-side, secure) over getSession() (client-side, manipulable).

### 2. API Access (if external API)
- Secret API Token per customer, hashed in DB (bcrypt).
- JWT for stateless sessions, signed with server's secret key.
- Validate signature, expiry, session state on every request.

## Input Validation
- Zod on EVERY input: forms, API bodies, URL params, webhook payloads.
- Max length on all text fields.

## File Upload Security (if applicable)
- Only accept files if JWT is valid and not expired.
- File size limit: configurable per feature.
- MIME type validation: whitelist only expected types.
- Save with UUID name (not predictable).
- Never serve files directly from a public URL — use signed URLs.

## Rate Limiting
- Public APIs: 30 req/min per IP.
- Authenticated APIs: 100 req/min per user.
- AI endpoints: 10 req/min per user.
- Implement in-memory initially, then Redis-backed.

## GDPR & Privacy
- User data: configurable retention policy.
- Auto-delete: cron job that removes expired data.
- AI calls: not used for model training (opt-out from providers).

## Environment
- Use @t3-oss/env-nextjs for env var validation at build time.
- Server secrets never in NEXT_PUBLIC_*.
- .claude/settings.local.json in .gitignore.
- .env.local in .gitignore.

## Security Headers
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]
```
