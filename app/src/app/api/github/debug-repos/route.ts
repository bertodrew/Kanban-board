import { NextRequest, NextResponse } from "next/server"
import { createGitHubClient } from "@/lib/github"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const octokit = createGitHubClient(token)

  const results: Record<string, unknown> = {}

  // Check token scopes
  try {
    const { headers } = await octokit.rest.users.getAuthenticated()
    results.tokenScopes = headers["x-oauth-scopes"]
    const { data: user } = await octokit.rest.users.getAuthenticated()
    results.user = user.login
    results.publicRepos = user.public_repos
    results.totalPrivateRepos = user.total_private_repos
    results.ownedPrivateRepos = user.owned_private_repos
  } catch (err) {
    results.authError = err instanceof Error ? err.message : "unknown"
  }

  // type=all (default)
  try {
    const all = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, sort: "full_name" }
    )
    results.defaultCount = all.length
    results.defaultNames = all.map((r) => r.full_name)
  } catch (err) {
    results.defaultError = err instanceof Error ? err.message : "unknown"
  }

  // type=owner
  try {
    const owned = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "owner" }
    )
    results.ownerCount = owned.length
  } catch (err) {
    results.ownerError = err instanceof Error ? err.message : "unknown"
  }

  // type=member
  try {
    const member = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "member" }
    )
    results.memberCount = member.length
  } catch (err) {
    results.memberError = err instanceof Error ? err.message : "unknown"
  }

  // type=public
  try {
    const pub = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "public" }
    )
    results.publicCount = pub.length
  } catch (err) {
    results.publicError = err instanceof Error ? err.message : "unknown"
  }

  // type=private
  try {
    const priv = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "private" }
    )
    results.privateCount = priv.length
  } catch (err) {
    results.privateError = err instanceof Error ? err.message : "unknown"
  }

  // Orgs
  try {
    const orgs = await octokit.paginate(
      octokit.rest.orgs.listForAuthenticatedUser,
      { per_page: 100 }
    )
    results.orgs = orgs.map((o) => o.login)
    for (const org of orgs) {
      try {
        const orgRepos = await octokit.paginate(
          octokit.rest.repos.listForOrg,
          { org: org.login, per_page: 100, type: "all" }
        )
        results[`org_${org.login}_count`] = orgRepos.length
      } catch {
        results[`org_${org.login}_error`] = "access denied"
      }
    }
  } catch {
    results.orgsError = "failed"
  }

  // Manual pagination check: page 1 and page 2
  try {
    const page1 = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page: 1,
    })
    results.page1Count = page1.data.length
    results.page1Link = page1.headers.link ?? "no link header"

    if (page1.data.length === 100) {
      const page2 = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        page: 2,
      })
      results.page2Count = page2.data.length
    }
  } catch (err) {
    results.manualPageError = err instanceof Error ? err.message : "unknown"
  }

  return NextResponse.json(results, { status: 200 })
}
