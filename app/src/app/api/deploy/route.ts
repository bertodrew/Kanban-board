import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { triggerDeploy, DeployTargetSchema } from "@/lib/deploy"

const RequestSchema = z.object({
  target: DeployTargetSchema,
  repoFullName: z.string().min(1),
})

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

  const result = await triggerDeploy(parsed.data.target, parsed.data.repoFullName)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result)
}
