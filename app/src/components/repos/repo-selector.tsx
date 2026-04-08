"use client"

import { useState } from "react"
import { useKanbanStore } from "@/stores/kanban-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  GitBranch,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Minus,
  FolderSync,
} from "lucide-react"
import { toast } from "sonner"
import type { Repo } from "@/types"

export function RepoSelector() {
  const {
    repos,
    setRepos,
    githubToken,
    projects,
    activeProjectId,
    addProject,
    setActiveProject,
    addRepoToProject,
    removeRepoFromProject,
    addStories,
  } = useKanbanStore()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<number | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectRepoIds = new Set(activeProject?.repoIds ?? [])

  // Build a set of all repo IDs across all projects for the indicator
  const allTrackedRepoIds = new Set(projects.flatMap((p) => p.repoIds))

  const filteredRepos = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function fetchRepos() {
    if (!githubToken) {
      toast.error("Login with GitHub first")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/github/repos", {
        headers: { Authorization: `Bearer ${githubToken}` },
      })
      if (!res.ok) throw new Error("Failed to fetch repos")
      const data: Repo[] = await res.json()
      setRepos(data)
      toast.success(`Found ${data.length} repositories`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch repos"
      )
    } finally {
      setLoading(false)
    }
  }

  async function debugRepos() {
    if (!githubToken) return
    setLoading(true)
    try {
      const res = await fetch("/api/github/debug-repos", {
        headers: { Authorization: `Bearer ${githubToken}` },
      })
      const data = await res.json()
      console.log("GitHub Debug:", data)
      const msg = [
        `Token scopes: ${data.tokenScopes ?? "none"}`,
        `GitHub says: ${data.publicRepos ?? "?"} public, ${data.totalPrivateRepos ?? "?"} private`,
        `API returns: owner=${data.ownerCount ?? "?"}, member=${data.memberCount ?? "?"}, public=${data.publicCount ?? "?"}, private=${data.privateCount ?? "?"}`,
        `Orgs: ${data.orgs?.join(", ") ?? "none"}`,
      ].join("\n")
      toast.info(msg, { duration: 15000 })
    } catch {
      toast.error("Debug failed")
    } finally {
      setLoading(false)
    }
  }

  async function importRepo(repo: Repo) {
    if (!githubToken) return

    // Auto-create project with repo name if none exists or repo not in active project
    let projectId = activeProjectId

    if (!projectId) {
      // Create a new project named after the repo
      projectId = addProject(repo.name)
      setActiveProject(projectId)
      toast.success(`Project "${repo.name}" created`)
    }

    // Add repo to the project
    addRepoToProject(projectId, repo.id)

    // Auto-sync stories
    setSyncing(repo.id)
    try {
      const res = await fetch("/api/github/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          repoId: repo.id,
          repoFullName: repo.fullName,
          projectId,
        }),
      })
      if (!res.ok) throw new Error("Failed to sync stories")
      const data = await res.json()
      addStories(data.stories)
      toast.success(
        `Imported ${repo.name}: ${data.stories.length} stories found`
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync stories"
      )
    } finally {
      setSyncing(null)
    }
  }

  function removeRepo(repo: Repo) {
    if (!activeProjectId) return
    removeRepoFromProject(activeProjectId, repo.id)
    toast.info(`Removed ${repo.name} from project`)
  }

  async function resyncRepo(repo: Repo) {
    if (!githubToken || !activeProjectId) return
    setSyncing(repo.id)
    try {
      const res = await fetch("/api/github/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          repoId: repo.id,
          repoFullName: repo.fullName,
          projectId: activeProjectId,
        }),
      })
      if (!res.ok) throw new Error("Failed to sync")
      const data = await res.json()
      addStories(data.stories)
      toast.success(`Synced ${data.stories.length} stories from ${repo.name}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync"
      )
    } finally {
      setSyncing(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Repositories</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={debugRepos}
              disabled={loading || !githubToken}
              title="Debug: check token scopes and repo counts"
              className="h-8 text-xs text-muted-foreground"
            >
              ?
            </Button>
            <Button
              size="sm"
              onClick={fetchRepos}
              disabled={loading || !githubToken}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {repos.length > 0 ? "Refresh" : "Load"}
              </span>
            </Button>
          </div>
        </div>
        {activeProject && (
          <p className="text-xs text-muted-foreground mt-1">
            Active project:{" "}
            <span className="font-medium text-foreground">
              {activeProject.name}
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!githubToken && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Connect GitHub first to see your repos
          </p>
        )}
        {githubToken && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[350px]">
              {filteredRepos.length === 0 && repos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click Load to fetch your GitHub repositories
                </p>
              )}
              {filteredRepos.map((repo) => {
                const isInActiveProject = projectRepoIds.has(repo.id)
                const isInAnyProject = allTrackedRepoIds.has(repo.id)
                const isSyncing = syncing === repo.id

                return (
                  <div
                    key={repo.id}
                    className={`flex items-center justify-between p-2 rounded hover:bg-muted/50 ${
                      isInActiveProject ? "bg-accent/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch
                        className={`h-4 w-4 shrink-0 ${
                          isInAnyProject
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {repo.name}
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            {repo.owner}/
                          </span>
                        </p>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {repo.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isInActiveProject ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => resyncRepo(repo)}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FolderSync className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 w-7 p-0"
                            onClick={() => removeRepo(repo)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => importRepo(repo)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </ScrollArea>
            {projectRepoIds.size > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs mr-1">
                    {projectRepoIds.size}
                  </Badge>
                  repos in this project
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
