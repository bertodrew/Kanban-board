"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Story,
  Repo,
  Stage,
  AutomationLog,
  Project,
  GitHubUser,
} from "@/types"
import { PROJECT_COLORS, ARCHIVE_AFTER_DAYS } from "@/types"

interface KanbanState {
  // Auth
  githubToken: string | null
  githubUser: GitHubUser | null
  anthropicApiKey: string | null
  anthropicKeyValid: boolean

  // Data
  projects: Project[]
  activeProjectId: string | null
  stories: Story[]
  repos: Repo[]
  automationLogs: Map<string, AutomationLog>

  // Auth actions
  setGithubAuth: (token: string, user: GitHubUser) => void
  clearGithubAuth: () => void
  setAnthropicKey: (key: string | null) => void
  setAnthropicKeyValid: (valid: boolean) => void

  // Project actions
  addProject: (name: string, repoIds?: number[]) => string
  updateProject: (id: string, updates: Partial<Omit<Project, "id">>) => void
  closeProject: (id: string) => void
  reopenProject: (id: string) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  addRepoToProject: (projectId: string, repoId: number) => void
  removeRepoFromProject: (projectId: string, repoId: number) => void
  openProjects: () => Project[]

  // Repo actions
  setRepos: (repos: Repo[]) => void

  // Story actions
  addStories: (stories: Story[]) => void
  moveStory: (storyId: string, newStage: Stage) => void
  updateStory: (storyId: string, updates: Partial<Story>) => void
  removeStoriesForRepo: (repoId: number) => void
  removeStoriesForProject: (projectId: string) => void
  archiveOldDone: () => number

  // Automation
  addAutomationLog: (log: AutomationLog) => void
  updateAutomationLog: (logId: string, updates: Partial<AutomationLog>) => void

  // Computed helpers
  activeProject: () => Project | null
  storiesForActiveProject: () => Story[]
  archivedStoriesForActiveProject: () => Story[]
  projectStoryCount: (projectId: string) => Record<Stage, number>
}

function generateId(): string {
  return crypto.randomUUID()
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      // Auth
      githubToken: null,
      githubUser: null,
      anthropicApiKey: null,
      anthropicKeyValid: false,

      // Data
      projects: [],
      activeProjectId: null,
      stories: [],
      repos: [],
      automationLogs: new Map(),

      // --- Auth actions ---
      setGithubAuth: (token, user) =>
        set({ githubToken: token, githubUser: user }),

      clearGithubAuth: () =>
        set({ githubToken: null, githubUser: null, repos: [] }),

      setAnthropicKey: (key) =>
        set({ anthropicApiKey: key, anthropicKeyValid: false }),

      setAnthropicKeyValid: (valid) => set({ anthropicKeyValid: valid }),

      // --- Project actions ---
      addProject: (name, repoIds = []) => {
        const id = generateId()
        const colorIndex = get().projects.length % PROJECT_COLORS.length
        const project: Project = {
          id,
          name,
          color: PROJECT_COLORS[colorIndex],
          repoIds,
          status: "open",
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: state.activeProjectId ?? id,
        }))
        return id
      },

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      closeProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: "closed" as const, lastSyncAt: new Date().toISOString() }
              : p
          ),
          activeProjectId:
            state.activeProjectId === id
              ? state.projects.find((p) => p.id !== id && p.status !== "closed")?.id ?? null
              : state.activeProjectId,
        })),

      reopenProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "open" as const } : p
          ),
          activeProjectId: id,
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          stories: state.stories.filter((s) => s.projectId !== id),
          activeProjectId:
            state.activeProjectId === id
              ? state.projects.find((p) => p.id !== id)?.id ?? null
              : state.activeProjectId,
        })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      addRepoToProject: (projectId, repoId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && !p.repoIds.includes(repoId)
              ? { ...p, repoIds: [...p.repoIds, repoId] }
              : p
          ),
        })),

      removeRepoFromProject: (projectId, repoId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, repoIds: p.repoIds.filter((r) => r !== repoId) }
              : p
          ),
        })),

      // --- Repo actions ---
      setRepos: (repos) => set({ repos }),

      // --- Story actions ---
      addStories: (stories) =>
        set((state) => {
          const existingTitles = new Set(
            state.stories
              .filter((s) => stories[0] && s.projectId === stories[0].projectId)
              .map((s) => `${s.repoId}:${s.title}`)
          )
          const newStories = stories.filter(
            (s) => !existingTitles.has(`${s.repoId}:${s.title}`)
          )
          return { stories: [...state.stories, ...newStories] }
        }),

      moveStory: (storyId, newStage) =>
        set((state) => ({
          stories: state.stories.map((s) =>
            s.id === storyId
              ? {
                  ...s,
                  stage: newStage,
                  updatedAt: new Date().toISOString(),
                  doneAt: newStage === "done" ? new Date().toISOString() : s.doneAt,
                }
              : s
          ),
        })),

      updateStory: (storyId, updates) =>
        set((state) => ({
          stories: state.stories.map((s) =>
            s.id === storyId
              ? { ...s, ...updates, updatedAt: new Date().toISOString() }
              : s
          ),
        })),

      removeStoriesForRepo: (repoId) =>
        set((state) => ({
          stories: state.stories.filter((s) => s.repoId !== repoId),
        })),

      removeStoriesForProject: (projectId) =>
        set((state) => ({
          stories: state.stories.filter((s) => s.projectId !== projectId),
        })),

      archiveOldDone: () => {
        const now = Date.now()
        const threshold = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000
        let count = 0
        set((state) => ({
          stories: state.stories.map((s) => {
            if (s.stage !== "done") return s
            const doneTime = s.doneAt ? new Date(s.doneAt).getTime() : new Date(s.updatedAt).getTime()
            if (now - doneTime >= threshold) {
              count++
              return { ...s, stage: "archived" as const, updatedAt: new Date().toISOString() }
            }
            return s
          }),
        }))
        return count
      },

      // --- Automation ---
      addAutomationLog: (log) =>
        set((state) => {
          const newLogs = new Map(state.automationLogs)
          newLogs.set(log.id, log)
          return { automationLogs: newLogs }
        }),

      updateAutomationLog: (logId, updates) =>
        set((state) => {
          const newLogs = new Map(state.automationLogs)
          const existing = newLogs.get(logId)
          if (existing) {
            newLogs.set(logId, { ...existing, ...updates })
          }
          return { automationLogs: newLogs }
        }),

      // --- Computed ---
      activeProject: () => {
        const state = get()
        return (
          state.projects.find((p) => p.id === state.activeProjectId) ?? null
        )
      },

      storiesForActiveProject: () => {
        const state = get()
        if (!state.activeProjectId) return []
        return state.stories.filter(
          (s) => s.projectId === state.activeProjectId && s.stage !== "archived"
        )
      },

      archivedStoriesForActiveProject: () => {
        const state = get()
        if (!state.activeProjectId) return []
        return state.stories.filter(
          (s) => s.projectId === state.activeProjectId && s.stage === "archived"
        )
      },

      openProjects: () => {
        return get().projects.filter((p) => p.status !== "closed")
      },

      projectStoryCount: (projectId) => {
        const stories = get().stories.filter((s) => s.projectId === projectId)
        const counts: Record<Stage, number> = {
          backlog: 0,
          todo: 0,
          in_progress: 0,
          in_review: 0,
          done: 0,
          archived: 0,
        }
        for (const s of stories) {
          counts[s.stage]++
        }
        return counts
      },
    }),
    {
      name: "vibe-kanban-v2",
      partialize: (state) => ({
        githubToken: state.githubToken,
        githubUser: state.githubUser,
        anthropicApiKey: state.anthropicApiKey,
        anthropicKeyValid: state.anthropicKeyValid,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        stories: state.stories,
        repos: state.repos,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KanbanState>
        // Migrate old projects without status field
        const projects = Array.isArray(p.projects)
          ? p.projects.map((proj: Project) => ({
              ...proj,
              status: proj.status ?? "open",
            }))
          : []
        return {
          ...current,
          ...p,
          projects,
          automationLogs: new Map(),
        } as KanbanState
      },
    }
  )
)
