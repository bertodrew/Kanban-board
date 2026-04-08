import { spawn } from "child_process"
import type { AutomationLog } from "@/types"

function generateId(): string {
  return crypto.randomUUID()
}

interface ClaudeCodeOptions {
  repoPath: string
  storyTitle: string
  storyDescription: string
  acceptanceCriteria: string[]
  onOutput: (line: string) => void
  onComplete: (success: boolean, error?: string) => void
}

export function spawnClaudeCode(options: ClaudeCodeOptions): {
  log: AutomationLog
  kill: () => void
} {
  const logId = generateId()
  const log: AutomationLog = {
    id: logId,
    storyId: "",
    projectId: "",
    status: "running",
    output: [],
    startedAt: new Date().toISOString(),
  }

  const prompt = buildPrompt(options)

  const proc = spawn("claude", ["-p", prompt], {
    cwd: options.repoPath,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  })

  proc.stdout.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean)
    for (const line of lines) {
      log.output.push(line)
      options.onOutput(line)
    }
  })

  proc.stderr.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean)
    for (const line of lines) {
      log.output.push(`[stderr] ${line}`)
      options.onOutput(`[stderr] ${line}`)
    }
  })

  proc.on("close", (code) => {
    log.completedAt = new Date().toISOString()
    if (code === 0) {
      log.status = "completed"
      options.onComplete(true)
    } else {
      log.status = "failed"
      log.error = `Process exited with code ${code}`
      options.onComplete(false, log.error)
    }
  })

  proc.on("error", (err) => {
    log.completedAt = new Date().toISOString()
    log.status = "failed"
    log.error = err.message
    options.onComplete(false, err.message)
  })

  return {
    log,
    kill: () => {
      proc.kill("SIGTERM")
      log.status = "cancelled"
      log.completedAt = new Date().toISOString()
    },
  }
}

function buildPrompt(options: ClaudeCodeOptions): string {
  const parts = [
    `# Task: ${options.storyTitle}`,
    "",
    `## Description`,
    options.storyDescription,
    "",
  ]

  if (options.acceptanceCriteria.length > 0) {
    parts.push("## Acceptance Criteria")
    for (const ac of options.acceptanceCriteria) {
      parts.push(`- ${ac}`)
    }
    parts.push("")
  }

  parts.push(
    "## Instructions",
    "- Read the existing codebase first to understand patterns and conventions.",
    "- Implement the feature described above.",
    "- Write clean, production-ready code.",
    "- Add tests if the project has a testing framework.",
    "- Do not break existing functionality."
  )

  return parts.join("\n")
}
