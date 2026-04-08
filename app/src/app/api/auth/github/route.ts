import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID not configured" },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo read:user",
    state,
  })

  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  )
  response.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  return response
}
