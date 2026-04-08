import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createGitHubClient } from "@/lib/github"

const SaveSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  stories: z.array(z.record(z.string(), z.unknown())),
})

// GET — Load .vibe-kanban.json from a repo
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 })
  }

  const octokit = createGitHubClient(token)

  try {
    // Load .vibe-kanban.json
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: ".vibe-kanban.json",
    })

    if (!("content" in data) || !data.content) {
      return NextResponse.json({ exists: false })
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8")
    const state = JSON.parse(content)

    // Get latest commit SHA to detect new commits
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    })
    const latestSha = commits[0]?.sha ?? null

    return NextResponse.json({
      exists: true,
      state,
      latestCommitSha: latestSha,
      hasNewCommits: state.lastCommitSha ? state.lastCommitSha !== latestSha : false,
      sha: (data as { sha: string }).sha, // file SHA for updates
    })
  } catch (err) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
      return NextResponse.json({ exists: false })
    }
    const message = err instanceof Error ? err.message : "Failed to load state"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — Save .vibe-kanban.json to a repo
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { owner, repo, projectId, projectName, stories } = parsed.data
  const octokit = createGitHubClient(token)

  try {
    // Get latest commit SHA
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    })
    const latestSha = commits[0]?.sha ?? undefined

    const stateContent = JSON.stringify(
      {
        projectId,
        projectName,
        stories,
        lastSyncAt: new Date().toISOString(),
        lastCommitSha: latestSha,
      },
      null,
      2
    )

    const contentBase64 = Buffer.from(stateContent).toString("base64")

    // Check if file already exists (need SHA for update)
    let existingSha: string | undefined
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: ".vibe-kanban.json",
      })
      if ("sha" in data) {
        existingSha = data.sha
      }
    } catch {
      // File doesn't exist yet — create it
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: ".vibe-kanban.json",
      message: `chore: update vibe-kanban project state`,
      content: contentBase64,
      sha: existingSha,
    })

    return NextResponse.json({ saved: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save state"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
