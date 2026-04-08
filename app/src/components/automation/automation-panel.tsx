"use client"

import { useKanbanStore } from "@/stores/kanban-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Zap, CheckCircle, XCircle, Loader2, Clock } from "lucide-react"

const STATUS_CONFIG = {
  running: {
    icon: Loader2,
    label: "Running",
    color: "bg-amber-100 text-amber-800",
    iconClass: "animate-spin",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    color: "bg-green-100 text-green-800",
    iconClass: "",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "bg-red-100 text-red-800",
    iconClass: "",
  },
  cancelled: {
    icon: Clock,
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    iconClass: "",
  },
} as const

export function AutomationPanel() {
  const { automationLogs, stories } = useKanbanStore()
  const logs = Array.from(automationLogs.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Automation Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No automation runs yet. Move a story to &quot;In Progress&quot; to
            trigger Claude Code.
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            {logs.map((log) => {
              const config = STATUS_CONFIG[log.status]
              const Icon = config.icon
              const story = stories.find((s) => s.id === log.storyId)
              return (
                <div key={log.id} className="p-2 border-b last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {story?.title ?? log.storyId}
                    </span>
                    <Badge className={`text-[10px] ${config.color}`}>
                      <Icon className={`h-3 w-3 mr-0.5 ${config.iconClass}`} />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(log.startedAt).toLocaleTimeString()}
                    {log.completedAt &&
                      ` — Finished ${new Date(log.completedAt).toLocaleTimeString()}`}
                  </p>
                  {log.output.length > 0 && (
                    <pre className="mt-1 text-[10px] bg-muted p-2 rounded max-h-[100px] overflow-auto">
                      {log.output.slice(-10).join("\n")}
                    </pre>
                  )}
                  {log.error && (
                    <p className="text-xs text-destructive mt-1">{log.error}</p>
                  )}
                </div>
              )
            })}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
