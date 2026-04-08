import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { spawnClaudeCode } from "@/lib/claude-code"

const RequestSchema = z.object({
  storyId: z.string().min(1),
  storyTitle: z.string().optional(),
  storyDescription: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  repoPath: z.string().optional(),
})

// In-memory store for active automations (MVP — will move to Supabase)
const activeAutomations = new Map<
  string,
  { kill: () => void; output: string[]; status: string }
>()

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { storyId, storyTitle, storyDescription, acceptanceCriteria, repoPath } =
    parsed.data

  // Check if already running
  const existing = activeAutomations.get(storyId)
  if (existing && existing.status === "running") {
    return NextResponse.json(
      { error: "Automation already running for this story" },
      { status: 409 }
    )
  }

  const output: string[] = []

  try {
    const { log, kill } = spawnClaudeCode({
      repoPath: repoPath ?? process.cwd(),
      storyTitle: storyTitle ?? `Story ${storyId}`,
      storyDescription: storyDescription ?? "",
      acceptanceCriteria: acceptanceCriteria ?? [],
      onOutput: (line) => output.push(line),
      onComplete: (success, error) => {
        const entry = activeAutomations.get(storyId)
        if (entry) {
          entry.status = success ? "completed" : "failed"
        }
        if (error) output.push(`[error] ${error}`)
      },
    })

    activeAutomations.set(storyId, { kill, output, status: "running" })

    return NextResponse.json({
      logId: log.id,
      storyId,
      status: "running",
      message: "Claude Code automation started",
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start automation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const storyId = request.nextUrl.searchParams.get("storyId")
  if (!storyId) {
    return NextResponse.json(
      { error: "Missing storyId parameter" },
      { status: 400 }
    )
  }

  const automation = activeAutomations.get(storyId)
  if (!automation) {
    return NextResponse.json(
      { error: "No automation found for this story" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    storyId,
    status: automation.status,
    output: automation.output,
  })
}

export async function DELETE(request: NextRequest) {
  const storyId = request.nextUrl.searchParams.get("storyId")
  if (!storyId) {
    return NextResponse.json(
      { error: "Missing storyId parameter" },
      { status: 400 }
    )
  }

  const automation = activeAutomations.get(storyId)
  if (!automation) {
    return NextResponse.json(
      { error: "No automation found for this story" },
      { status: 404 }
    )
  }

  automation.kill()
  automation.status = "cancelled"
  return NextResponse.json({ storyId, status: "cancelled" })
}
