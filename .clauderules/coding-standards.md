# Coding Standards — Vibe-Kanban DevOps Hub

## General
- Write production-ready code. No explanations of what the code does.
- Do not ask for confirmation between steps — proceed and show results.
- Do not create generic utils files — co-locate with the feature.
- Do not commit console.log or commented-out code.

## TypeScript
- strict: true — zero `any`, zero `as unknown`
- Zod on every input: forms, API bodies, URL params
- Error handling on every async: try/catch + toast notification
- Mobile-first responsive layout
- Every component needs: loading state + error state + empty state
- Named exports for components, default exports for pages
- Use `@/` import alias
- Max 300 lines per file — split if exceeded

## Session Protocol
- Session start: check task list
- Complex task: decompose into sequential steps
