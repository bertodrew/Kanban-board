import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { spawn, type ChildProcess } from "child_process"

const CommandSchema = z.object({
  prompt: z.string().min(1),
  projects: z.array(
    z.object({
      projectId: z.string(),
      projectName: z.string(),
      repoFullName: z.string(),
      repoOwner: z.string(),
      repoName: z.string(),
      stories: z.array(z.record(z.string(), z.unknown())).optional(),
    })
  ),
})

// Track running processes per project
const runningProcesses = new Map<string, ChildProcess>()

// POST — Execute a Claude CLI command across all projects
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CommandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { prompt, projects } = parsed.data

  // Build a multi-project context prompt
  const contextParts = projects.map((p) => {
    const storySummary = p.stories?.length
      ? `\nStories:\n${(p.stories as Array<{ title?: string; stage?: string }>).map((s) => `  - [${s.stage}] ${s.title}`).join("\n")}`
      : "\nNo stories yet."
    return `## Project: ${p.projectName} (${p.repoFullName})${storySummary}`
  })

  const fullPrompt = `You are managing multiple projects simultaneously. Here is the context:\n\n${contextParts.join("\n\n")}\n\nUser request: ${prompt}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      try {
        const proc = spawn("claude", ["-p", fullPrompt], {
          env: { ...process.env },
          stdio: ["pipe", "pipe", "pipe"],
        })

        const sessionId = crypto.randomUUID()
        runningProcesses.set(sessionId, proc)

        // Send session ID
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId })}\n\n`)
        )

        proc.stdout?.on("data", (chunk: Buffer) => {
          const text = chunk.toString()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "output", text })}\n\n`)
          )
        })

        proc.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", text })}\n\n`)
          )
        })

        proc.on("close", (code) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", exitCode: code })}\n\n`
            )
          )
          runningProcesses.delete(sessionId)
          controller.close()
        })

        proc.on("error", (err) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`
            )
          )
          runningProcesses.delete(sessionId)
          controller.close()
        })
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", text: err instanceof Error ? err.message : "Failed to spawn process" })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// DELETE — Kill a running terminal session
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  const proc = runningProcesses.get(sessionId)
  if (proc) {
    proc.kill("SIGTERM")
    runningProcesses.delete(sessionId)
    return NextResponse.json({ killed: true })
  }

  return NextResponse.json({ error: "Session not found" }, { status: 404 })
}
