"use client"

import { useCallback, useState, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { useKanbanStore } from "@/stores/kanban-store"
import type { Story, Stage } from "@/types"
import { StageSchema, BOARD_STAGES } from "@/types"
import { toast } from "sonner"
import { FolderOpen } from "lucide-react"

export function KanbanBoard() {
  const {
    storiesForActiveProject,
    moveStory,
    activeProject,
    activeProjectId,
    archiveOldDone,
  } = useKanbanStore()
  const stories = storiesForActiveProject()
  const project = activeProject()

  // Auto-archive stories in "done" for 15+ days on mount and every hour
  useEffect(() => {
    const count = archiveOldDone()
    if (count > 0) {
      toast.info(`${count} completed ${count === 1 ? "story" : "stories"} archived`)
    }
    const interval = setInterval(() => {
      const n = archiveOldDone()
      if (n > 0) toast.info(`${n} completed ${n === 1 ? "story" : "stories"} auto-archived`)
    }, 60 * 60 * 1000) // every hour
    return () => clearInterval(interval)
  }, [archiveOldDone])
  const [activeStory, setActiveStory] = useState<Story | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const storiesByStage = BOARD_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = stories.filter((s) => s.stage === stage)
      return acc
    },
    {} as Record<Stage, Story[]>
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const story = stories.find((s) => s.id === event.active.id)
      if (story) setActiveStory(story)
    },
    [stories]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveStory(null)
      const { active, over } = event
      if (!over) return

      const storyId = active.id as string
      let targetStage: Stage | null = null

      const parsed = StageSchema.safeParse(over.id)
      if (parsed.success) {
        targetStage = parsed.data
      }

      if (!targetStage) {
        const targetStory = stories.find((s) => s.id === over.id)
        if (targetStory) {
          targetStage = targetStory.stage
        }
      }

      if (!targetStage) return

      const story = stories.find((s) => s.id === storyId)
      if (!story || story.stage === targetStage) return

      if (targetStage === "todo") {
        // Auto-advance to In Progress and trigger Claude Code
        moveStory(storyId, "in_progress")
        toast.info(
          `"${story.title}" → In Progress. Claude Code starting...`,
          { duration: 3000 }
        )
        triggerAutomation(storyId, story, moveStory)
      } else {
        moveStory(storyId, targetStage)
      }
    },
    [stories, moveStory]
  )

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No project selected</p>
        <p className="text-sm">Create or select a project from the dropdown above</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {project && (
        <div className="px-4 mb-3 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="text-sm font-medium">{project.name}</span>
          <span className="text-xs text-muted-foreground">
            {stories.length} stories
          </span>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {BOARD_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            stories={storiesByStage[stage]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeStory ? <KanbanCard story={activeStory} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

async function triggerAutomation(
  storyId: string,
  story: Story,
  moveStory: (id: string, stage: Stage) => void
) {
  try {
    const res = await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyId,
        storyTitle: story.title,
        storyDescription: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(`Automation failed: ${data.error ?? "Unknown error"}`)
      moveStory(storyId, "backlog")
      return
    }

    // Poll for completion, auto-move to in_review when done
    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/automation?storyId=${storyId}`)
        if (!pollRes.ok) {
          clearInterval(pollInterval)
          return
        }
        const data = await pollRes.json()
        if (data.status === "completed") {
          clearInterval(pollInterval)
          moveStory(storyId, "in_review")
          toast.success(`"${story.title}" completed → moved to In Review`)
        } else if (data.status === "failed") {
          clearInterval(pollInterval)
          toast.error(`"${story.title}" automation failed. Check logs.`)
        }
      } catch {
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds
  } catch (err) {
    toast.error(
      `Automation error: ${err instanceof Error ? err.message : "Unknown"}`
    )
    moveStory(storyId, "backlog")
  }
}
