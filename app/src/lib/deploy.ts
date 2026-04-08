import { z } from "zod"

export const DeployTargetSchema = z.enum(["vercel", "render", "netlify"])
export type DeployTarget = z.infer<typeof DeployTargetSchema>

interface DeployResult {
  success: boolean
  url?: string
  error?: string
  deployId?: string
}

export async function triggerDeploy(
  target: DeployTarget,
  repoFullName: string
): Promise<DeployResult> {
  switch (target) {
    case "vercel":
      return triggerVercelDeploy(repoFullName)
    case "render":
      return triggerRenderDeploy(repoFullName)
    case "netlify":
      return triggerNetlifyDeploy(repoFullName)
  }
}

async function triggerVercelDeploy(repoFullName: string): Promise<DeployResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK
  if (!hookUrl) return { success: false, error: "VERCEL_DEPLOY_HOOK not configured" }

  try {
    const res = await fetch(hookUrl, { method: "POST" })
    if (!res.ok) return { success: false, error: `Vercel returned ${res.status}` }
    const data = await res.json()
    return {
      success: true,
      url: data.url,
      deployId: data.job?.id,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Vercel deploy failed",
    }
  }
}

async function triggerRenderDeploy(repoFullName: string): Promise<DeployResult> {
  const hookUrl = process.env.RENDER_DEPLOY_HOOK
  if (!hookUrl) return { success: false, error: "RENDER_DEPLOY_HOOK not configured" }

  try {
    const res = await fetch(hookUrl, { method: "POST" })
    if (!res.ok) return { success: false, error: `Render returned ${res.status}` }
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Render deploy failed",
    }
  }
}

async function triggerNetlifyDeploy(repoFullName: string): Promise<DeployResult> {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK
  if (!hookUrl) return { success: false, error: "NETLIFY_BUILD_HOOK not configured" }

  try {
    const res = await fetch(hookUrl, { method: "POST" })
    if (!res.ok) return { success: false, error: `Netlify returned ${res.status}` }
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Netlify deploy failed",
    }
  }
}
