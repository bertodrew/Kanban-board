import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const RequestSchema = z.object({
  apiKey: z.string().min(1),
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
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
  }

  // Validate the key by making a lightweight API call
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": parsed.data.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    })

    if (res.status === 401) {
      return NextResponse.json(
        { valid: false, error: "Invalid API key" },
        { status: 401 }
      )
    }

    // Any non-401 response means the key is valid (even 400 means authenticated)
    return NextResponse.json({ valid: true })
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: err instanceof Error ? err.message : "Validation failed",
      },
      { status: 500 }
    )
  }
}
