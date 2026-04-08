import { Octokit } from "octokit"
import type { Repo } from "@/types"

export function createGitHubClient(token: string) {
  return new Octokit({ auth: token })
}

export async function fetchUserRepos(token: string): Promise<Repo[]> {
  const octokit = createGitHubClient(token)
  const seenIds = new Set<number>()
  const collected: Repo[] = []

  function addRepo(repo: {
    id: number
    full_name: string
    name: string
    owner: { login: string }
    description: string | null
    html_url: string
    default_branch: string
  }) {
    if (seenIds.has(repo.id)) return
    seenIds.add(repo.id)
    collected.push({
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
    })
  }

  // 1. Owned repos
  const owned = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    { per_page: 100, type: "owner", sort: "updated" }
  )
  for (const r of owned) addRepo(r)
  console.log(`[github] owned: ${owned.length}`)

  // 2. Repos where user is collaborator
  try {
    const collab = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "member", sort: "updated" }
    )
    for (const r of collab) addRepo(r)
    console.log(`[github] collaborator: ${collab.length}`)
  } catch {
    console.log(`[github] collaborator fetch failed`)
  }

  // 3. Organization repos
  try {
    const orgs = await octokit.paginate(
      octokit.rest.orgs.listForAuthenticatedUser,
      { per_page: 100 }
    )
    console.log(`[github] orgs: ${orgs.length}`)
    for (const org of orgs) {
      try {
        const orgRepos = await octokit.paginate(
          octokit.rest.repos.listForOrg,
          { org: org.login, per_page: 100, type: "all" }
        )
        for (const r of orgRepos) addRepo(r as typeof owned[number])
        console.log(`[github] org ${org.login}: ${orgRepos.length}`)
      } catch {
        console.log(`[github] org ${org.login} fetch failed`)
      }
    }
  } catch {
    console.log(`[github] orgs fetch failed`)
  }

  // 4. Forks (sometimes not included in owner type)
  try {
    const forks = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, type: "public", sort: "updated" }
    )
    for (const r of forks) addRepo(r)
    console.log(`[github] public: ${forks.length}`)
  } catch {
    console.log(`[github] public fetch failed`)
  }

  console.log(`[github] total unique repos: ${collected.length}`)

  return collected.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export async function fetchRepoMdFiles(
  token: string,
  owner: string,
  repo: string
): Promise<Array<{ path: string; content: string }>> {
  const octokit = createGitHubClient(token)
  const mdFiles: Array<{ path: string; content: string }> = []

  try {
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "1",
    })

    const mdPaths = tree.tree
      .filter(
        (item) =>
          item.type === "blob" &&
          item.path &&
          (item.path.endsWith(".md") || item.path.endsWith(".MD")) &&
          !item.path.includes("node_modules") &&
          !item.path.includes("CHANGELOG")
      )
      .slice(0, 20)

    for (const file of mdPaths) {
      if (!file.path) continue
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
        })
        if ("content" in data && data.content) {
          const content = Buffer.from(data.content, "base64").toString("utf-8")
          mdFiles.push({ path: file.path, content })
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // Repo might be empty
  }

  return mdFiles
}
