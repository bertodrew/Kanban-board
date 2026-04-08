"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { KanbanCard } from "./kanban-card"
import type { Story, Stage } from "@/types"
import { STAGE_LABELS, STAGE_COLORS } from "@/types"

interface KanbanColumnProps {
  stage: Stage
  stories: Story[]
}

export function KanbanColumn({ stage, stories }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      className={`flex flex-col min-w-[280px] w-[280px] rounded-lg border ${
        STAGE_COLORS[stage]
      } ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
          <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
            {stories.length}
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div ref={setNodeRef} className="min-h-[100px]">
          <SortableContext
            items={stories.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {stories.map((story) => (
              <KanbanCard key={story.id} story={story} />
            ))}
            {stories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Drop stories here
              </p>
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  )
}
