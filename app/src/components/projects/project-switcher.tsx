"use client"

import { useState, useRef, useEffect } from "react"
import { useKanbanStore } from "@/stores/kanban-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  Plus,
  FolderOpen,
  FolderClosed,
  Trash2,
  Loader2,
  Circle,
  LogOut,
  RotateCcw,
  Save,
} from "lucide-react"
import { toast } from "sonner"

export function ProjectSwitcher() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    addProject,
    closeProject,
    reopenProject,
    deleteProject,
    stories,
    repos,
    githubToken,
  } = useKanbanStore()

  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const openProjectsList = projects.filter((p) => p.status !== "closed")
  const closedProjectsList = projects.filter((p) => p.status === "closed")

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setShowInput(false)
        setNewName("")
        setConfirmDelete(null)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Auto-focus input
  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const id = addProject(name)
    setActiveProject(id)
    setNewName("")
    setShowInput(false)
    setOpen(false)
    toast.success(`Project "${name}" created`)
  }

  async function handleClose(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setSaving(id)

    // Save state to GitHub repos before closing
    const project = projects.find((p) => p.id === id)
    if (project && githubToken) {
      const projectStories = stories.filter((s) => s.projectId === id)
      for (const repoId of project.repoIds) {
        const repo = repos.find((r) => r.id === repoId)
        if (!repo) continue
        try {
          await fetch("/api/github/project-state", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${githubToken}`,
            },
            body: JSON.stringify({
              owner: repo.owner,
              repo: repo.name,
              projectId: id,
              projectName: name,
              stories: projectStories.filter((s) => s.repoId === repoId),
            }),
          })
        } catch {
          // Continue even if save fails for one repo
        }
      }
    }

    closeProject(id)
    setSaving(null)
    toast.info(`Project "${name}" closed — state saved`)
  }

  async function handleReopen(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setSaving(id)

    // Load state from GitHub and check for new commits
    const project = projects.find((p) => p.id === id)
    if (project && githubToken) {
      for (const repoId of project.repoIds) {
        const repo = repos.find((r) => r.id === repoId)
        if (!repo) continue
        try {
          const res = await fetch(
            `/api/github/project-state?owner=${repo.owner}&repo=${repo.name}`,
            { headers: { Authorization: `Bearer ${githubToken}` } }
          )
          const data = await res.json()
          if (data.exists && data.hasNewCommits) {
            toast.info(`${repo.name}: new commits detected — syncing stories`)
            // Re-sync stories from MD files
            await fetch("/api/github/stories", {
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
                projectId: id,
              }),
            })
          }
        } catch {
          // Continue even if check fails
        }
      }
    }

    reopenProject(id)
    setSaving(null)
    toast.success(`Project "${name}" reopened`)
  }

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (confirmDelete === id) {
      deleteProject(id)
      setConfirmDelete(null)
      toast.info(`Project "${name}" permanently deleted`)
    } else {
      setConfirmDelete(id)
    }
  }

  function getProjectCounts(projectId: string) {
    const ps = stories.filter((s) => s.projectId === projectId)
    return {
      inProgress: ps.filter((s) => s.stage === "in_progress").length,
      total: ps.length,
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        className="h-9 gap-2 min-w-[180px] justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {activeProject ? (
            <>
              <Circle
                className="h-3 w-3 shrink-0"
                fill={activeProject.color}
                stroke={activeProject.color}
              />
              <span className="truncate max-w-[140px]">
                {activeProject.name}
              </span>
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4" />
              <span>Select Project</span>
            </>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[340px] z-50 rounded-lg border bg-popover p-1 shadow-lg">
          {projects.length === 0 && !showInput && (
            <p className="text-xs text-muted-foreground text-center py-3 px-2">
              No projects yet — import a repo to auto-create one
            </p>
          )}

          {/* Open projects */}
          {openProjectsList.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-medium">
                Open
              </p>
              {openProjectsList.map((project) => {
                const counts = getProjectCounts(project.id)
                const isActive = project.id === activeProjectId
                const isSaving = saving === project.id
                return (
                  <div
                    key={project.id}
                    className={`w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                      isActive ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      setActiveProject(project.id)
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Circle
                        className="h-3 w-3 shrink-0"
                        fill={project.color}
                        stroke={project.color}
                      />
                      <span className="truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {counts.inProgress > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1 bg-amber-100 text-amber-800"
                        >
                          <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                          {counts.inProgress}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {counts.total}
                      </Badge>
                      <button
                        onClick={(e) => handleClose(e, project.id, project.name)}
                        className="text-muted-foreground hover:text-foreground ml-1"
                        title="Close project (saves state)"
                      >
                        {isSaving ? (
                          <Save className="h-3 w-3 animate-pulse" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Closed projects */}
          {closedProjectsList.length > 0 && (
            <div className="border-t mt-1 pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-medium">
                Closed
              </p>
              {closedProjectsList.map((project) => {
                const counts = getProjectCounts(project.id)
                const isSaving = saving === project.id
                return (
                  <div
                    key={project.id}
                    className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer opacity-60"
                    onClick={(e) => handleReopen(e, project.id, project.name)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderClosed className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {counts.total}
                      </Badge>
                      <button
                        onClick={(e) => handleReopen(e, project.id, project.name)}
                        className="text-muted-foreground hover:text-green-600 ml-1"
                        title="Reopen project"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id, project.name)}
                        className={`ml-0.5 ${
                          confirmDelete === project.id
                            ? "text-destructive"
                            : "text-muted-foreground hover:text-destructive"
                        }`}
                        title={
                          confirmDelete === project.id
                            ? "Click again to permanently delete"
                            : "Delete project"
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* New project */}
          <div className="border-t mt-1 pt-1">
            {showInput ? (
              <div className="flex gap-1.5 p-1">
                <input
                  ref={inputRef}
                  placeholder="Project name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate()
                    if (e.key === "Escape") {
                      setShowInput(false)
                      setNewName("")
                    }
                  }}
                  className="flex-1 rounded border px-2 py-1 text-xs bg-background"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreate}
                >
                  Add
                </Button>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-muted-foreground"
                onClick={() => setShowInput(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
