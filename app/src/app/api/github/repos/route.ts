import { NextRequest, NextResponse } from "next/server"
import { fetchUserRepos } from "@/lib/github"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }

  const token = authHeader.slice(7)

  try {
    const repos = await fetchUserRepos(token)
    // Log count server-side for debugging
    console.log(`[api/github/repos] Returning ${repos.length} repos`)
    return NextResponse.json(repos)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch repos"
    console.error(`[api/github/repos] Error:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
