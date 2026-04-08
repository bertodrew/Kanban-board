"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useKanbanStore } from "@/stores/kanban-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Send,
  Square,
  Trash2,
  Circle,
  Loader2,
  FolderOpen,
  Sparkles,
} from "lucide-react"

interface TerminalLine {
  id: string
  type: "input" | "output" | "error" | "system" | "project-header"
  text: string
  projectName?: string
  projectColor?: string
  timestamp: Date
}

export function MultiProjectTerminal() {
  const { projects, stories, repos } = useKanbanStore()
  const openProjects = projects.filter((p) => p.status !== "closed")

  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const addLine = useCallback(
    (type: TerminalLine["type"], text: string, projectName?: string, projectColor?: string) => {
      setLines((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type,
          text,
          projectName,
          projectColor,
          timestamp: new Date(),
        },
      ])
    },
    []
  )

  async function handleSubmit() {
    const prompt = input.trim()
    if (!prompt || running) return

    setInput("")
    addLine("input", prompt)

    if (openProjects.length === 0) {
      addLine("error", "No open projects. Import a repo or reopen a closed project first.")
      return
    }

    // Show which projects are being targeted
    addLine("system", `Running across ${openProjects.length} project(s):`)
    for (const p of openProjects) {
      const storyCount = stories.filter((s) => s.projectId === p.id).length
      addLine("project-header", `${p.name} (${storyCount} stories)`, p.name, p.color)
    }

    setRunning(true)

    // Build projects payload
    const projectPayloads = openProjects.map((p) => {
      const projectStories = stories.filter((s) => s.projectId === p.id)
      const projectRepos = repos.filter((r) => p.repoIds.includes(r.id))
      const primaryRepo = projectRepos[0]
      return {
        projectId: p.id,
        projectName: p.name,
        repoFullName: primaryRepo?.fullName ?? "unknown",
        repoOwner: primaryRepo?.owner ?? "unknown",
        repoName: primaryRepo?.name ?? "unknown",
        stories: projectStories.map((s) => ({
          title: s.title,
          stage: s.stage,
          description: s.description,
          priority: s.priority,
          acceptanceCriteria: s.acceptanceCriteria,
        })),
      }
    })

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projects: projectPayloads,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        addLine("error", data.error ?? "Failed to start terminal session")
        setRunning(false)
        return
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        addLine("error", "No response stream")
        setRunning(false)
        return
      }

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const eventLines = buffer.split("\n\n")
        buffer = eventLines.pop() ?? ""

        for (const eventLine of eventLines) {
          if (!eventLine.startsWith("data: ")) continue
          try {
            const data = JSON.parse(eventLine.slice(6))
            if (data.type === "session") {
              setSessionId(data.sessionId)
            } else if (data.type === "output") {
              addLine("output", data.text)
            } else if (data.type === "error") {
              addLine("error", data.text)
            } else if (data.type === "done") {
              addLine(
                "system",
                `Process exited with code ${data.exitCode}`
              )
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      addLine(
        "error",
        err instanceof Error ? err.message : "Connection failed"
      )
    } finally {
      setRunning(false)
      setSessionId(null)
    }
  }

  async function handleStop() {
    if (!sessionId) return
    try {
      await fetch(`/api/terminal?sessionId=${sessionId}`, { method: "DELETE" })
      addLine("system", "Process terminated")
    } catch {
      addLine("error", "Failed to stop process")
    }
    setRunning(false)
    setSessionId(null)
  }

  function handleClear() {
    setLines([])
  }

  // Quick action buttons
  function insertPrompt(prompt: string) {
    setInput(prompt)
    inputRef.current?.focus()
  }

  if (openProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No open projects</p>
        <p className="text-sm">Import a repo to create a project, then use the terminal</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with project indicators */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Multi-Project Terminal</span>
          <Badge variant="outline" className="text-[10px]">
            {openProjects.length} projects
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {openProjects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted"
              title={p.name}
            >
              <Circle
                className="h-2 w-2"
                fill={p.color}
                stroke={p.color}
              />
              <span className="truncate max-w-[60px]">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b shrink-0 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground shrink-0">Quick:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => insertPrompt("Create user stories from the README and any markdown files in each project repo. Output them in a structured format.")}
        >
          <Sparkles className="h-2.5 w-2.5 mr-1" />
          Generate Stories
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => insertPrompt("Analyze the current state of all projects. What stories are in progress? What's blocked? Suggest next actions.")}
        >
          Status Report
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => insertPrompt("For each project, create a .vibe-kanban.json file with the current project state and stories if it doesn't exist.")}
        >
          Init Project Files
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => insertPrompt("Review all in-progress stories across projects. Check code quality, suggest improvements, and flag any blockers.")}
        >
          Review All
        </Button>
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-gray-950 text-gray-100 font-mono text-xs p-3 space-y-0.5"
      >
        {lines.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Multi-project Claude CLI terminal</p>
            <p className="text-[10px] mt-1">
              Commands run across all {openProjects.length} open projects simultaneously
            </p>
          </div>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex">
            {line.type === "input" && (
              <div className="flex gap-2">
                <span className="text-green-400">$</span>
                <span className="text-white">{line.text}</span>
              </div>
            )}
            {line.type === "output" && (
              <pre className="text-gray-200 whitespace-pre-wrap break-words">
                {line.text}
              </pre>
            )}
            {line.type === "error" && (
              <pre className="text-red-400 whitespace-pre-wrap break-words">
                {line.text}
              </pre>
            )}
            {line.type === "system" && (
              <span className="text-blue-400 italic">{line.text}</span>
            )}
            {line.type === "project-header" && (
              <div className="flex items-center gap-1.5 pl-2">
                <Circle
                  className="h-2 w-2"
                  fill={line.projectColor}
                  stroke={line.projectColor}
                />
                <span style={{ color: line.projectColor }}>
                  {line.text}
                </span>
              </div>
            )}
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t bg-gray-950 shrink-0">
        <span className="text-green-400 font-mono text-sm">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          placeholder={
            running
              ? "Waiting for response..."
              : "Ask Claude about all your projects..."
          }
          disabled={running}
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-gray-600 disabled:opacity-50"
        />
        <div className="flex items-center gap-1">
          {running ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={handleStop}
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              <Send className="h-3 w-3 mr-1" />
              Run
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
            onClick={handleClear}
            title="Clear terminal"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
