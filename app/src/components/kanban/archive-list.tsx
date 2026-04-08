"use client"

import { useKanbanStore } from "@/stores/kanban-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Archive, CheckCircle } from "lucide-react"

export function ArchiveList() {
  const { archivedStoriesForActiveProject, activeProject } = useKanbanStore()
  const archived = archivedStoriesForActiveProject()
  const project = activeProject()

  if (!project) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Archived Stories
          {archived.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {archived.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Stories in Done for 15+ days are automatically archived here.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1.5">
              {archived.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center justify-between p-2 rounded border bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {story.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {story.repoFullName} &middot; Done{" "}
                        {story.doneAt
                          ? new Date(story.doneAt).toLocaleDateString()
                          : new Date(story.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0"
                  >
                    {story.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
