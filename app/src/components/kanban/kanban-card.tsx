"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Story } from "@/types"
import { GripVertical, GitBranch, Zap } from "lucide-react"

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-red-100 text-red-800",
} as const

export function KanbanCard({ story }: { story: Story }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id, data: { story } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing mb-2 hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CardTitle className="text-sm font-medium leading-tight">
            {story.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {story.description && story.description !== story.title && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {story.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <GitBranch className="h-3 w-3 mr-0.5" />
            {story.repoFullName.split("/")[1]}
          </Badge>
          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[story.priority]}`}>
            {story.priority}
          </Badge>
          {story.automationLogId && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Zap className="h-3 w-3 mr-0.5" />
              auto
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
