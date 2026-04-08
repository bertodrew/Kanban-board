# Stack Rules — Vibe-Kanban DevOps Hub

## Approved Stack
| Package                 | Version  | Notes                   |
|-------------------------|----------|-------------------------|
| Next.js                 | 15.x     | App Router only         |
| React                   | 19.x     |                         |
| TypeScript              | 5.x      | strict: true            |
| Tailwind CSS            | 4.x      |                         |
| @supabase/supabase-js   | 2.x      |                         |
| @supabase/ssr           | latest   | Server-side auth        |
| @dnd-kit/core           | latest   | Drag and drop           |
| @dnd-kit/sortable       | latest   | Sortable lists          |
| octokit                 | latest   | GitHub API              |
| zod                     | 3.x      | Validation              |
| zustand                 | 5.x      | Client state            |
| @tanstack/react-query   | 5.x      | Server state            |
| resend                  | latest   | Email                   |
| lucide-react            | latest   | Icons                   |
| sonner                  | latest   | Toast notifications     |

## BANNED Libraries
| Banned                 | Reason              | Use instead           |
|------------------------|---------------------|-----------------------|
| Material UI, Chakra    | Heavy               | shadcn/ui             |
| Redux, MobX            | Overkill            | zustand               |
| Axios                  | Unnecessary         | native fetch          |
| Prisma                 | Supabase is enough  | Supabase client       |
| Firebase               | Google lock-in      | Supabase              |
