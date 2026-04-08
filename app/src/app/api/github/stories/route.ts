import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fetchRepoMdFiles } from "@/lib/github"
import {
  parseStoriesFromMarkdown,
  createStoriesFromParsed,
} from "@/lib/story-parser"

const RequestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  repoId: z.number(),
  repoFullName: z.string().min(1),
  projectId: z.string().min(1),
})

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

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { owner, repo, repoId, repoFullName, projectId } = parsed.data

  try {
    const mdFiles = await fetchRepoMdFiles(token, owner, repo)
    const allStories = mdFiles.flatMap((file) => {
      const parsedStories = parseStoriesFromMarkdown(file.content)
      return createStoriesFromParsed(
        parsedStories,
        repoFullName,
        repoId,
        file.path,
        "backlog",
        projectId
      )
    })

    return NextResponse.json({ stories: allStories })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse stories"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
