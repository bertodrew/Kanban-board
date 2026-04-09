# Stack Rules — [Project Name]
# Layer 3: .clauderules/ — Topic-specific rules
# Loaded when the context is relevant.

## Approved Stack
| Package                 | Version  | Notes                   |
|-------------------------|----------|-------------------------|
| Node.js                 | 22.x LTS |                         |
| Next.js                 | 15.x     | App Router only         |
| React                   | 19.x     |                         |
| TypeScript              | 5.x      | strict: true            |
| Tailwind CSS            | 4.x      |                         |
| @supabase/supabase-js   | 2.x      |                         |
| @supabase/ssr           | latest   | Server-side auth        |
| zod                     | 3.x      | Validation              |
| zustand                 | 5.x      | Client state            |
| @tanstack/react-query   | 5.x      | Server state            |
| lucide-react            | latest   | Icons                   |
| sonner                  | latest   | Toast notifications     |

## Approved Libraries (Additional)
- UI: shadcn/ui, lucide-react, sonner (toast), framer-motion (if needed)
- AI: @ai-sdk/anthropic, @ai-sdk/openai
- Supabase: @supabase/ssr
- Data: date-fns, nanoid
- Email: resend
- Env: @t3-oss/env-nextjs

## BANNED Libraries — do not suggest, do not install
| Banned                 | Reason              | Use instead           |
|------------------------|---------------------|-----------------------|
| Material UI, Chakra    | Heavy, not custom   | shadcn/ui             |
| Redux, MobX, Jotai     | Overkill            | zustand / react-query |
| Axios                  | Unnecessary         | native fetch          |
| Moment.js              | Deprecated          | date-fns              |
| Lodash                 | ES2024 is enough    | native methods        |
| styled-components      | Not Tailwind        | Tailwind              |
| Prisma                 | Supabase is enough  | Supabase client       |
| Firebase               | Google lock-in      | Supabase              |
| LangChain              | Over-engineered     | Vercel AI SDK         |

## Code Rules
- Imports: use `@/` alias in Next.js/React (configured in tsconfig)
- Exports: named exports for components, default exports for pages
- Files: max 300 lines per file. If exceeded, split.
- Naming: camelCase vars (TS), PascalCase components, snake_case DB columns
- Comments: only for "why", never for "what"
