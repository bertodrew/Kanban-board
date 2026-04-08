import { z } from "zod"

// --- Stages ---
export const StageSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "archived",
])
export type Stage = z.infer<typeof StageSchema>

// Stages visible on the kanban board (archived is hidden)
export const BOARD_STAGES: Stage[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
]

// Auto-progression: stage → next stage
export const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  in_progress: "in_review",
  in_review: "done",
}

// Days in "done" before auto-archiving
export const ARCHIVE_AFTER_DAYS = 15

export const STAGE_LABELS: Record<Stage, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  archived: "Archived",
}

export const STAGE_COLORS: Record<Stage, string> = {
  backlog: "bg-gray-100 dark:bg-gray-800",
  todo: "bg-blue-50 dark:bg-blue-950",
  in_progress: "bg-amber-50 dark:bg-amber-950",
  in_review: "bg-purple-50 dark:bg-purple-950",
  done: "bg-green-50 dark:bg-green-950",
  archived: "bg-slate-100 dark:bg-slate-900",
}

// --- Project (first-class entity) ---
export const PROJECT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
] as const

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().default(PROJECT_COLORS[0]),
  repoIds: z.array(z.number()),
  status: z.enum(["open", "closed"]).default("open"),
  lastSyncAt: z.string().optional(),
  createdAt: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

// --- Story ---
export const StorySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  stage: StageSchema,
  projectId: z.string(),
  repoFullName: z.string(),
  repoId: z.number(),
  sourceFile: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  automationLogId: z.string().optional(),
  doneAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Story = z.infer<typeof StorySchema>

// --- Project State File (.vibe-kanban.json in repo) ---
export const ProjectStateFileSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  stories: z.array(StorySchema),
  lastSyncAt: z.string(),
  lastCommitSha: z.string().optional(),
})
export type ProjectStateFile = z.infer<typeof ProjectStateFileSchema>

// --- Repo ---
export const RepoSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  name: z.string(),
  owner: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  defaultBranch: z.string(),
  localPath: z.string().optional(),
})
export type Repo = z.infer<typeof RepoSchema>

// --- Automation Log ---
export const AutomationLogSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  projectId: z.string(),
  status: z.enum(["running", "completed", "failed", "cancelled"]),
  output: z.array(z.string()),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
})
export type AutomationLog = z.infer<typeof AutomationLogSchema>

// --- Auth ---
export const GitHubUserSchema = z.object({
  login: z.string(),
  avatarUrl: z.string(),
  name: z.string().nullable(),
})
export type GitHubUser = z.infer<typeof GitHubUserSchema>

export const AuthStateSchema = z.object({
  githubToken: z.string().nullable(),
  githubUser: GitHubUserSchema.nullable(),
  anthropicApiKey: z.string().nullable(),
  anthropicKeyValid: z.boolean(),
})
export type AuthState = z.infer<typeof AuthStateSchema>
