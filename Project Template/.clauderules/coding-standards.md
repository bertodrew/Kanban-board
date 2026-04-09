# Coding Standards — [Project Name]
# Layer 3: .clauderules/ — Loaded when writing code across any component

## General
- Write production-ready code. No explanations of what the code does.
- Do not ask for confirmation between steps — proceed and show results.
- Do not create generic utils files — co-locate with the feature.
- Do not commit console.log or commented-out code.
- Do not introduce libraries without prior discussion.

## TypeScript (All code)
- strict: true — zero `any`, zero `as unknown`
- Zod on every input: forms, API bodies, URL params, webhook payloads
- Error handling on every async: try/catch + toast notification
- Mobile-first responsive layout
- Every component needs: loading state + error state + empty state
- Named exports for components, default exports for pages
- Use `@/` import alias (configured in tsconfig)
- Max 300 lines per file — split if exceeded
- Comments: only for "why", never for "what"

## File Organization
- One component per file
- Co-locate tests with source files when possible
- Feature-scoped modules: keep related components, hooks, types together
- Shared UI components in `components/ui/`

## Naming Conventions
- camelCase for variables and functions (TypeScript)
- PascalCase for components and types
- snake_case for database columns
- kebab-case for file names

## Session Protocol
- Session start: read `.claude/context/TODO.md`
- Session end: update `.claude/context/TODO.md`
- Complex task: decompose into sequential steps, one domain at a time
- Do not explain basic concepts
